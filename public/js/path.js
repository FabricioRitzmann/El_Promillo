function cleanPath(path = '') {
  return String(path || '').replace(/^\/+/, '');
}

function pageBaseUrl() {
  return new URL('./', window.location.href);
}

export function pageUrl(path = '') {
  return new URL(cleanPath(path), pageBaseUrl()).toString();
}

export function pagePath(path = '') {
  const url = new URL(cleanPath(path), pageBaseUrl());
  return `${url.pathname}${url.search}${url.hash}`;
}

export function assetPath(path = '') {
  return pagePath(path);
}

export function isPublishedStaticPage() {
  return window.location.hostname.endsWith('github.io')
    || window.location.protocol === 'https:' && window.location.pathname.includes('/El_Promillo/');
}
