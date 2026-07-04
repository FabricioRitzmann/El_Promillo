import net from 'node:net';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const rawArgs = process.argv.slice(2);
const argSet = new Set(rawArgs);
const jsonOutput = argSet.has('--json');
const strict = argSet.has('--strict');

function optionValue(name) {
  const prefix = `${name}=`;
  const withEquals = rawArgs.find((arg) => arg.startsWith(prefix));

  if (withEquals) {
    return withEquals.slice(prefix.length);
  }

  const index = rawArgs.indexOf(name);
  return index >= 0 ? rawArgs[index + 1] : '';
}

function printUsageAndExit() {
  console.log(`Usage:
  node scripts/wallet-local-smoke-runner.js
  node scripts/wallet-local-smoke-runner.js --base-url http://localhost:3000
  node scripts/wallet-local-smoke-runner.js --strict
  node scripts/wallet-local-smoke-runner.js --json

Options:
  --base-url <url>  Existing local server URL to try first. Default: http://localhost:3000.
  --timeout-ms <ms> Per-request timeout for readiness and smoke test. Default: 7000.
  --strict          Exit non-zero if the smoke test fails.
  --json            Print machine-readable output.

The runner prints no secrets. It reuses an existing local server when available
or starts a temporary one on a free localhost port and stops it afterwards.
`);
  process.exit(0);
}

if (argSet.has('--help') || argSet.has('-h')) {
  printUsageAndExit();
}

function normalizeBaseUrl(value) {
  return String(value || 'http://localhost:3000').trim().replace(/\/+$/, '');
}

async function isReachable(baseUrl, timeoutMs) {
  try {
    const response = await fetch(`${baseUrl}/api/config`, {
      signal: AbortSignal.timeout(timeoutMs)
    });

    return response.ok;
  } catch {
    return false;
  }
}

async function findFreePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;

      server.close(() => resolve(port));
    });
  });
}

async function waitForServer(baseUrl, timeoutMs) {
  const startedAt = Date.now();
  let lastError = '';

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/api/config`, {
        signal: AbortSignal.timeout(1000)
      });

      if (response.ok) {
        return;
      }

      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error?.message || 'Server noch nicht erreichbar.';
    }

    await delay(250);
  }

  throw new Error(`Lokaler Server wurde nicht rechtzeitig erreichbar: ${lastError}`);
}

function runSmoke(baseUrl, timeoutMs) {
  return new Promise((resolve) => {
    const args = [
      'scripts/wallet-smoke-test.js',
      '--base-url',
      baseUrl,
      '--timeout-ms',
      String(timeoutMs),
      '--json'
    ];
    const child = spawn(process.execPath, args, {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('close', (code) => {
      let parsed = null;

      try {
        parsed = JSON.parse(stdout);
      } catch {
        parsed = null;
      }

      resolve({
        ok: code === 0 && parsed?.ok !== false,
        exitCode: code,
        report: parsed,
        stderr: stderr.trim()
      });
    });
  });
}

async function stopServer(child) {
  if (!child || child.exitCode !== null) {
    return;
  }

  child.kill('SIGTERM');

  await Promise.race([
    new Promise((resolve) => child.once('close', resolve)),
    delay(3000).then(() => {
      if (child.exitCode === null) {
        child.kill('SIGKILL');
      }
    })
  ]);
}

async function main() {
  const requestedBaseUrl = normalizeBaseUrl(optionValue('--base-url') || 'http://localhost:3000');
  const timeoutMs = Math.max(1000, Number(optionValue('--timeout-ms') || 7000));
  const existingReachable = await isReachable(requestedBaseUrl, timeoutMs);
  let baseUrl = requestedBaseUrl;
  let child = null;
  let startedServer = false;

  try {
    if (!existingReachable) {
      const port = await findFreePort();

      baseUrl = `http://127.0.0.1:${port}`;
      child = spawn(process.execPath, ['server/index.js'], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          HOST: '127.0.0.1',
          PORT: String(port)
        },
        stdio: ['ignore', 'ignore', 'pipe']
      });
      startedServer = true;

      let startupError = '';
      child.stderr.on('data', (chunk) => {
        startupError += chunk.toString();
      });

      child.on('exit', (code) => {
        if (code && !startupError) {
          startupError = `Server exited with code ${code}`;
        }
      });

      await waitForServer(baseUrl, timeoutMs).catch((error) => {
        if (startupError) {
          throw new Error(`${error.message}; server stderr: ${startupError.trim()}`);
        }

        throw error;
      });
    }

    const smoke = await runSmoke(baseUrl, timeoutMs);
    const result = {
      ok: smoke.ok,
      baseUrl,
      reusedExistingServer: existingReachable,
      startedTemporaryServer: startedServer,
      secretsPrinted: false,
      smoke
    };

    if (jsonOutput) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log('Wallet Local Smoke Runner');
      console.log(`Base URL: ${baseUrl}`);
      console.log(`Server: ${existingReachable ? 'bestehende Instanz genutzt' : 'temporär gestartet'}`);
      console.log('Secrets werden nicht ausgegeben.');
      console.log(`Smoke Test: ${smoke.ok ? 'ok' : 'fail'}`);

      if (smoke.report?.summary) {
        console.log(`Summary: ok=${smoke.report.summary.ok} skip=${smoke.report.summary.skip} fail=${smoke.report.summary.fail}`);
      }

      if (smoke.stderr) {
        console.log(`Stderr: ${smoke.stderr}`);
      }
    }

    if (strict && !smoke.ok) {
      process.exitCode = 1;
    }
  } finally {
    await stopServer(child);
  }
}

await main();
