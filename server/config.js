import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const examplePath = path.join(rootDir, 'config.example.json');
const localPath = path.join(rootDir, 'config.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function mergeDeep(base, override) {
  const output = { ...base };

  for (const [key, value] of Object.entries(override || {})) {
    if (value === undefined) {
      continue;
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      output[key] = mergeDeep(output[key] || {}, value);
    } else {
      output[key] = value;
    }
  }

  return output;
}

function configuredEnv(name) {
  const value = process.env[name];

  return value === undefined || value === null || value === '' ? undefined : value;
}

function numericEnv(name) {
  const value = configuredEnv(name);
  const numeric = Number(value);

  return Number.isFinite(numeric) ? numeric : undefined;
}

function listEnv(name) {
  const value = configuredEnv(name);

  return value
    ? value.split(',').map((entry) => entry.trim()).filter(Boolean)
    : undefined;
}

function withPath(baseUrl, pathname) {
  if (!baseUrl) {
    return undefined;
  }

  const relativePath = String(pathname || '').replace(/^\/+/, '');
  return new URL(relativePath, String(baseUrl).replace(/\/?$/, '/')).toString();
}

function functionsBaseUrl(supabaseUrl) {
  if (!supabaseUrl) {
    return undefined;
  }

  try {
    return `${new URL(supabaseUrl).origin}/functions/v1`;
  } catch {
    return undefined;
  }
}

function applyEnvironmentOverrides(config) {
  const appPublicBaseUrl = configuredEnv('APP_PUBLIC_BASE_URL')
    || configuredEnv('APP_BASE_URL')
    || configuredEnv('RENDER_EXTERNAL_URL');
  const appApiBaseUrl = configuredEnv('APP_API_BASE_URL')
    || configuredEnv('API_BASE_URL')
    || appPublicBaseUrl;
  const supabaseUrl = configuredEnv('SUPABASE_URL');
  const supabaseFunctionBaseUrl = configuredEnv('SUPABASE_FUNCTION_BASE_URL')
    || configuredEnv('SUPABASE_FUNCTIONS_BASE_URL')
    || functionsBaseUrl(supabaseUrl);

  return mergeDeep(config, {
    app: {
      baseUrl: appPublicBaseUrl,
      apiBaseUrl: appApiBaseUrl
    },
    publicUrls: {
      webAppDomain: appPublicBaseUrl,
      walletInstallPage: withPath(appPublicBaseUrl, '/claim.html'),
      appPublicBaseUrl,
      supabaseFunctionBaseUrl
    },
    server: {
      host: configuredEnv('HOST'),
      port: numericEnv('PORT'),
      corsOrigin: configuredEnv('CORS_ORIGIN') || appPublicBaseUrl
    },
    supabase: {
      url: supabaseUrl,
      anonKey: configuredEnv('SUPABASE_ANON_KEY'),
      serviceRoleKey: configuredEnv('SUPABASE_SERVICE_ROLE_KEY')
    },
    automation: {
      walletCronSecret: configuredEnv('WALLET_CRON_SECRET')
    },
    payment: {
      provider: configuredEnv('PAYMENT_PROVIDER'),
      checkoutBaseUrl: configuredEnv('PAYMENT_CHECKOUT_BASE_URL'),
      webhookSecret: configuredEnv('PAYMENT_WEBHOOK_SECRET')
    },
    googleWallet: {
      issuerId: configuredEnv('GOOGLE_WALLET_ISSUER_ID'),
      classSuffix: configuredEnv('GOOGLE_WALLET_CLASS_SUFFIX'),
      serviceAccountEmail: configuredEnv('GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL'),
      privateKey: configuredEnv('GOOGLE_WALLET_PRIVATE_KEY'),
      serviceAccountJson: configuredEnv('GOOGLE_WALLET_SERVICE_ACCOUNT_JSON'),
      origins: configuredEnv('GOOGLE_WALLET_ORIGINS')
    },
    appleWalletDirect: {
      teamId: configuredEnv('APPLE_TEAM_ID'),
      passTypeId: configuredEnv('APPLE_PASS_TYPE_ID'),
      wwdrCert: configuredEnv('APPLE_WWDR_CERT'),
      passCert: configuredEnv('APPLE_PASS_CERT'),
      passKey: configuredEnv('APPLE_PASS_KEY'),
      passKeyPassword: configuredEnv('APPLE_PASS_KEY_PASSWORD'),
      webServiceBaseUrl: configuredEnv('APPLE_WEB_SERVICE_BASE_URL'),
      apnsKeyId: configuredEnv('APPLE_APNS_KEY_ID'),
      apnsTeamId: configuredEnv('APPLE_APNS_TEAM_ID'),
      apnsAuthKey: configuredEnv('APPLE_APNS_AUTH_KEY')
    },
    deliveryRules: {
      businessDailyLimit: numericEnv('WALLET_BUSINESS_DAILY_LIMIT'),
      customerDailyLimit: numericEnv('WALLET_CUSTOMER_DAILY_LIMIT'),
      cardDailyLimit: numericEnv('WALLET_CARD_DAILY_LIMIT'),
      googleTextAndNotifyLimitPerPass24h: numericEnv('WALLET_GOOGLE_TEXT_AND_NOTIFY_LIMIT_PER_PASS_24H'),
      duplicateWindowMinutes: numericEnv('WALLET_DUPLICATE_WINDOW_MINUTES'),
      publicClaimRateLimit: numericEnv('WALLET_PUBLIC_CLAIM_RATE_LIMIT'),
      publicClaimRateLimitWindowSeconds: numericEnv('WALLET_PUBLIC_CLAIM_RATE_LIMIT_WINDOW_SECONDS'),
      recipientProcessingTimeoutMinutes: numericEnv('WALLET_RECIPIENT_PROCESSING_TIMEOUT_MINUTES'),
      queueProcessingTimeoutMinutes: numericEnv('WALLET_QUEUE_PROCESSING_TIMEOUT_MINUTES'),
      defaultTitle: configuredEnv('WALLET_DEFAULT_TITLE'),
      defaultMessage: configuredEnv('WALLET_DEFAULT_MESSAGE'),
      allowedTargets: listEnv('WALLET_ALLOWED_TARGETS')
    }
  });
}

export function getRootDir() {
  return rootDir;
}

export function loadConfig() {
  const exampleConfig = readJson(examplePath);
  const hasLocalConfig = fs.existsSync(localPath);
  const localConfig = hasLocalConfig ? readJson(localPath) : {};
  const config = applyEnvironmentOverrides(mergeDeep(exampleConfig, localConfig));

  return {
    ...config,
    hasLocalConfig
  };
}

export function getPublicConfig(config) {
  const deliveryRules = config.deliveryRules || {};
  const positiveInteger = (value, fallback) => {
    const numeric = Number(value);

    return Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : fallback;
  };

  return {
    app: {
      name: config.app.name,
      baseUrl: config.app.baseUrl,
      apiBaseUrl: config.app.apiBaseUrl
    },
    supabase: {
      url: config.supabase.url,
      anonKey: config.supabase.anonKey
    },
    deliveryRules: {
      businessDailyLimit: positiveInteger(deliveryRules.businessDailyLimit, 500),
      customerDailyLimit: positiveInteger(deliveryRules.customerDailyLimit, 12),
      cardDailyLimit: positiveInteger(deliveryRules.cardDailyLimit, 6),
      googleTextAndNotifyLimitPerPass24h: positiveInteger(deliveryRules.googleTextAndNotifyLimitPerPass24h, 3),
      duplicateWindowMinutes: positiveInteger(deliveryRules.duplicateWindowMinutes, 10),
      publicClaimRateLimit: positiveInteger(deliveryRules.publicClaimRateLimit, 80),
      publicClaimRateLimitWindowSeconds: positiveInteger(deliveryRules.publicClaimRateLimitWindowSeconds, 900),
      defaultTitle: deliveryRules.defaultTitle || '',
      defaultMessage: deliveryRules.defaultMessage || '',
      allowedTargets: Array.isArray(deliveryRules.allowedTargets)
        ? deliveryRules.allowedTargets
        : []
    }
  };
}

export function resolveProjectPath(maybeRelativePath) {
  if (!maybeRelativePath) {
    return '';
  }

  return path.isAbsolute(maybeRelativePath)
    ? maybeRelativePath
    : path.join(rootDir, maybeRelativePath);
}

export function looksConfigured(value) {
  const text = String(value || '');
  const normalized = text.toUpperCase();

  return Boolean(text)
    && !normalized.startsWith('YOUR_')
    && !normalized.includes('YOUR_')
    && !normalized.includes('CHANGE_THIS')
    && !normalized.includes('PROJECT_REF')
    && !normalized.includes('PLACEHOLDER')
    && !normalized.includes('SET_AS_');
}
