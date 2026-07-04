export const WALLET_CARD_EMBLEMS = {
  neutral: {
    key: 'neutral_couple',
    label: 'Mann und Frau',
    description: 'Standard-Emblem vor dem Initial-Scan',
    fileName: 'neutral-couple.png',
    publicPath: '/assets/wallet-emblems/default/neutral-couple.png',
    storagePath: 'default/neutral-couple.png'
  },
  male: {
    key: 'male_gentleman',
    label: 'Mann',
    description: 'Emblem für männliche Karteninhaber',
    fileName: 'male-gentleman.png',
    publicPath: '/assets/wallet-emblems/default/male-gentleman.png',
    storagePath: 'default/male-gentleman.png'
  },
  female: {
    key: 'female_lady',
    label: 'Frau',
    description: 'Emblem für weibliche Karteninhaber',
    fileName: 'female-lady.png',
    publicPath: '/assets/wallet-emblems/default/female-lady.png',
    storagePath: 'default/female-lady.png'
  }
};

export const WALLET_CARD_EMBLEM_BY_KEY = Object.fromEntries(
  Object.values(WALLET_CARD_EMBLEMS).map((emblem) => [emblem.key, emblem])
);

export function resolveCardEmblem(cardInstance = {}) {
  if (!cardInstance?.demographics_collected || !cardInstance?.customer_gender) {
    return WALLET_CARD_EMBLEMS.neutral.key;
  }

  if (cardInstance.customer_gender === 'male') {
    return WALLET_CARD_EMBLEMS.male.key;
  }

  if (cardInstance.customer_gender === 'female') {
    return WALLET_CARD_EMBLEMS.female.key;
  }

  return WALLET_CARD_EMBLEMS.neutral.key;
}

export function cardEmblemMeta(cardInstance = {}) {
  return WALLET_CARD_EMBLEM_BY_KEY[resolveCardEmblem(cardInstance)] || WALLET_CARD_EMBLEMS.neutral;
}

export function cardEmblemImageUrl(cardInstance = {}, { preferResolvedUrl = true, fallbackUrl = '' } = {}) {
  const resolvedUrl = String(cardInstance?.resolved_emblem_url || '').trim();

  if (preferResolvedUrl && /^https?:\/\//i.test(resolvedUrl)) {
    return resolvedUrl;
  }

  return cardEmblemMeta(cardInstance).publicPath || fallbackUrl;
}
