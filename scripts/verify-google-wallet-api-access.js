import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { loadConfig, looksConfigured, resolveProjectPath } from '../server/config.js';

function configured(value) {
  const text = String(value || '').trim();

  return looksConfigured(text) && text !== '...' && !text.startsWith('YOUR_') && !text.includes('CHANGE_THIS');
}

function base64Url(value) {
  return Buffer.from(value).toString('base64url');
}

function signJwt(payload, privateKey) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const signingInput = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(signingInput), privateKey).toString('base64url');

  return `${signingInput}.${signature}`;
}

function readIssuerIdFile() {
  for (const fileName of ['Google_Wallet_Issuer_ID', 'Google_Wallet_Issuer_ID.txt', 'Google_Wallet_Issuer_ID.rtf']) {
    const resolved = resolveProjectPath(fileName);

    if (!fs.existsSync(resolved)) {
      continue;
    }

    const text = fileName.endsWith('.rtf')
      ? execFileSync('textutil', ['-convert', 'txt', '-stdout', resolved], { encoding: 'utf8' })
      : fs.readFileSync(resolved, 'utf8');
    const matches = [...text.matchAll(/\b\d{6,}\b/g)].map((match) => match[0]);
    const unique = [...new Set(matches)];

    if (unique.length === 1) {
      return unique[0];
    }
  }

  return '';
}

function readServiceAccountJson(config) {
  const configuredPath = config.googleWallet?.serviceAccountJson;

  if (configured(configuredPath) && fs.existsSync(resolveProjectPath(configuredPath))) {
    return fs.readFileSync(resolveProjectPath(configuredPath), 'utf8');
  }

  if (configured(configuredPath) && String(configuredPath).trim().startsWith('{')) {
    return String(configuredPath);
  }

  const matches = fs.readdirSync(process.cwd())
    .filter((fileName) => /^google-service-account.*\.json$/i.test(fileName))
    .map((fileName) => path.join(process.cwd(), fileName));

  return matches.length ? fs.readFileSync(matches[0], 'utf8') : '';
}

function googleProjectIdentifier(serviceAccount) {
  return serviceAccount.project_id || serviceAccount.project_number || '';
}

async function main() {
  const config = loadConfig();
  const issuerId = String(configured(config.googleWallet?.issuerId)
    ? config.googleWallet.issuerId
    : readIssuerIdFile()).trim();
  const serviceAccountText = readServiceAccountJson(config);

  if (!configured(issuerId)) {
    throw new Error('GOOGLE_WALLET_ISSUER_ID fehlt lokal. Lege Google_Wallet_Issuer_ID(.txt/.rtf) ab oder setze config.googleWallet.issuerId.');
  }

  if (!configured(serviceAccountText)) {
    throw new Error('google-service-account.json fehlt lokal oder config.googleWallet.serviceAccountJson ist leer.');
  }

  const serviceAccount = JSON.parse(serviceAccountText);
  const now = Math.floor(Date.now() / 1000);
  const assertion = signJwt({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/wallet_object.issuer',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  }, serviceAccount.private_key);

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    })
  });
  const tokenPayload = await tokenResponse.json().catch(() => ({}));

  if (!tokenResponse.ok) {
    console.log(JSON.stringify({
      ok: false,
      step: 'oauth-token',
      status: tokenResponse.status,
      error: tokenPayload.error || 'GOOGLE_OAUTH_FAILED',
      message: tokenPayload.error_description || 'Google OAuth Token konnte nicht erstellt werden.'
    }, null, 2));
    process.exitCode = 1;
    return;
  }

  const classId = `${issuerId}.wallet_cards_mvp_smoke_check`;
  const walletResponse = await fetch(`https://walletobjects.googleapis.com/walletobjects/v1/genericClass/${encodeURIComponent(classId)}`, {
    headers: { Authorization: `Bearer ${tokenPayload.access_token}` }
  });
  const walletPayload = await walletResponse.json().catch(() => ({}));
  const providerError = walletPayload.error || {};
  const accessOk = walletResponse.ok || walletResponse.status === 404;

  console.log(JSON.stringify({
    ok: accessOk,
    step: 'wallet-api-access',
    oauthToken: 'ok',
    status: walletResponse.status,
    interpretation: walletResponse.ok
      ? 'Google Wallet API Zugriff ok; Test-Class existiert.'
      : walletResponse.status === 404
        ? 'Google Wallet API Zugriff ok; Test-Class existiert noch nicht.'
        : walletResponse.status === 403
          ? 'Google Wallet API ist im Google Cloud Projekt deaktiviert oder der Service Account ist im Issuer nicht berechtigt.'
          : 'Google Wallet API hat die Anfrage abgelehnt.',
    googleStatus: providerError.status || null,
    googleMessage: providerError.message || null,
    enableApiUrl: `https://console.developers.google.com/apis/api/walletobjects.googleapis.com/overview?project=${encodeURIComponent(googleProjectIdentifier(serviceAccount))}`,
    needsManualAction: !accessOk
  }, null, 2));

  if (!accessOk) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
