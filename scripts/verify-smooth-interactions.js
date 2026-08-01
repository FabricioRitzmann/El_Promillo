import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const editor = read('public/js/editor.js');
const account = read('public/js/account.js');
const scanner = read('public/js/scanner.js');
const ui = read('public/js/ui.js');
const styles = read('public/styles.css');
const pages = ['account.html', 'dashboard.html', 'editor.html', 'scanner.html']
  .map((name) => read(`public/${name}`));

function assertIncludes(source, expected, label) {
  if (!source.includes(expected)) {
    throw new Error(`${label}: Erwarteter Inhalt fehlt: ${expected}`);
  }
}

function assertExcludes(source, expected, label) {
  if (source.includes(expected)) {
    throw new Error(`${label}: Unerwünschter Inhalt gefunden: ${expected}`);
  }
}

assertIncludes(editor, "templateForm?.addEventListener('input', scheduleEditorPreview)", 'Editor-Vorschau');
assertExcludes(editor, "templateForm?.addEventListener('input', updateConditionalTemplateFields)", 'Editor-Vorschau');
assertIncludes(editor, 'editorPreviewFrame = requestAnimationFrame', 'Editor-Vorschau');
assertIncludes(editor, 'toggleSignature === optionalFeatureToggleSignature', 'Editor-Schalter');
assertIncludes(editor, 'templateSubmitButton.dataset.idleLabel = submitLabel', 'Editor-Speicherbutton');

const conditionalStart = editor.indexOf('function updateConditionalTemplateFields()');
const conditionalEnd = editor.indexOf('function handleOptionalFeatureToggle', conditionalStart);
const conditionalBody = editor.slice(conditionalStart, conditionalEnd);
assertExcludes(conditionalBody, 'renderWalletNotificationsPanel()', 'Editor-Eingaben');

assertIncludes(ui, 'export function setButtonBusy', 'Speicherzustand');
assertIncludes(ui, "type === 'success'", 'Statushinweise');
assertIncludes(ui, 'messageSlotTimers.set', 'Statushinweise');
assertIncludes(account, 'setButtonBusy(businessSaveButton, true)', 'Kontospeicherung');
assertIncludes(scanner, 'state.actionPending = true', 'Scanner-Speicherung');
assertIncludes(styles, '@view-transition', 'Seitenübergang');
assertIncludes(styles, 'backdrop-filter: none', 'Mobile Rendering');
assertIncludes(styles, '@media (prefers-reduced-motion: reduce)', 'Barrierearme Bewegung');

pages.forEach((page, index) => {
  assertIncludes(page, 'data-message-slot="true"', `Statusbereich ${index + 1}`);
});

console.log('Speicherzustände, Vorschau-Updates und Seitenübergänge sind auf flüssige Bedienung optimiert.');
