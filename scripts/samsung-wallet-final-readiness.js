import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadConfig, looksConfigured } from '../server/config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const rawArgs = process.argv.slice(2);
const argSet = new Set(rawArgs);
const strict = argSet.has('--strict');
const jsonOutput = argSet.has('--json');
const skipRemote = argSet.has('--skip-remote');
const skipSmoke = argSet.has('--skip-smoke');
const defaultBearerFile = 'tmp/samsung-bearer.txt';

function argValue(name) {
  const index = rawArgs.indexOf(name);

  return index >= 0 ? rawArgs[index + 1] : '';
}

function usage() {
  console.log(`Usage:
  node scripts/samsung-wallet-final-readiness.js --functions-base-url https://<PROJECT_REF>.supabase.co/functions/v1
  node scripts/samsung-wallet-final-readiness.js --authorization-file tmp/samsung-bearer.txt --strict
  node scripts/samsung-wallet-final-readiness.js --skip-remote --json

Options:
  --functions-base-url      Supabase Edge Functions base URL.
  --template-id             Optional active template id for samsung-wallet-smoke-test.js.
  --authorization-file      Optional Samsung Bearer file for final callback proof.
  --get-authorization-file  Optional GET-specific Samsung Bearer file.
  --post-authorization-file Optional POST-specific Samsung Bearer file.
  --skip-post               Only run GET Card Data if a Bearer exists.
  --skip-remote             Skip live remote schema, Edge Function and smoke checks.
  --skip-smoke              Skip only samsung-wallet-smoke-test.js.
  --strict                  Exit non-zero while any required gate is open.
  --json                    Machine-readable output.

This readiness script prints no Samsung Bearer, Supabase keys, private keys,
certificates or full Samsung Add-to-Wallet URLs.
`);
  process.exit(0);
}

if (argSet.has('--help') || argSet.has('-h')) {
  usage();
}

function add(results, status, label, detail = '', required = true) {
  results.push({ status, label, detail, required });
}

function configured(value) {
  return looksConfigured(String(value || '').trim());
}

function functionsBaseUrl(config) {
  return String(argValue('--functions-base-url') || config.publicUrls?.supabaseFunctionBaseUrl || '').replace(/\/+$/, '');
}

function bearerFileArgs() {
  const generic = argValue('--authorization-file') || (fs.existsSync(path.join(rootDir, defaultBearerFile)) ? defaultBearerFile : '');
  const getFile = argValue('--get-authorization-file');
  const postFile = argValue('--post-authorization-file');
  const args = [];

  if (getFile || postFile) {
    if (getFile) {
      args.push('--get-authorization-file', getFile);
    }
    if (postFile) {
      args.push('--post-authorization-file', postFile);
    }
  } else if (generic) {
    args.push('--authorization-file', generic);
  }

  return args;
}

function bearerProvided() {
  const files = [
    argValue('--authorization-file') || (fs.existsSync(path.join(rootDir, defaultBearerFile)) ? defaultBearerFile : ''),
    argValue('--get-authorization-file'),
    argValue('--post-authorization-file')
  ].filter(Boolean);

  if (configured(process.env.SAMSUNG_WALLET_TEST_AUTHORIZATION)
    || configured(process.env.SAMSUNG_WALLET_TEST_GET_AUTHORIZATION)
    || configured(process.env.SAMSUNG_WALLET_TEST_POST_AUTHORIZATION)) {
    return true;
  }

  return files.some((file) => {
    try {
      const text = fs.readFileSync(path.resolve(rootDir, file), 'utf8').trim();
      return configured(text);
    } catch {
      return false;
    }
  });
}

function runNodeScript(script, args = []) {
  try {
    const stdout = execFileSync(process.execPath, [path.join(rootDir, script), ...args], {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env
    });

    return { ok: true, output: stdout.trim() };
  } catch (error) {
    return {
      ok: false,
      output: String(error?.stdout || '').trim(),
      error: String(error?.stderr || error?.message || '').trim()
    };
  }
}

function summarize(results) {
  return results.reduce((summary, result) => {
    summary[result.status] = (summary[result.status] || 0) + 1;
    return summary;
  }, { ok: 0, warn: 0, fail: 0, blocked_external: 0 });
}

function compactDetail(result) {
  const text = [result.output, result.error].filter(Boolean).join('\n').trim();

  if (!text) {
    return '';
  }

  return text.split(/\r?\n/).slice(-3).join(' | ');
}

async function main() {
  const results = [];
  const config = loadConfig();
  const baseUrl = functionsBaseUrl(config);

  const staticChecks = [
    'scripts/verify-samsung-wallet-contract.js',
    'scripts/verify-samsung-wallet-error-paths.js',
    'scripts/verify-samsung-wallet-smoke-test.js',
    'scripts/verify-samsung-wallet-partner-callback-test.js',
    'scripts/verify-wallet-device-detection.js',
    'scripts/verify-claim-token-links.js',
    'scripts/verify-wallet-architecture-contract.js'
  ];

  for (const script of staticChecks) {
    const result = runNodeScript(script);
    add(results, result.ok ? 'ok' : 'fail', script, result.ok ? 'statisch ok' : compactDetail(result));
  }

  if (!configured(baseUrl) || !/^https:\/\/.+\/functions\/v1$/i.test(baseUrl)) {
    add(results, 'fail', 'Functions Base URL', 'Setze --functions-base-url https://<PROJECT_REF>.supabase.co/functions/v1.');
  } else if (!skipRemote) {
    const schemaResult = runNodeScript('scripts/wallet-remote-schema-check.js', ['--strict']);
    add(results, schemaResult.ok ? 'ok' : 'fail', 'Remote Supabase Schema', schemaResult.ok ? 'Schema erreichbar' : compactDetail(schemaResult));

    const edgeResult = runNodeScript('scripts/wallet-edge-functions-report.js', ['--functions-base-url', baseUrl, '--strict']);
    add(results, edgeResult.ok ? 'ok' : 'fail', 'Remote Edge Functions', edgeResult.ok ? 'Edge Functions erreichbar' : compactDetail(edgeResult));

    if (!skipSmoke) {
      const smokeArgs = ['--functions-base-url', baseUrl, '--strict'];
      const templateId = argValue('--template-id');

      if (templateId) {
        smokeArgs.push('--template-id', templateId);
      }

      const smokeResult = runNodeScript('scripts/samsung-wallet-smoke-test.js', smokeArgs);
      add(results, smokeResult.ok ? 'ok' : 'fail', 'Samsung Remote Smoke Test', smokeResult.ok ? 'Add-Link, Instanz, Event und Unauthorized-Gate ok' : compactDetail(smokeResult));
    }
  } else {
    add(results, 'warn', 'Remote Checks', 'per --skip-remote übersprungen', false);
  }

  if (!bearerProvided()) {
    add(
      results,
      'blocked_external',
      'Samsung Partner Callback Bearer',
      'Echter Authorization: Bearer <JWS> aus Samsung Test Tool oder Samsung Wallet Callback fehlt noch.',
      true
    );
    return results;
  }

  const callbackArgs = [
    '--functions-base-url',
    baseUrl,
    ...bearerFileArgs()
  ];

  if (argSet.has('--skip-post')) {
    callbackArgs.push('--skip-post');
  }

  const callbackResult = runNodeScript('scripts/samsung-wallet-partner-callback-test.js', callbackArgs);
  add(results, callbackResult.ok ? 'ok' : 'fail', 'Samsung Partner Callback', callbackResult.ok ? 'Echter Bearer Callback bestanden' : compactDetail(callbackResult));

  return results;
}

const results = await main();
const summary = summarize(results);

if (jsonOutput) {
  console.log(JSON.stringify({ summary, results }, null, 2));
} else {
  console.log('Samsung Wallet Final Readiness');
  console.log('Secrets, Bearer, Zertifikate und vollstaendige Add-to-Wallet-URLs werden nicht ausgegeben.');
  console.log(`OK: ${summary.ok}  WARN: ${summary.warn}  FAIL: ${summary.fail}  EXTERNAL_BLOCKED: ${summary.blocked_external}`);

  for (const result of results) {
    const label = result.status.toUpperCase().padEnd(16);
    console.log(`${label} ${result.label} - ${result.detail}`);
  }
}

if (strict && (summary.fail > 0 || summary.blocked_external > 0)) {
  process.exitCode = 1;
}
