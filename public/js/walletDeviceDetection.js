const SAMSUNG_HINTS = [
  'samsung',
  'sm-',
  'samsungbrowser',
  'galaxy'
];

function text(value) {
  return String(value || '').toLowerCase();
}

function normalizeInput(input = {}) {
  const navigatorLike = typeof navigator === 'undefined' ? {} : navigator;

  return {
    userAgent: text(input.userAgent ?? navigatorLike.userAgent),
    platform: text(input.platform ?? navigatorLike.userAgentData?.platform ?? navigatorLike.platform),
    brands: input.brands ?? navigatorLike.userAgentData?.brands ?? [],
    maxTouchPoints: Number(input.maxTouchPoints ?? navigatorLike.maxTouchPoints ?? 0)
  };
}

function brandsInclude(brands, needle) {
  return Array.isArray(brands)
    && brands.some((entry) => text(entry?.brand || entry).includes(needle));
}

export function detectWalletDevice(input = {}) {
  const details = normalizeInput(input);
  const isAndroid = details.userAgent.includes('android') || details.platform.includes('android');
  const isIpadOsDesktopMode = details.platform.includes('mac') && details.maxTouchPoints > 1;
  const isAppleMobile = /iphone|ipad|ipod/.test(details.userAgent) || isIpadOsDesktopMode;
  const hasSamsungHint = SAMSUNG_HINTS.some((hint) => details.userAgent.includes(hint) || details.platform.includes(hint))
    || brandsInclude(details.brands, 'samsung');

  if (isAppleMobile) {
    return {
      wallet: 'apple',
      device: isIpadOsDesktopMode || details.userAgent.includes('ipad') ? 'ipad' : 'iphone',
      confidence: 'high',
      reason: 'apple_mobile'
    };
  }

  if (isAndroid && hasSamsungHint) {
    return {
      wallet: 'samsung',
      device: 'samsung_android',
      confidence: 'high',
      reason: 'samsung_android'
    };
  }

  if (isAndroid) {
    return {
      wallet: 'google',
      device: 'android',
      confidence: 'medium',
      reason: 'android_non_samsung'
    };
  }

  return {
    wallet: 'choice',
    device: 'desktop_or_unknown',
    confidence: 'low',
    reason: 'manual_choice_required'
  };
}

export function preferredWallet(input = {}) {
  return detectWalletDevice(input).wallet;
}
