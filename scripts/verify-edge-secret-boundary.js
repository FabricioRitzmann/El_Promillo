import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const functionsDir = path.join(rootDir, 'supabase', 'functions');

const forbiddenPatterns = [
  {
    pattern: /\breturn\s+config\b/,
    message: 'Edge Function darf kein rohes config-Objekt zurückgeben.'
  },
  {
    pattern: /\breturn\s+signingConfig\b/,
    message: 'Edge Function darf kein rohes Apple-Signing-Config-Objekt zurückgeben.'
  },
  {
    pattern: /\breturn\s+\{\s*\.\.\.config\b/,
    message: 'Edge Function darf kein rohes config-Objekt in Antwortobjekte spreaden.'
  },
  {
    pattern: /\bjson\s*\(\s*config\b/,
    message: 'Edge Function darf config nicht direkt als JSON-Antwort senden.'
  },
  {
    pattern: /\bjson\s*\(\s*signingConfig\b/,
    message: 'Edge Function darf Apple-Signing-Config nicht direkt als JSON-Antwort senden.'
  },
  {
    pattern: /\b(response_payload|provider_response)\s*:\s*(config|signingConfig|serviceRoleKey|privateKey|passKey|signerKey|apnsAuthKey|serviceAccountJson|serviceAccountEmail)\b/,
    message: 'Wallet-Logs dürfen keine rohen Secrets oder Config-Objekte speichern.'
  },
  {
    pattern: /\b(error_message|error_reason)\s*:\s*((config|signingConfig)\.(privateKey|passKey|signerKey|signerCert|wwdrCert|apnsAuthKey|serviceAccountJson|serviceAccountEmail)|Deno\.env|serviceRoleKey|privateKey|passKey|signerKey|apnsAuthKey|serviceAccountJson)\b/,
    message: 'Fehlerantworten dürfen keine Secret-Werte aus Config oder Env enthalten.'
  },
  {
    pattern: /console\.(log|warn|error)\s*\([^;\n]*(Deno\.env|config|signingConfig|serviceRoleKey|privateKey|passKey|signerKey|apnsAuthKey|serviceAccountJson|serviceAccountEmail)/,
    message: 'Edge Logs dürfen keine rohen Env-/Config-/Secret-Werte ausgeben.'
  }
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function listFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return listFiles(absolutePath);
    }

    return absolutePath.endsWith('.ts') ? absolutePath : [];
  });
}

function relative(filePath) {
  return path.relative(rootDir, filePath);
}

function assertNoForbiddenPatterns(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  for (const { pattern, message } of forbiddenPatterns) {
    const match = content.match(pattern);

    assert(
      !match,
      `${message} Fund in ${relative(filePath)}: ${match?.[0]}`
    );
  }
}

function assertProviderErrorsAreSanitized() {
  const appleProvider = fs.readFileSync(path.join(functionsDir, '_shared', 'appleWalletProvider.ts'), 'utf8');
  const googleProvider = fs.readFileSync(path.join(functionsDir, '_shared', 'googleWalletProvider.ts'), 'utf8');
  const notificationService = fs.readFileSync(path.join(functionsDir, '_shared', 'walletNotificationService.ts'), 'utf8');

  assert(appleProvider.includes("Deno.env.get('APPLE_PASS_KEY')"), 'Apple Pass Key muss ausschliesslich serverseitig gelesen werden.');
  assert(appleProvider.includes("Deno.env.get('APPLE_APNS_AUTH_KEY')"), 'Apple APNS Auth Key muss ausschliesslich serverseitig gelesen werden.');
  assert(appleProvider.includes('push_token_suffix'), 'Apple APNS-Ergebnisse müssen Push Tokens nur gekürzt loggen.');
  assert(!appleProvider.includes('push_token: pushToken'), 'Apple APNS-Ergebnisse dürfen keinen vollen Push Token zurückgeben.');
  assert(googleProvider.includes("Deno.env.get('GOOGLE_WALLET_SERVICE_ACCOUNT_JSON')"), 'Google Service Account JSON muss ausschliesslich serverseitig gelesen werden.');
  assert(googleProvider.includes('function googleConfigError'), 'Google Provider muss Setup-Fehler über googleConfigError kapseln.');
  assert(!googleProvider.includes('return {\n      ...config'), 'Google Provider darf Config nicht in Fehlerantworten spreaden.');
  assert(notificationService.includes("Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')"), 'Service Role Key muss ausschliesslich serverseitig gelesen werden.');
  assert(notificationService.includes('error_reason: error?.error_reason'), 'Zentrale Fehlerantwort muss strukturierte Gründe statt roher Fehlerobjekte liefern.');
}

for (const filePath of listFiles(functionsDir)) {
  assertNoForbiddenPatterns(filePath);
}

assertProviderErrorsAreSanitized();

console.log('Edge-Secret-Grenze ist statisch abgesichert.');
