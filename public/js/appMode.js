const CUSTOMER_RENDER_HOSTS = new Set([
  'el-promillo.ch',
  'www.el-promillo.ch',
  'el-promillo-j1n0.onrender.com'
]);

const PHONE_MAX_SHORT_SIDE = 767;

function hostName(locationLike = window.location) {
  return String(locationLike?.hostname || '').toLowerCase();
}

export function isGitHubDeveloperFrontend(locationLike = window.location) {
  const host = hostName(locationLike);
  const pathname = String(locationLike?.pathname || '');

  return host.endsWith('github.io') || pathname.includes('/El_Promillo/');
}

export function isRenderCustomerFrontend(locationLike = window.location) {
  const host = hostName(locationLike);

  if (isGitHubDeveloperFrontend(locationLike)) {
    return false;
  }

  return CUSTOMER_RENDER_HOSTS.has(host) || host.endsWith('.onrender.com');
}

function isTabletLikeDevice() {
  const userAgent = navigator.userAgent || '';
  const platform = navigator.platform || '';
  const maxTouchPoints = Number(navigator.maxTouchPoints || 0);

  return /ipad|tablet|kindle|silk/i.test(userAgent)
    || (/android/i.test(userAgent) && !/mobile/i.test(userAgent))
    || (/macintosh/i.test(platform) && maxTouchPoints > 1);
}

export function isHandheldPhone() {
  if (isTabletLikeDevice()) {
    return false;
  }

  const userAgent = navigator.userAgent || '';
  const media = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const viewportShortSide = Math.min(
    window.innerWidth || screen.width || PHONE_MAX_SHORT_SIDE + 1,
    window.innerHeight || screen.height || PHONE_MAX_SHORT_SIDE + 1
  );

  return /mobile|iphone|ipod|windows phone/i.test(userAgent)
    || (/android/i.test(userAgent) && /mobile/i.test(userAgent))
    || (media && viewportShortSide <= PHONE_MAX_SHORT_SIDE);
}

export function isRenderPhoneScannerMode() {
  return isRenderCustomerFrontend() && isHandheldPhone();
}

export function applyAppModeClass() {
  document.documentElement.classList.toggle('scanner-only-mode', isRenderPhoneScannerMode());
}

applyAppModeClass();
window.addEventListener('resize', applyAppModeClass, { passive: true });
