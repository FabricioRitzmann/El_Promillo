import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const functionsDir = path.join(rootDir, 'supabase', 'functions');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function listTypescriptFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...listTypescriptFiles(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

function nodeSupportsStripTypes() {
  const result = spawnSync(process.execPath, ['--help'], {
    encoding: 'utf8'
  });

  return `${result.stdout || ''}${result.stderr || ''}`.includes('--experimental-strip-types');
}

function runNodeTypescriptSyntaxCheck(files) {
  for (const file of files) {
    const result = spawnSync(process.execPath, ['--experimental-strip-types', '--check', file], {
      cwd: rootDir,
      encoding: 'utf8'
    });

    if (result.status !== 0) {
      process.stderr.write(result.stdout || '');
      process.stderr.write(result.stderr || '');
      throw new Error(`TypeScript-Syntaxcheck fehlgeschlagen: ${path.relative(rootDir, file)}`);
    }
  }
}

function assertBalancedBrackets(source, relativePath) {
  const stack = [];
  const pairs = {
    '(': ')',
    '[': ']',
    '{': '}'
  };
  const closers = new Set(Object.values(pairs));
  let quote = '';
  let templateDepth = 0;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1] || '';

    if (lineComment) {
      if (char === '\n') {
        lineComment = false;
      }
      continue;
    }

    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (quote === '`' && char === '$' && next === '{') {
        stack.push('{');
        templateDepth += 1;
        index += 1;
        continue;
      }

      if (char === quote && templateDepth === 0) {
        quote = '';
      }
      continue;
    }

    if (char === '/' && next === '/') {
      lineComment = true;
      index += 1;
      continue;
    }

    if (char === '/' && next === '*') {
      blockComment = true;
      index += 1;
      continue;
    }

    if (char === '\'' || char === '"' || char === '`') {
      quote = char;
      continue;
    }

    if (pairs[char]) {
      stack.push(char);
      continue;
    }

    if (closers.has(char)) {
      const opener = stack.pop();

      assert(opener && pairs[opener] === char, `${relativePath}: unausgeglichene Klammer bei Zeichen ${index}.`);

      if (templateDepth && char === '}') {
        templateDepth -= 1;
      }
    }
  }

  assert(!quote, `${relativePath}: String oder Template Literal ist nicht geschlossen.`);
  assert(!blockComment, `${relativePath}: Blockkommentar ist nicht geschlossen.`);
  assert(stack.length === 0, `${relativePath}: Klammern sind nicht ausgeglichen.`);
}

function runFallbackStructuralCheck(files) {
  for (const file of files) {
    const relativePath = path.relative(rootDir, file);
    const source = fs.readFileSync(file, 'utf8');

    assertBalancedBrackets(source, relativePath);
    assert(
      !/const\s+([A-Za-z_$][\w$]*)\s*=[^\n;]+;\s*\n\s*const\s+\1\s*=/.test(source),
      `${relativePath}: direkt doppelte const-Deklaration gefunden.`
    );
  }
}

const tsFiles = listTypescriptFiles(functionsDir);

assert(tsFiles.length > 0, 'Keine Supabase Edge TypeScript-Dateien gefunden.');

if (nodeSupportsStripTypes()) {
  runNodeTypescriptSyntaxCheck(tsFiles);
  console.log(`Supabase Edge TypeScript-Syntax ist für ${tsFiles.length} Dateien geprüft.`);
} else {
  runFallbackStructuralCheck(tsFiles);
  console.log(`Supabase Edge TypeScript-Struktur ist für ${tsFiles.length} Dateien geprüft; Node unterstützt --experimental-strip-types nicht.`);
}
