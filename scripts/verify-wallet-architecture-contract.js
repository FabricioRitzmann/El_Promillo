import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertFile(relativePath) {
  assert(fs.existsSync(path.join(rootDir, relativePath)), `Datei fehlt: ${relativePath}`);
}

function exportedObjectBody(relativePath, exportName) {
  const content = read(relativePath);
  const start = content.indexOf(`export const ${exportName} = {`);

  assert(start >= 0, `${exportName} wurde in ${relativePath} nicht gefunden.`);

  return content.slice(start);
}

function assertObjectMethods(relativePath, exportName, methods) {
  const body = exportedObjectBody(relativePath, exportName);

  for (const method of methods) {
    const pattern = new RegExp(`(?:async\\s+)?${method}\\s*\\(`);

    assert(pattern.test(body), `${exportName}.${method} fehlt in ${relativePath}.`);
  }
}

[
  'supabase/functions/issue-apple-pass/index.ts',
  'supabase/functions/apple-wallet-webservice/index.ts',
  'supabase/functions/update-apple-pass/index.ts',
  'supabase/functions/send-apple-wallet-update/index.ts',
  'supabase/functions/issue-google-wallet-pass/index.ts',
  'supabase/functions/update-google-wallet-pass/index.ts',
  'supabase/functions/send-google-wallet-message/index.ts',
  'supabase/functions/create-wallet-notification-campaign/index.ts',
  'supabase/functions/send-wallet-notification/index.ts',
  'supabase/functions/process-scheduled-wallet-notifications/index.ts',
  'supabase/functions/process-wallet-update-queue/index.ts',
  'supabase/functions/resolve-wallet-notification-recipients/index.ts',
  'supabase/functions/check-wallet-notification-limits/index.ts'
].forEach(assertFile);

assertObjectMethods('supabase/functions/_shared/walletNotificationService.ts', 'walletNotificationService', [
  'createCampaign',
  'resolveRecipients',
  'sendNow',
  'schedule',
  'sendToApplePass',
  'sendToGoogleWallet',
  'logResult',
  'checkPlatformLimits'
]);

assertObjectMethods('supabase/functions/_shared/appleWalletProvider.ts', 'appleWalletProvider', [
  'issuePass',
  'signPass',
  'registerDevice',
  'unregisterDevice',
  'getUpdatedPass',
  'sendPushUpdate',
  'updatePassFields'
]);

assertObjectMethods('supabase/functions/_shared/googleWalletProvider.ts', 'googleWalletProvider', [
  'createClass',
  'createObject',
  'generateSaveLink',
  'updateObject',
  'addMessage',
  'sendTextAndNotify'
]);

const appleWebService = read('supabase/functions/apple-wallet-webservice/index.ts');

[
  'Authorization: ApplePass',
  'registerDevice',
  'unregisterDevice',
  'getUpdatedPass',
  'signPass',
  'passesUpdatedSince',
  'apple_changed_serials_listed',
  "request.method === 'POST'",
  "request.method === 'GET'",
  "request.method === 'DELETE'",
  "parts[0] === 'v1' && parts[1] === 'devices'",
  "parts[0] === 'v1' && parts[1] === 'passes'",
  "parts[0] === 'v1' && parts[1] === 'log'"
].forEach((needle) => {
  assert(appleWebService.includes(needle), `Apple Wallet Web Service Vertrag fehlt: ${needle}`);
});

const googleProvider = read('supabase/functions/_shared/googleWalletProvider.ts');

[
  'TEXT_AND_NOTIFY',
  'genericObject',
  'loyaltyObject',
  'offerObject',
  'eventTicketObject',
  'walletobjects.googleapis.com/walletobjects/v1'
].forEach((needle) => {
  assert(googleProvider.includes(needle), `Google Wallet Provider Vertrag fehlt: ${needle}`);
});

console.log('Wallet-Architekturvertrag für Service, Provider und Edge Functions ist vorhanden.');
