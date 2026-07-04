export const OPTIONAL_FEATURE = 'optional';

export const TEMPLATE_FEATURES = {
  stamp_card: {
    stamps: true,
    streak: false,
    vip: false,
    balance: false,
    cloakroom: OPTIONAL_FEATURE,
    qrPdf: true,
    notifications: true,
    customFields: false,
    visit: false,
    checkin: false,
    redemption: false,
    membership: false,
    eventBackgroundImage: false
  },
  streak_card: {
    stamps: false,
    streak: true,
    vip: false,
    balance: false,
    cloakroom: OPTIONAL_FEATURE,
    qrPdf: true,
    notifications: true,
    customFields: false,
    visit: false,
    checkin: false,
    redemption: false,
    membership: false,
    eventBackgroundImage: false
  },
  vip_card: {
    stamps: false,
    streak: false,
    vip: true,
    balance: OPTIONAL_FEATURE,
    cloakroom: OPTIONAL_FEATURE,
    qrPdf: true,
    notifications: true,
    customFields: true,
    visit: true,
    checkin: false,
    redemption: false,
    membership: false,
    eventBackgroundImage: false
  },
  balance_card: {
    stamps: false,
    streak: false,
    vip: false,
    balance: true,
    cloakroom: OPTIONAL_FEATURE,
    qrPdf: true,
    notifications: true,
    customFields: false,
    visit: false,
    checkin: false,
    redemption: false,
    membership: false,
    eventBackgroundImage: false
  },
  cloakroom_card: {
    stamps: false,
    streak: false,
    vip: false,
    balance: false,
    cloakroom: true,
    qrPdf: true,
    notifications: true,
    customFields: false,
    visit: false,
    checkin: false,
    redemption: false,
    membership: false,
    eventBackgroundImage: false
  },
  generic_card: {
    stamps: false,
    streak: false,
    vip: false,
    balance: OPTIONAL_FEATURE,
    cloakroom: OPTIONAL_FEATURE,
    qrPdf: true,
    notifications: true,
    customFields: true,
    visit: true,
    checkin: false,
    redemption: false,
    membership: false,
    eventBackgroundImage: false
  },
  event_card: {
    stamps: false,
    streak: false,
    vip: false,
    balance: false,
    cloakroom: OPTIONAL_FEATURE,
    qrPdf: true,
    notifications: true,
    customFields: true,
    visit: false,
    checkin: true,
    redemption: false,
    membership: false,
    eventBackgroundImage: true
  },
  coupon_card: {
    stamps: false,
    streak: false,
    vip: false,
    balance: false,
    cloakroom: OPTIONAL_FEATURE,
    qrPdf: true,
    notifications: true,
    customFields: false,
    visit: false,
    checkin: false,
    redemption: true,
    membership: false,
    eventBackgroundImage: false
  },
  membership_card: {
    stamps: false,
    streak: false,
    vip: OPTIONAL_FEATURE,
    balance: false,
    cloakroom: OPTIONAL_FEATURE,
    qrPdf: true,
    notifications: true,
    customFields: true,
    visit: false,
    checkin: false,
    redemption: false,
    membership: true,
    eventBackgroundImage: false
  },
  club_card: {
    stamps: false,
    streak: false,
    vip: OPTIONAL_FEATURE,
    balance: OPTIONAL_FEATURE,
    cloakroom: OPTIONAL_FEATURE,
    qrPdf: true,
    notifications: true,
    customFields: true,
    visit: true,
    checkin: false,
    redemption: OPTIONAL_FEATURE,
    membership: OPTIONAL_FEATURE,
    eventBackgroundImage: false
  }
} as const;

export const CLUB_FEATURE_DEFAULTS = {
  vip: false,
  balance: false,
  cloakroom: false,
  coupon: false,
  membership: false
} as const;

export const CLUB_FEATURE_BY_MATRIX_FEATURE = {
  vip: 'vip',
  balance: 'balance',
  cloakroom: 'cloakroom',
  redemption: 'coupon',
  membership: 'membership'
} as const;

export const SCANNER_ACTIONS = {
  'stamp-plus': {
    feature: 'stamps',
    label: 'Stempel hinzufügen',
    blockedReason: 'Diese Karte unterstützt keine Stempel-Funktion.'
  },
  'stamp-minus': {
    feature: 'stamps',
    label: 'Stempel entfernen',
    blockedReason: 'Diese Karte unterstützt keine Stempel-Funktion.'
  },
  'stamp-redeem': {
    feature: 'stamps',
    label: 'Volle Stempelkarte einlösen',
    blockedReason: 'Diese Karte unterstützt keine Stempel-Funktion.'
  },
  'streak-plus': {
    feature: 'streak',
    label: 'Streak erhöhen',
    blockedReason: 'Diese Karte unterstützt keine Streak-Funktion.'
  },
  'streak-reset': {
    feature: 'streak',
    label: 'Streak zurücksetzen',
    blockedReason: 'Diese Karte unterstützt keine Streak-Funktion.'
  },
  'streak-complete': {
    feature: 'streak',
    label: 'Streak-Ziel erfüllen',
    blockedReason: 'Diese Karte unterstützt keine Streak-Funktion.'
  },
  'vip-update': {
    feature: 'vip',
    label: 'VIP-Status aendern',
    blockedReason: 'Diese Karte unterstützt keine VIP-Funktion.'
  },
  'vip-benefit-redeem': {
    feature: 'vip',
    label: 'VIP-Vorteil einlösen',
    blockedReason: 'Diese Karte unterstützt keine VIP-Funktion.'
  },
  'balance-redeem': {
    feature: 'balance',
    label: 'Guthaben abbuchen',
    blockedReason: 'Diese Karte unterstützt keine Guthaben-Funktion.'
  },
  'balance-adjust': {
    feature: 'balance',
    label: 'Guthaben korrigieren',
    blockedReason: 'Diese Karte unterstützt keine Guthaben-Funktion.'
  },
  'cloakroom-toggle': {
    feature: 'cloakroom',
    label: 'Garderobe umschalten',
    blockedReason: 'Diese Karte unterstützt keine Garderoben-Funktion.'
  },
  visit: {
    feature: 'visit',
    label: 'Besuch erfassen',
    blockedReason: 'Diese Karte unterstützt keine Besuchs-Funktion.'
  },
  checkin: {
    feature: 'checkin',
    label: 'Check-in',
    blockedReason: 'Diese Karte unterstützt keine Check-in-Funktion.'
  },
  'event-checkout': {
    feature: 'checkin',
    label: 'Check-out',
    blockedReason: 'Diese Karte unterstützt keine Check-in-Funktion.'
  },
  'event-ticket-use': {
    feature: 'checkin',
    label: 'Ticket als verwendet markieren',
    blockedReason: 'Diese Karte unterstützt keine Check-in-Funktion.'
  },
  redeem: {
    feature: 'redemption',
    label: 'Einlösen',
    blockedReason: 'Diese Karte unterstützt keine Einlöse-Funktion.'
  },
  'membership-check': {
    feature: 'membership',
    label: 'Mitgliedschaft prüfen',
    blockedReason: 'Diese Karte unterstützt keine Mitgliedschafts-Funktion.'
  },
  'membership-status-update': {
    feature: 'membership',
    label: 'Mitgliedsstatus aendern',
    blockedReason: 'Diese Karte unterstützt keine Mitgliedschafts-Funktion.'
  },
  'membership-extend': {
    feature: 'membership',
    label: 'Mitgliedschaft verlängern',
    blockedReason: 'Diese Karte unterstützt keine Mitgliedschafts-Funktion.'
  }
} as const;

export const SCANNER_ACTION_ALIASES = {
  add_stamp: 'stamp-plus',
  increment_stamp: 'stamp-plus',
  remove_stamp: 'stamp-minus',
  decrement_stamp: 'stamp-minus',
  redeem_stamp: 'stamp-redeem',
  redeem_stamp_card: 'stamp-redeem',
  mark_stamp_card_redeemed: 'stamp-redeem',
  increment_streak: 'streak-plus',
  reset_streak: 'streak-reset',
  complete_streak: 'streak-complete',
  fulfill_streak_goal: 'streak-complete',
  mark_streak_goal_complete: 'streak-complete',
  update_vip: 'vip-update',
  change_vip_level: 'vip-update',
  redeem_vip_benefit: 'vip-benefit-redeem',
  redeem_benefit: 'vip-benefit-redeem',
  use_vip_benefit: 'vip-benefit-redeem',
  redeem_balance: 'balance-redeem',
  adjust_balance: 'balance-adjust',
  correct_balance: 'balance-adjust',
  manual_adjust_balance: 'balance-adjust',
  redeem_coupon: 'redeem',
  mark_coupon_used: 'redeem',
  check_in: 'checkin',
  event_checkin: 'checkin',
  check_out: 'event-checkout',
  event_checkout: 'event-checkout',
  ticket_used: 'event-ticket-use',
  use_ticket: 'event-ticket-use',
  mark_ticket_used: 'event-ticket-use',
  mark_event_ticket_used: 'event-ticket-use',
  membership_check: 'membership-check',
  check_membership: 'membership-check',
  update_membership_status: 'membership-status-update',
  change_membership_status: 'membership-status-update',
  extend_membership: 'membership-extend',
  renew_membership: 'membership-extend',
  record_visit: 'visit',
  cloakroom_dropoff: 'cloakroom-toggle',
  cloakroom_pickup: 'cloakroom-toggle'
} as const;

export type TemplateType = keyof typeof TEMPLATE_FEATURES;
export type FeatureName = keyof typeof TEMPLATE_FEATURES.generic_card;
export type ScannerActionName = keyof typeof SCANNER_ACTIONS;

const legacyTemplateTypeMap: Record<string, TemplateType> = {
  stamp: 'stamp_card',
  streak: 'streak_card',
  vip: 'vip_card',
  generic: 'generic_card'
};

export function normalizeTemplateType(templateOrType: unknown): TemplateType {
  const rawType = typeof templateOrType === 'string'
    ? templateOrType
    : (templateOrType as { template_type?: string; card_type?: string } | null)?.template_type
      || (templateOrType as { card_type?: string } | null)?.card_type;
  const type = String(rawType || 'generic_card');

  if (type in TEMPLATE_FEATURES) {
    return type as TemplateType;
  }

  return legacyTemplateTypeMap[type] || 'generic_card';
}

export function templateSettings(template: unknown): Record<string, unknown> {
  const settings = (template as { settings?: unknown } | null)?.settings;
  return settings && typeof settings === 'object' && !Array.isArray(settings)
    ? settings as Record<string, unknown>
    : {};
}

export function clubFeatures(template: unknown): Record<keyof typeof CLUB_FEATURE_DEFAULTS, boolean> {
  const templateObject = template && typeof template === 'object'
    ? template as Record<string, unknown>
    : {};
  const settings = templateSettings(template);
  const settingsClubFeatures = settings.club_features && typeof settings.club_features === 'object' && !Array.isArray(settings.club_features)
    ? settings.club_features as Record<string, unknown>
    : settings.clubFeatures && typeof settings.clubFeatures === 'object' && !Array.isArray(settings.clubFeatures)
      ? settings.clubFeatures as Record<string, unknown>
      : {};
  const source = templateObject.club_features && typeof templateObject.club_features === 'object' && !Array.isArray(templateObject.club_features)
    ? templateObject.club_features as Record<string, unknown>
    : settingsClubFeatures;

  return Object.fromEntries(
    Object.entries(CLUB_FEATURE_DEFAULTS)
      .map(([featureName, defaultValue]) => [featureName, Boolean(source[featureName] ?? defaultValue)])
  ) as Record<keyof typeof CLUB_FEATURE_DEFAULTS, boolean>;
}

export function featureEnabled(templateOrType: unknown, featureName: FeatureName, settings: Record<string, unknown> | null = null): boolean {
  const templateType = normalizeTemplateType(templateOrType);
  const features = TEMPLATE_FEATURES[templateType];
  const value = features[featureName];
  const resolvedSettings = settings || (typeof templateOrType === 'object' ? templateSettings(templateOrType) : {});
  const featureObject = resolvedSettings.features && typeof resolvedSettings.features === 'object'
    ? resolvedSettings.features as Record<string, unknown>
    : {};

  if (featureName === 'notifications' && (
    resolvedSettings.notificationsEnabled === false
      || featureObject.notifications === false
  )) {
    return false;
  }

  if (value === true) {
    return true;
  }

  if (value !== OPTIONAL_FEATURE) {
    return false;
  }

  if (templateType === 'club_card') {
    const clubFeatureName = CLUB_FEATURE_BY_MATRIX_FEATURE[featureName as keyof typeof CLUB_FEATURE_BY_MATRIX_FEATURE];

    if (clubFeatureName) {
      return clubFeatures({
        ...(typeof templateOrType === 'object' && templateOrType ? templateOrType as Record<string, unknown> : {}),
        settings: resolvedSettings
      })[clubFeatureName] === true;
    }
  }

  const enabledFeatures = Array.isArray(resolvedSettings.enabledFeatures)
    ? resolvedSettings.enabledFeatures
    : [];

  return Boolean(
    featureObject[featureName]
      || resolvedSettings[`${featureName}Enabled`]
      || enabledFeatures.includes(featureName)
  );
}

export function matrixError(featureName: FeatureName) {
  const label = {
    stamps: 'Stempel',
    streak: 'Streak',
    vip: 'VIP',
    balance: 'Guthaben',
    cloakroom: 'Garderoben',
    checkin: 'Check-in',
    redemption: 'Einlöse',
    membership: 'Mitgliedschafts',
    visit: 'Besuchs',
    qrPdf: 'QR/PDF',
    notifications: 'Push',
    customFields: 'Custom-Field',
    eventBackgroundImage: 'Eventbild'
  }[featureName] || featureName;

  return {
    error_code: 'ACTION_NOT_ALLOWED_FOR_TEMPLATE',
    error_message: 'Aktion nicht erlaubt für diesen Kartentyp.',
    error_reason: `Diese Karte unterstützt keine ${label}-Funktion.`
  };
}

export function clubFeatureError(featureName: FeatureName) {
  const clubFeatureName = CLUB_FEATURE_BY_MATRIX_FEATURE[featureName as keyof typeof CLUB_FEATURE_BY_MATRIX_FEATURE] || featureName;

  return {
    error_code: 'FEATURE_NOT_ENABLED',
    error_message: 'Diese Funktion ist für diese Clubkarte nicht aktiviert.',
    error_reason: `Das Feature ${clubFeatureName} ist in club_features deaktiviert.`
  };
}

export function assertClubFeatureEnabled(template: unknown, featureName: FeatureName): void {
  if (normalizeTemplateType(template) !== 'club_card') {
    return;
  }

  if (!CLUB_FEATURE_BY_MATRIX_FEATURE[featureName as keyof typeof CLUB_FEATURE_BY_MATRIX_FEATURE]) {
    return;
  }

  if (!featureEnabled(template, featureName)) {
    throw clubFeatureError(featureName);
  }
}

export function assertFeatureAllowed(template: unknown, featureName: FeatureName): void {
  if (!featureEnabled(template, featureName)) {
    if (normalizeTemplateType(template) === 'club_card' && CLUB_FEATURE_BY_MATRIX_FEATURE[featureName as keyof typeof CLUB_FEATURE_BY_MATRIX_FEATURE]) {
      throw clubFeatureError(featureName);
    }

    throw matrixError(featureName);
  }
}

export function normalizeScannerAction(action: unknown): ScannerActionName | string {
  const rawAction = String(action || '');
  return SCANNER_ACTION_ALIASES[rawAction as keyof typeof SCANNER_ACTION_ALIASES] || rawAction;
}

export function validateScannerAction(template: unknown, action: unknown) {
  const normalizedAction = normalizeScannerAction(action);
  const config = SCANNER_ACTIONS[normalizedAction as ScannerActionName];

  if (!config) {
    return {
      allowed: false,
      error_code: 'UNKNOWN_ACTION',
      error_message: 'Unbekannte Scanner-Aktion.',
      error_reason: 'Diese Aktion ist in der Feature-Matrix nicht definiert.'
    };
  }

  if (featureEnabled(template, config.feature)) {
    return {
      allowed: true,
      action: normalizedAction,
      requested_action: String(action || ''),
      feature: config.feature
    };
  }

  if (normalizeTemplateType(template) === 'club_card' && CLUB_FEATURE_BY_MATRIX_FEATURE[config.feature as keyof typeof CLUB_FEATURE_BY_MATRIX_FEATURE]) {
    return {
      allowed: false,
      ...clubFeatureError(config.feature)
    };
  }

  return {
    allowed: false,
    error_code: 'ACTION_NOT_ALLOWED_FOR_TEMPLATE',
    error_message: 'Aktion nicht erlaubt für diesen Kartentyp.',
    error_reason: config.blockedReason
  };
}
