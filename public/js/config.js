import { isPublishedStaticPage, pageUrl } from './path.js';

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

  if (!isPublishedStaticPage()) {
    const response = await fetch('/api/config').catch(() => null);

    if (response?.ok) {
      cachedConfig = await response.json();
    }
  }

  if (!cachedConfig) {
    const staticResponse = await fetch(pageUrl('config.public.json'), { cache: 'no-store' });

    if (!staticResponse.ok) {
      throw new Error('Konfiguration konnte nicht geladen werden.');
    }

    cachedConfig = await staticResponse.json();
  }

  if (!isConfigured(cachedConfig?.supabase?.url) || !isConfigured(cachedConfig?.supabase?.anonKey)) {
    throw new Error('Supabase ist noch nicht konfiguriert. Bitte in config.json supabase.url und supabase.anonKey eintragen und die App über http://localhost:3000 öffnen.');
  }

  return cachedConfig;
}

export function getCachedConfig() {
  return cachedConfig;
}

export function appUrl(path) {
  const rawPath = String(path || '');

  if (/^https?:\/\//i.test(rawPath)) {
    return rawPath;
  }

  if (isPublishedStaticPage()) {
    return pageUrl(rawPath);
  }

  const baseUrl = cachedConfig?.app?.baseUrl || window.location.origin;
  return new URL(rawPath, baseUrl).toString();
}

export function apiUrl(path) {
  const rawPath = String(path || '');

  if (isPublishedStaticPage()) {
    const qrMatch = rawPath.match(/^\/api\/qrcode\?(.+)$/);

    if (qrMatch) {
      const params = new URLSearchParams(qrMatch[1]);
      const text = params.get('text') || '';
      return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(text)}`;
    }
  }

  const apiBaseUrl = cachedConfig?.app?.apiBaseUrl;
  const baseUrl = apiBaseUrl || (isPublishedStaticPage() ? pageUrl('.') : window.location.origin);
  const normalizedPath = isPublishedStaticPage() && !apiBaseUrl
    ? rawPath.replace(/^\/+/, '')
    : rawPath;

  return new URL(normalizedPath, baseUrl).toString();
}

export function edgeFunctionUrl(functionName) {
  const supabaseUrl = cachedConfig?.supabase?.url?.replace(/\/$/, '');

  if (!supabaseUrl) {
    return '';
  }

  return `${supabaseUrl}/functions/v1/${String(functionName || '').replace(/^\/+/, '')}`;
}
