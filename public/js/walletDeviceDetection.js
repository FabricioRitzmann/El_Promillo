function text(value) {
  return String(value || '').toLowerCase();
}

function normalizeInput(input = {}) {
  const navigatorLike = typeof navigator === 'undefined' ? {} : navigator;

  return {
    userAgent: text(input.userAgent ?? navigatorLike.userAgent),
    platform: text(input.platform ?? navigatorLike.userAgentData?.platform ?? navigatorLike.platform),
    maxTouchPoints: Number(input.maxTouchPoints ?? navigatorLike.maxTouchPoints ?? 0)
  };
}

export function detectWalletDevice(input = {}) {
  const details = normalizeInput(input);
  const isAndroid = details.userAgent.includes('android') || details.platform.includes('android');
  const isIpadOsDesktopMode = details.platform.includes('mac') && details.maxTouchPoints > 1;
  const isAppleMobile = /iphone|ipad|ipod/.test(details.userAgent) || isIpadOsDesktopMode;

  if (isAppleMobile) {
    return {
      wallet: 'apple',
      device: isIpadOsDesktopMode || details.userAgent.includes('ipad') ? 'ipad' : 'iphone',
      confidence: 'high',
      reason: 'apple_mobile'
    };
  }

  if (isAndroid) {
    return {
      wallet: 'google',
      device: 'android',
      confidence: 'medium',
      reason: 'android_google_wallet'
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
