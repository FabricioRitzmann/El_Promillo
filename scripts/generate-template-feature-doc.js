import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const matrixPath = path.join(rootDir, 'public/js/templateFeatures.js');
const docPath = path.join(rootDir, 'docs/TEMPLATE_FEATURE_MATRIX.md');
const checkMode = process.argv.includes('--check');

const {
  FEATURE_LABELS,
  OPTIONAL_FEATURE,
  SCANNER_ACTIONS,
  SCANNER_ACTION_ALIASES,
  TEMPLATE_FEATURES,
  TEMPLATE_TYPE_LABELS,
  TEMPLATE_TYPES
} = await import(pathToFileURL(matrixPath));

function escapeCell(value) {
  return String(value ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\n/g, '<br>');
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.map(escapeCell).join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(escapeCell).join(' | ')} |`)
  ].join('\n');
}

function featureCell(value) {
  if (value === true) {
    return 'ja';
  }

  if (value === OPTIONAL_FEATURE) {
    return 'optional';
  }

  return 'nein';
}

function buildDocument() {
  const featureNames = Object.keys(TEMPLATE_FEATURES.generic_card);
  const templateRows = TEMPLATE_TYPES.map((templateType) => [
    templateType,
    TEMPLATE_TYPE_LABELS[templateType] || templateType
  ]);
  const matrixRows = featureNames.map((featureName) => [
    featureName,
    FEATURE_LABELS[featureName] || featureName,
    ...TEMPLATE_TYPES.map((templateType) => featureCell(TEMPLATE_FEATURES[templateType][featureName]))
  ]);
  const actionRows = Object.entries(SCANNER_ACTIONS).map(([actionName, actionConfig]) => [
    actionName,
    actionConfig.feature,
    actionConfig.label,
    actionConfig.blockedReason
  ]);
  const aliasRows = Object.entries(SCANNER_ACTION_ALIASES).map(([alias, actionName]) => [
    alias,
    actionName
  ]);

  return `${[
    '# Template Feature Matrix',
    '',
    '> Diese Datei wird automatisch aus `public/js/templateFeatures.js` erzeugt. Bitte nicht manuell bearbeiten.',
    '',
    'Diese Matrix ist die zentrale Wahrheit dafür, welche Funktionen ein Kartentemplate im Editor, Scanner, Wallet, PDF und Backend verwenden darf.',
    '',
    'Werte:',
    '',
    '- `ja`: Feature ist für diesen Template-Typ immer aktiv.',
    '- `optional`: Feature ist nur aktiv, wenn es in den Template-Einstellungen explizit eingeschaltet wurde.',
    '- `nein`: Feature ist für diesen Template-Typ verboten und muss im Backend blockiert werden.',
    '',
    'Optionale Features können im MVP über `settings.enabledFeatures`, `settings.features.<feature>` oder `settings.<feature>Enabled` aktiviert werden.',
    '',
    'Hinweis zu `notifications`: Die Matrix erlaubt Wallet-Benachrichtigungen für alle aktuellen Template-Typen. Ein einzelnes Template kann sie trotzdem explizit über `settings.notificationsEnabled = false` oder `settings.features.notifications = false` deaktivieren; Browser, Edge Functions und SQL respektieren dieses Opt-out.',
    '',
    '## Template-Typen',
    '',
    markdownTable(['Template Type', 'Label'], templateRows),
    '',
    '## Feature-Matrix',
    '',
    markdownTable(['Feature', 'Label', ...TEMPLATE_TYPES], matrixRows),
    '',
    '## Scanner-Aktionen',
    '',
    'Scanner-Aktionen werden vor dem Speichern normalisiert und gegen diese Matrix validiert.',
    '',
    markdownTable(['Aktion', 'Feature', 'Label', 'Blockierter Grund'], actionRows),
    '',
    '## Scanner-Aliase',
    '',
    'Diese Aliase erlauben sprechende Aktionsnamen in Edge Functions oder späteren Clients, ohne die interne Scanner-Aktion zu duplizieren.',
    '',
    markdownTable(['Alias', 'Normalisierte Aktion'], aliasRows),
    ''
  ].join('\n')}\n`;
}

const content = buildDocument();

if (checkMode) {
  if (!fs.existsSync(docPath)) {
    console.error('docs/TEMPLATE_FEATURE_MATRIX.md fehlt. Bitte Generator ohne --check ausführen.');
    process.exit(1);
  }

  const existingContent = fs.readFileSync(docPath, 'utf8');

  if (existingContent !== content) {
    console.error('docs/TEMPLATE_FEATURE_MATRIX.md ist nicht aktuell. Bitte Generator ohne --check ausführen.');
    process.exit(1);
  }

  console.log('Template-Feature-Dokumentation ist aktuell.');
} else {
  fs.writeFileSync(docPath, content, 'utf8');
  console.log('docs/TEMPLATE_FEATURE_MATRIX.md wurde erzeugt.');
}
