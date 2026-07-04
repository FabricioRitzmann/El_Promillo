import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const frontendMatrixPath = path.join(rootDir, 'public/js/templateFeatures.js');
const schemaPath = path.join(rootDir, 'supabase/schema.sql');

function extractTemplateFeatureFunction(schema) {
  const functionStart = schema.indexOf('create or replace function public.template_feature_allowed');

  if (functionStart === -1) {
    throw new Error('SQL-Funktion public.template_feature_allowed(...) wurde nicht gefunden.');
  }

  const bodyMarker = schema.indexOf('as $$', functionStart);
  const bodyStart = schema.indexOf('\n', bodyMarker) + 1;
  const bodyEnd = schema.indexOf('$$;', bodyStart);

  if (bodyMarker === -1 || bodyStart === 0 || bodyEnd === -1) {
    throw new Error('Body der SQL-Funktion public.template_feature_allowed(...) konnte nicht gelesen werden.');
  }

  return schema.slice(bodyStart, bodyEnd);
}

function extractSqlFunction(schema, functionName) {
  const functionStart = schema.indexOf(`create or replace function public.${functionName}`);

  if (functionStart === -1) {
    throw new Error(`SQL-Funktion public.${functionName}(...) wurde nicht gefunden.`);
  }

  const bodyMarker = schema.indexOf('as $$', functionStart);
  const bodyStart = schema.indexOf('\n', bodyMarker) + 1;
  const bodyEnd = schema.indexOf('$$;', bodyStart);

  if (bodyMarker === -1 || bodyStart === 0 || bodyEnd === -1) {
    throw new Error(`Body der SQL-Funktion public.${functionName}(...) konnte nicht gelesen werden.`);
  }

  return schema.slice(bodyStart, bodyEnd);
}

function extractFeatureBranch(functionSource, featureName) {
  const escapedFeatureName = featureName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = functionSource.match(new RegExp(`when '${escapedFeatureName}' then([\\s\\S]*?)(?=\\n\\s*when |\\n\\s*else)`, 'm'));

  return match?.[1] || null;
}

function assertIncludes(source, needle, message) {
  if (!source.includes(needle)) {
    throw new Error(message);
  }
}

const { OPTIONAL_FEATURE, SCANNER_ACTIONS, TEMPLATE_FEATURES } = await import(pathToFileURL(frontendMatrixPath));
const schema = fs.readFileSync(schemaPath, 'utf8');
const functionSource = extractTemplateFeatureFunction(schema);
const eventFunctionSource = extractSqlFunction(schema, 'card_event_required_feature');
const templateTypes = Object.keys(TEMPLATE_FEATURES);
const featureNames = Object.keys(TEMPLATE_FEATURES.generic_card);

for (const templateType of templateTypes) {
  assertIncludes(
    schema,
    `'${templateType}'`,
    `SQL-Schema kennt den Template-Typ ${templateType} nicht.`
  );
}

for (const featureName of featureNames) {
  const branch = extractFeatureBranch(functionSource, featureName);

  if (!branch) {
    throw new Error(`SQL-Funktion template_feature_allowed(...) hat keinen Zweig für Feature ${featureName}.`);
  }

  const trueTemplateTypes = templateTypes.filter((templateType) => TEMPLATE_FEATURES[templateType][featureName] === true);
  const optionalTemplateTypes = templateTypes.filter((templateType) => TEMPLATE_FEATURES[templateType][featureName] === OPTIONAL_FEATURE);
  const falseTemplateTypes = templateTypes.filter((templateType) => TEMPLATE_FEATURES[templateType][featureName] === false);
  const everyTemplateHasFeature = trueTemplateTypes.length === templateTypes.length && optionalTemplateTypes.length === 0;

  if (everyTemplateHasFeature) {
    assertIncludes(
      branch,
      'true',
      `SQL-Feature ${featureName} sollte für alle Template-Typen erlaubt sein.`
    );

    if (featureName === 'notifications') {
      assertIncludes(
        branch,
        "p_settings->>'notificationsEnabled'",
        'SQL-Feature notifications muss settings.notificationsEnabled als explizites Opt-out respektieren.'
      );
      assertIncludes(
        branch,
        "p_settings->'features'->>'notifications'",
        'SQL-Feature notifications muss settings.features.notifications als explizites Opt-out respektieren.'
      );
    }

    continue;
  }

  for (const templateType of falseTemplateTypes) {
    if (branch.includes(`'${templateType}'`)) {
      throw new Error(`SQL-Feature ${featureName} enthält ${templateType}, obwohl die zentrale Matrix es verbietet.`);
    }
  }

  for (const templateType of trueTemplateTypes) {
    assertIncludes(
      branch,
      `'${templateType}'`,
      `SQL-Feature ${featureName} erlaubt ${templateType} nicht, obwohl die zentrale Matrix es verlangt.`
    );
  }

  for (const templateType of optionalTemplateTypes) {
    assertIncludes(
      branch,
      `'${templateType}'`,
      `SQL-Feature ${featureName} enthält den optionalen Template-Typ ${templateType} nicht.`
    );
    assertIncludes(
      branch,
      `settings_feature_enabled(coalesce(p_settings, '{}'::jsonb), '${featureName}')`,
      `SQL-Feature ${featureName} prüft optionale Aktivierung nicht über settings_feature_enabled(...).`
    );
  }
}

for (const [actionName, actionConfig] of Object.entries(SCANNER_ACTIONS)) {
  assertIncludes(
    eventFunctionSource,
    `when '${actionName}' then '${actionConfig.feature}'`,
    `SQL-Funktion card_event_required_feature(...) mappt Scanner-Aktion ${actionName} nicht auf Feature ${actionConfig.feature}.`
  );
}

assertIncludes(
  eventFunctionSource,
  "when 'balance-topup' then 'balance'",
  'SQL-Funktion card_event_required_feature(...) mappt balance-topup nicht auf balance.'
);

console.log('SQL template_feature_allowed(...) und card_event_required_feature(...) decken die zentrale Template-Feature-Matrix ab.');
