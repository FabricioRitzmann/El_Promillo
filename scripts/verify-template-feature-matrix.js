import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const frontendMatrixPath = path.join(rootDir, 'public/js/templateFeatures.js');
const edgeMatrixPath = path.join(rootDir, 'supabase/functions/_shared/templateFeatures.ts');

function sortDeep(value) {
  if (Array.isArray(value)) {
    return value.map(sortDeep);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, sortDeep(nestedValue)])
    );
  }

  return value;
}

function stableJson(value) {
  return JSON.stringify(sortDeep(value), null, 2);
}

function readEdgeConstObject(exportName) {
  const source = fs.readFileSync(edgeMatrixPath, 'utf8');
  const match = source.match(new RegExp(`export const ${exportName} = ([\\s\\S]*?\\n}) as const;`));

  if (!match) {
    throw new Error(`Edge ${exportName} konnte nicht gefunden werden.`);
  }

  return Function(`
    const OPTIONAL_FEATURE = 'optional';
    return (${match[1]});
  `)();
}

function compareKeys(label, left, right) {
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();

  if (stableJson(leftKeys) !== stableJson(rightKeys)) {
    throw new Error(`${label} stimmen nicht ueberein.\nFrontend: ${leftKeys.join(', ')}\nEdge: ${rightKeys.join(', ')}`);
  }
}

const {
  SCANNER_ACTIONS,
  SCANNER_ACTION_ALIASES,
  TEMPLATE_FEATURES: frontendTemplateFeatures
} = await import(pathToFileURL(frontendMatrixPath));
const edgeTemplateFeatures = readEdgeConstObject('TEMPLATE_FEATURES');
const edgeScannerActions = readEdgeConstObject('SCANNER_ACTIONS');
const edgeScannerActionAliases = readEdgeConstObject('SCANNER_ACTION_ALIASES');

compareKeys('Template-Typen', frontendTemplateFeatures, edgeTemplateFeatures);

for (const templateType of Object.keys(frontendTemplateFeatures)) {
  compareKeys(
    `Feature-Keys für ${templateType}`,
    frontendTemplateFeatures[templateType],
    edgeTemplateFeatures[templateType]
  );
}

if (stableJson(frontendTemplateFeatures) !== stableJson(edgeTemplateFeatures)) {
  throw new Error('Frontend- und Edge-Template-Feature-Matrix sind nicht identisch.');
}

compareKeys('Scanner-Aktionen', SCANNER_ACTIONS, edgeScannerActions);

if (stableJson(SCANNER_ACTIONS) !== stableJson(edgeScannerActions)) {
  throw new Error('Frontend- und Edge-SCANNER_ACTIONS sind nicht identisch.');
}

compareKeys('Scanner-Aktions-Aliase', SCANNER_ACTION_ALIASES, edgeScannerActionAliases);

if (stableJson(SCANNER_ACTION_ALIASES) !== stableJson(edgeScannerActionAliases)) {
  throw new Error('Frontend- und Edge-SCANNER_ACTION_ALIASES sind nicht identisch.');
}

for (const [alias, action] of Object.entries(SCANNER_ACTION_ALIASES)) {
  if (!SCANNER_ACTIONS[action]) {
    throw new Error(`Scanner-Aktions-Alias ${alias} zeigt auf unbekannte Aktion ${action}.`);
  }
}

console.log('Template-Feature-Matrix ist zwischen Frontend und Edge Functions synchron.');
