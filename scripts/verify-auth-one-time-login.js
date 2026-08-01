import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(label, source, needles) {
  for (const needle of needles) {
    assert(source.includes(needle), `${label} fehlt: ${needle}`);
  }
}

const indexHtml = read('public/index.html');
const authJs = read('public/js/auth.js');
const accountHtml = read('public/account.html');
const accountJs = read('public/js/account.js');
const clientJs = read('public/js/supabaseClient.js');
const edgeFunction = read('supabase/functions/request-operator-magic-link/index.ts');
const supabaseConfig = read('supabase/config.toml');
const deployScript = read('scripts/deploy-wallet-functions.sh');

assertIncludes('One-Time-Login UI', indexHtml, [
  'id="showOneTimeLoginButton"',
  'id="oneTimeLoginForm"',
  'Ohne Passwort einloggen',
  'Login-Link senden'
]);
assert(!indexHtml.includes('id="resetPasswordForm"'), 'Das alte Reset-Passwort-Formular ist noch vorhanden.');

assertIncludes('One-Time-Login Request', authJs, [
  'client.requestOperatorMagicLink',
  "pageUrl('account.html?magic_login=1')",
  'Der einmalige Login-Link wurde an deine hinterlegte E-Mail-Adresse versendet.'
]);
assert(!authJs.includes('resetPasswordForEmail'), 'Der alte Password-Recovery-Aufruf ist noch vorhanden.');

assertIncludes('Magic-Link Edge-Aufruf', clientJs, [
  '/functions/v1/request-operator-magic-link',
  'data?.error_reason',
  "auth_flow: params.get('type') || ''"
]);

assertIncludes('Offizielle Betreiberprüfung', edgeFunction, [
  ".from('operator_profiles')",
  ".select('id,email,unlock')",
  ".eq('email', email)",
  'supabaseAdmin.auth.admin.getUserById(profile.id)',
  'OPERATOR_ACCOUNT_NOT_FOUND',
  'OPERATOR_ACCOUNT_NOT_APPROVED',
  'Wir konnten keinen offiziellen El Promillo Account mit dieser E-Mail-Adresse finden.',
  "enforcePublicClaimRateLimit(supabaseAdmin, request, 'request-operator-magic-link'",
  'shouldCreateUser: false',
  'emailRedirectTo: redirectTo'
]);
assertIncludes('Öffentliche Edge-Konfiguration', supabaseConfig, [
  '[functions.request-operator-magic-link]',
  'verify_jwt = false'
]);
assert(deployScript.includes('request-operator-magic-link'), 'Die neue Function fehlt im Deploy-Script.');

assertIncludes('Magic-Link Passwortmodus', accountHtml, [
  'id="passwordChangeHint"',
  'id="currentPasswordField"'
]);
assertIncludes('Magic-Link Passwortlogik', accountJs, [
  "params.get('magic_login') === '1'",
  "state.session?.auth_flow === 'magiclink'",
  'requireCurrentPassword: !state.magicLogin',
  'currentPasswordInput.required = !state.magicLogin',
  'if (!state.magicLogin)',
  "auth_flow: ''"
]);

console.log('One-Time Login und Passwortsetzung im Kundenprofil sind statisch abgesichert.');
