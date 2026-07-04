let cachedConfig = null;

function isConfigured(value) {
  return Boolean(value)
    && !String(value).includes('YOUR_')
    && !String(value).includes('example')
    && !String(value).includes('PROJECT_REF');
}

export async function loadPublicConfig() {
  if (cachedConfig) {
    return cachedConfig;
  }

  if (window.location.protocol === 'file:') {
    throw new Error('Bitte die App nicht per Doppelklick als index.html öffnen. Starte den lokalen Server und oeffne http://localhost:3000.');
  }

  const response = await fetch('/api/config');

  if (!response.ok) {
    throw new Error('Konfiguration konnte nicht geladen werden.');
  }

  cachedConfig = await response.json();

  if (!isConfigured(cachedConfig?.supabase?.url) || !isConfigured(cachedConfig?.supabase?.anonKey)) {
    throw new Error('Supabase ist noch nicht konfiguriert. Bitte in config.json supabase.url und supabase.anonKey eintragen und die App über http://localhost:3000 öffnen.');
  }

  return cachedConfig;
}

export function getCachedConfig() {
  return cachedConfig;
}

export function appUrl(path) {
  const baseUrl = cachedConfig?.app?.baseUrl || window.location.origin;
  return new URL(path, baseUrl).toString();
}

export function apiUrl(path) {
  const baseUrl = cachedConfig?.app?.apiBaseUrl || window.location.origin;
  return new URL(path, baseUrl).toString();
}
