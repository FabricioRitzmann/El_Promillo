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

function assertIncludes(source, needles, label) {
  for (const needle of needles) {
    assert(source.includes(needle), `${label} fehlt: ${needle}`);
  }
}

const editor = read('public/js/editor.js');
const createCampaign = read('supabase/functions/create-wallet-notification-campaign/index.ts');
const contextDoc = read('docs/WALLET_INTEGRATION_CONTEXT.md');
const readme = read('README.md');
const packageJson = read('package.json');

assertIncludes(editor, [
  'walletNotificationIdempotency: null',
  'function walletNotificationIdempotencyRandom()',
  'function stableWalletNotificationValue(value)',
  'function walletNotificationPayloadFingerprint(payload)',
  'function idempotencyKeyForWalletNotification(payload)',
  'function resetWalletNotificationIdempotency()',
  'payload.idempotencyKey = idempotencyKeyForWalletNotification(payload)'
], 'Editor Kampagnen-Idempotency');

assertIncludes(editor, [
  'if (state.walletNotificationIdempotency?.fingerprint === fingerprint)',
  'return state.walletNotificationIdempotency.key',
  'resetWalletNotificationIdempotency();',
  'walletNotificationForm.reset();'
], 'Editor Retry-Key Wiederverwendung und Reset');

const notificationFormPayloadBlock = editor.match(/function notificationFormPayload\(\) \{[\s\S]*?\n\}/)?.[0] || '';
assert(
  !notificationFormPayloadBlock.includes('randomUUID ? globalThis.crypto.randomUUID()')
    && !notificationFormPayloadBlock.includes('Date.now()}-${Math.random()'),
  'notificationFormPayload darf nicht bei jedem Submit blind einen neuen Idempotency-Key erzeugen.'
);

assertIncludes(editor, [
  "'idempotency-key': payload.idempotencyKey || ''",
  'create-wallet-notification-campaign'
], 'Editor Idempotency Header');

assertIncludes(createCampaign, [
  "const idempotencyKey = request.headers.get('idempotency-key')",
  'body.idempotencyKey || body.idempotency_key || idempotencyKey'
], 'Create-Campaign Edge Function Idempotency Header');

assertIncludes(contextDoc, [
  'Browser-Retry',
  'walletNotificationIdempotency',
  'Idempotency-Key'
], 'Kontextdoku Editor Idempotency');

assertIncludes(readme, [
  'verify-editor-campaign-idempotency.js',
  'Browser-Retry'
], 'README Editor Idempotency Check');

assert(
  packageJson.includes('verify-editor-campaign-idempotency.js'),
  'package.json muss verify-editor-campaign-idempotency.js in pnpm check ausführen.'
);

console.log('Editor-Kampagnen nutzen stabile Idempotency-Keys für Browser-Retries.');
