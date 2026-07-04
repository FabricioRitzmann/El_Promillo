import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const schemaPath = path.join(rootDir, 'supabase', 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8').replace(/\r\n/g, '\n');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function dollarTagAt(source, index) {
  const match = source.slice(index).match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/);
  return match?.[0] || null;
}

function createScannerState() {
  return {
    singleQuote: false,
    doubleQuote: false,
    lineComment: false,
    blockComment: false,
    dollarQuote: null
  };
}

function advanceState(source, index, state) {
  const char = source[index];
  const next = source[index + 1];

  if (state.lineComment) {
    if (char === '\n') {
      state.lineComment = false;
    }
    return 1;
  }

  if (state.blockComment) {
    if (char === '*' && next === '/') {
      state.blockComment = false;
      return 2;
    }
    return 1;
  }

  if (state.singleQuote) {
    if (char === "'" && next === "'") {
      return 2;
    }
    if (char === "'") {
      state.singleQuote = false;
    }
    return 1;
  }

  if (state.doubleQuote) {
    if (char === '"' && next === '"') {
      return 2;
    }
    if (char === '"') {
      state.doubleQuote = false;
    }
    return 1;
  }

  if (state.dollarQuote) {
    if (source.startsWith(state.dollarQuote, index)) {
      const length = state.dollarQuote.length;
      state.dollarQuote = null;
      return length;
    }
    return 1;
  }

  if (char === '-' && next === '-') {
    state.lineComment = true;
    return 2;
  }

  if (char === '/' && next === '*') {
    state.blockComment = true;
    return 2;
  }

  if (char === "'") {
    state.singleQuote = true;
    return 1;
  }

  if (char === '"') {
    state.doubleQuote = true;
    return 1;
  }

  if (char === '$') {
    const tag = dollarTagAt(source, index);
    if (tag) {
      state.dollarQuote = tag;
      return tag.length;
    }
  }

  return 0;
}

function isNeutralState(state) {
  return !state.singleQuote
    && !state.doubleQuote
    && !state.lineComment
    && !state.blockComment
    && !state.dollarQuote;
}

function findMatchingParen(source, openIndex) {
  const state = createScannerState();
  let depth = 0;

  for (let index = openIndex; index < source.length;) {
    const advanced = advanceState(source, index, state);
    if (advanced > 0) {
      index += advanced;
      continue;
    }

    const char = source[index];
    if (char === '(') {
      depth += 1;
    } else if (char === ')') {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
      assert(depth >= 0, `Unerwartete schliessende Klammer bei Zeichen ${index}.`);
    }

    index += 1;
  }

  throw new Error(`Keine passende schliessende Klammer für Zeichen ${openIndex} gefunden.`);
}

function splitTopLevelList(source) {
  const items = [];
  const state = createScannerState();
  let depth = 0;
  let start = 0;

  for (let index = 0; index < source.length;) {
    const advanced = advanceState(source, index, state);
    if (advanced > 0) {
      index += advanced;
      continue;
    }

    const char = source[index];
    if (char === '(') {
      depth += 1;
    } else if (char === ')') {
      depth -= 1;
      assert(depth >= 0, `Top-Level-Liste enthält zu viele schliessende Klammern: ${source.slice(0, index + 1)}`);
    } else if (char === ',' && depth === 0) {
      items.push(source.slice(start, index).trim());
      start = index + 1;
    }

    index += 1;
  }

  assert(depth === 0, `Top-Level-Liste enthält unausgewogene Klammern: ${source.slice(0, 120)}`);
  const tail = source.slice(start).trim();
  if (tail) {
    items.push(tail);
  }

  return items.filter(Boolean);
}

function sqlIdentifierFromDefinition(definition) {
  const trimmed = definition.trim();
  if (/^(constraint|primary|unique|foreign|check|exclude)\b/i.test(trimmed)) {
    return null;
  }

  const quoted = trimmed.match(/^"([^"]+)"/);
  if (quoted) {
    return quoted[1].toLowerCase();
  }

  const plain = trimmed.match(/^([a-z_][a-z0-9_]*)\b/i);
  return plain?.[1].toLowerCase() || null;
}

function findTopLevelKeyword(source, start, keyword) {
  const state = createScannerState();
  let depth = 0;
  const lower = source.toLowerCase();
  const normalizedKeyword = keyword.toLowerCase();

  for (let index = start; index < source.length;) {
    const advanced = advanceState(source, index, state);
    if (advanced > 0) {
      index += advanced;
      continue;
    }

    const char = source[index];
    if (char === '(') {
      depth += 1;
    } else if (char === ')') {
      depth -= 1;
    } else if (char === ';' && depth === 0) {
      return -1;
    }

    if (
      depth === 0
      && lower.startsWith(normalizedKeyword, index)
      && !/[a-z0-9_]/i.test(source[index - 1] || '')
      && !/[a-z0-9_]/i.test(source[index + normalizedKeyword.length] || '')
    ) {
      return index;
    }

    index += 1;
  }

  return -1;
}

function skipWhitespaceAndComments(source, start) {
  let index = start;

  while (index < source.length) {
    const whitespace = source.slice(index).match(/^\s+/);
    if (whitespace) {
      index += whitespace[0].length;
      continue;
    }

    if (source.startsWith('--', index)) {
      const newline = source.indexOf('\n', index + 2);
      index = newline === -1 ? source.length : newline + 1;
      continue;
    }

    if (source.startsWith('/*', index)) {
      const end = source.indexOf('*/', index + 2);
      assert(end !== -1, `Block-Kommentar ab Zeichen ${index} wird nicht geschlossen.`);
      index = end + 2;
      continue;
    }

    break;
  }

  return index;
}

function verifyTopLevelStatements(source) {
  const state = createScannerState();
  let statementStart = 0;
  let sawStatement = false;

  for (let index = 0; index < source.length;) {
    const advanced = advanceState(source, index, state);
    if (advanced > 0) {
      index += advanced;
      continue;
    }

    if (source[index] === ';') {
      const statement = source.slice(statementStart, index).trim();
      if (statement) {
        sawStatement = true;
      }
      statementStart = index + 1;
    }

    index += 1;
  }

  assert(isNeutralState(state), 'schema.sql enthält einen nicht geschlossenen String, Kommentar oder Dollar-Quote-Block.');
  assert(sawStatement, 'schema.sql enthält keine abgeschlossenen SQL-Statements.');
  assert(
    skipWhitespaceAndComments(source, statementStart) === source.length,
    'schema.sql endet mit einem nicht per Semikolon abgeschlossenen Statement.'
  );
}

function verifyCreateTableColumns(source) {
  const createTablePattern = /create\s+table\s+if\s+not\s+exists\s+public\.([a-z_][a-z0-9_]*)\s*\(/gi;
  let match;
  let count = 0;

  while ((match = createTablePattern.exec(source))) {
    count += 1;
    const tableName = match[1];
    const openIndex = source.indexOf('(', match.index);
    const closeIndex = findMatchingParen(source, openIndex);
    const body = source.slice(openIndex + 1, closeIndex);
    const seen = new Map();

    for (const definition of splitTopLevelList(body)) {
      const columnName = sqlIdentifierFromDefinition(definition);
      if (!columnName) {
        continue;
      }

      assert(
        !seen.has(columnName),
        `Tabelle public.${tableName} definiert die Spalte ${columnName} doppelt.`
      );

      seen.set(columnName, definition);
    }

    createTablePattern.lastIndex = closeIndex + 1;
  }

  assert(count >= 10, `Unerwartet wenige CREATE-TABLE-Blöcke gefunden: ${count}.`);
}

function verifyInsertColumnLists(source) {
  const insertPattern = /insert\s+into\s+(public|storage)\.([a-z_][a-z0-9_]*)\s*\(/gi;
  let match;
  let count = 0;

  while ((match = insertPattern.exec(source))) {
    count += 1;
    const schemaName = match[1];
    const tableName = match[2];
    const openIndex = source.indexOf('(', match.index);
    const closeIndex = findMatchingParen(source, openIndex);
    const columns = splitTopLevelList(source.slice(openIndex + 1, closeIndex)).map((column) => column.trim().toLowerCase());
    const duplicateColumn = columns.find((column, index) => columns.indexOf(column) !== index);

    assert(!duplicateColumn, `INSERT in ${schemaName}.${tableName} enthält die Spalte ${duplicateColumn} doppelt.`);

    const nextIndex = skipWhitespaceAndComments(source, closeIndex + 1);
    const nextSource = source.slice(nextIndex).toLowerCase();

    assert(!nextSource.startsWith(')'), `INSERT in ${schemaName}.${tableName} hat eine zusätzliche schliessende Klammer vor VALUES/SELECT.`);

    if (nextSource.startsWith('values')) {
      const valuesOpenIndex = source.indexOf('(', nextIndex);
      const valuesCloseIndex = findMatchingParen(source, valuesOpenIndex);
      const values = splitTopLevelList(source.slice(valuesOpenIndex + 1, valuesCloseIndex));

      assert(
        columns.length === values.length,
        `INSERT in ${schemaName}.${tableName} hat ${columns.length} Spalten, aber ${values.length} VALUES-Ausdrücke.`
      );
    } else if (nextSource.startsWith('select')) {
      const selectStart = nextIndex + 'select'.length;
      const fromIndex = findTopLevelKeyword(source, selectStart, 'from');

      assert(fromIndex !== -1, `INSERT ... SELECT in ${schemaName}.${tableName} hat keinen Top-Level-FROM-Teil.`);

      const selectedValues = splitTopLevelList(source.slice(selectStart, fromIndex));

      assert(
        columns.length === selectedValues.length,
        `INSERT ... SELECT in ${schemaName}.${tableName} hat ${columns.length} Spalten, aber ${selectedValues.length} SELECT-Ausdrücke.`
      );
    }

    insertPattern.lastIndex = closeIndex + 1;
  }

  assert(count >= 2, `Unerwartet wenige INSERT-Spaltenlisten gefunden: ${count}.`);
}

function verifyKnownMvpTables(source) {
  [
    'operator_profiles',
    'businesses',
    'card_templates',
    'customer_cards',
    'card_instances',
    'wallet_notification_campaigns',
    'wallet_notification_recipients',
    'wallet_push_logs',
    'wallet_update_queue',
    'apple_wallet_devices',
    'apple_wallet_registrations',
    'apple_pass_versions',
    'google_wallet_objects',
    'card_events'
  ].forEach((tableName) => {
    assert(
      source.includes(`create table if not exists public.${tableName}`),
      `MVP-Tabelle public.${tableName} fehlt in supabase/schema.sql.`
    );
  });
}

assert(schema.startsWith('-- El_Promillo'), 'schema.sql sollte mit dem El_Promillo-Header beginnen.');
assert(!/\)\s*\)\s*select\b/i.test(schema), 'schema.sql enthält eine verdächtige doppelte Klammer direkt vor SELECT.');

verifyTopLevelStatements(schema);
verifyKnownMvpTables(schema);
verifyCreateTableColumns(schema);
verifyInsertColumnLists(schema);

console.log('Supabase Schema-Sanity-Check hat Tabellen, INSERT-Listen und Statement-Abschluss geprüft.');
