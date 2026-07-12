import { featureEnabled, normalizeTemplateType, templateSettings } from './templateFeatures.ts';
import { supabaseCardEmblemUrl } from './cardEmblems.ts';

type Row = Record<string, any>;

export type WalletPlatform = 'apple' | 'google' | 'samsung';
export type WalletWarningLevel = 'info' | 'warning' | 'critical';
export type WalletSupportLevel = 'native' | 'details' | 'asset' | 'partial' | 'unsupported';
export type EditorBarcodeFormat = 'qr' | 'aztec' | 'pdf417' | 'code128';
export type WalletLocation = {
  latitude: number;
  longitude: number;
  altitude?: number;
  relevantText?: string;
};
export type WalletBeacon = {
  proximityUUID: string;
  major?: number;
  minor?: number;
  relevantText?: string;
};

export type EditorCardField = {
  key: string;
  label: string;
  value: string;
  feature?: string;
  priority: number;
  front: boolean;
  platformSupport: Record<WalletPlatform, WalletSupportLevel>;
};

export type WalletDesignWarning = {
  id: string;
  level: WalletWarningLevel;
  platforms: WalletPlatform[];
  element: string;
  problem: string;
  fallback: string;
};

export type EditorCardDesign = {
  businessId: string;
  templateId: string;
  templateType: string;
  cardName: string;
  title: string;
  subtitle?: string;
  description?: string;
  logoUrl?: string;
  emblemUrl?: string;
  backgroundColor: string;
  foregroundColor: string;
  labelColor: string;
  accentColor?: string;
  backgroundImageUrl?: string;
  textureUrl?: string;
  barcodeValue?: string;
  barcodeFormat: EditorBarcodeFormat;
  locations: WalletLocation[];
  beacons: WalletBeacon[];
  cardInstanceNumber?: string;
  rewardText?: string;
  decorativeTitle: boolean;
  fields: EditorCardField[];
  activeFeatures: {
    stamps: boolean;
    streak: boolean;
    vip: boolean;
    balance: boolean;
    cloakroom: boolean;
    coupon: boolean;
    membership: boolean;
    notifications: boolean;
    eventBackgroundImage: boolean;
  };
  assetFallbacks: Array<{
    assetType: string;
    reason: string;
    platforms: WalletPlatform[];
  }>;
  warnings: WalletDesignWarning[];
};

export type ApplePassDesign = {
  passStyle: 'generic' | 'storeCard' | 'coupon' | 'eventTicket';
  colors: {
    backgroundColor: string;
    foregroundColor: string;
    labelColor: string;
  };
  barcodes: Array<{
    format: 'PKBarcodeFormatQR' | 'PKBarcodeFormatAztec' | 'PKBarcodeFormatPDF417' | 'PKBarcodeFormatCode128';
    message: string;
    messageEncoding: 'iso-8859-1';
    altText: string;
  }>;
  fieldSets: {
    headerFields: Row[];
    primaryFields: Row[];
    secondaryFields: Row[];
    auxiliaryFields: Row[];
    backFields: Row[];
  };
  assets: {
    logoUrl?: string;
    emblemUrl?: string;
    thumbnailUrl?: string;
    stripUrl?: string;
    backgroundUrl?: string;
  };
  locations: WalletLocation[];
  beacons: WalletBeacon[];
  warnings: WalletDesignWarning[];
  assetFallbacks: EditorCardDesign['assetFallbacks'];
};

export type GoogleWalletDesign = {
  objectType: 'genericObject' | 'loyaltyObject' | 'offerObject' | 'eventTicketObject' | 'giftCardObject';
  hexBackgroundColor: string;
  barcode: {
    type: 'QR_CODE' | 'AZTEC' | 'PDF_417' | 'CODE_128';
    value: string;
    alternateText: string;
  };
  cardTitle: Row;
  header: Row;
  subheader: Row;
  textModulesData: Array<{ id: string; header: string; body: string }>;
  imageModulesData: Array<{ id: string; mainImage: Row }>;
  logo?: Row;
  heroImage?: Row;
  loyaltyPoints?: Row;
  accountId?: string;
  accountName?: string;
  warnings: WalletDesignWarning[];
  assetFallbacks: EditorCardDesign['assetFallbacks'];
};

export type SamsungWalletDesign = {
  cardType: 'generic' | 'loyalty' | 'coupon' | 'ticket';
  cardSubType: string;
  attributes: Row;
  fields: string[];
  warnings: WalletDesignWarning[];
  assetFallbacks: EditorCardDesign['assetFallbacks'];
};

const nativeSupport: Record<WalletPlatform, WalletSupportLevel> = {
  apple: 'native',
  google: 'native',
  samsung: 'native'
};

function stringValue(value: unknown) {
  return String(value || '').trim();
}

function numberValue(...values: unknown[]) {
  for (const value of values) {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function booleanFlag(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'boolean') {
      return value;
    }

    const text = stringValue(value).toLowerCase();

    if (['true', '1', 'yes', 'on'].includes(text)) {
      return true;
    }

    if (['false', '0', 'no', 'off'].includes(text)) {
      return false;
    }
  }

  return false;
}

function optionalNumber(value: unknown) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function hexColor(value: unknown, fallback: string) {
  const text = stringValue(value);

  return /^#[0-9a-f]{6}$/i.test(text) ? text : fallback;
}

function safeHttpsUrl(value: unknown) {
  const text = stringValue(value);

  if (!/^https:\/\//i.test(text)) {
    return '';
  }

  try {
    return new URL(text).toString();
  } catch (_error) {
    return '';
  }
}

function likelyPngAssetUrl(value: unknown) {
  const uri = safeHttpsUrl(value);

  if (!uri) {
    return false;
  }

  try {
    return new URL(uri).pathname.toLowerCase().endsWith('.png');
  } catch (_error) {
    return false;
  }
}

function localized(value: unknown, fallback = '') {
  return {
    defaultValue: {
      language: 'de',
      value: stringValue(value || fallback)
    }
  };
}

function imageValue(url: unknown, label = 'Bild') {
  const uri = safeHttpsUrl(url);

  if (!uri) {
    return null;
  }

  return {
    sourceUri: { uri },
    contentDescription: localized(label)
  };
}

function textLimit(value: unknown, maxLength: number, fallback = '') {
  const text = stringValue(value || fallback);

  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

function templateBusiness(template: Row) {
  return Array.isArray(template.businesses) ? template.businesses[0] : template.businesses;
}

function metadataFor(cardInstance: Row) {
  const customerMetadata = cardInstance.customer_cards?.metadata;

  if (customerMetadata && typeof customerMetadata === 'object') {
    return customerMetadata as Row;
  }

  return cardInstance.metadata && typeof cardInstance.metadata === 'object'
    ? cardInstance.metadata as Row
    : {};
}

function businessNameForTemplate(template: Row, fallback = 'Wallet Cards') {
  const business = templateBusiness(template) || {};

  return stringValue(business.name || template.business_name || fallback);
}

function businessLogoUrlForTemplate(template: Row) {
  const business = templateBusiness(template) || {};

  return safeHttpsUrl(
    business.logo_url
      || template.business_logo_url
      || template.company_logo_url
      || template.logo_url
  );
}

function cardCodeFor(cardInstance: Row) {
  return stringValue(
    cardInstance.card_instance_number
      || cardInstance.customer_cards?.card_instance_number
      || cardInstance.customer_cards?.customer_code
      || cardInstance.customer_code
      || cardInstance.id
  );
}

function normalizeBarcodeFormat(value: unknown): EditorBarcodeFormat | '' {
  const text = stringValue(value).toLowerCase().replace(/[^a-z0-9]/g, '');

  if (!text) {
    return '';
  }

  if (text.includes('aztec')) {
    return 'aztec';
  }

  if (text.includes('pdf417')) {
    return 'pdf417';
  }

  if (text.includes('code128') || text === 'barcode' || text === 'barcodeserial') {
    return 'code128';
  }

  if (text.includes('qr')) {
    return 'qr';
  }

  return '';
}

function barcodeFormatFor(template: Row, cardInstance: Row, options: Row): EditorBarcodeFormat {
  const settings = templateSettings(template);
  const customer = cardInstance.customer_cards || {};
  const metadata = metadataFor(cardInstance);
  const candidates = [
    options.barcodeFormat,
    options.barcode_format,
    options.barcodeType,
    options.barcode_type,
    cardInstance.barcodeFormat,
    cardInstance.barcode_format,
    cardInstance.barcodeType,
    cardInstance.barcode_type,
    customer.barcodeFormat,
    customer.barcode_format,
    customer.barcodeType,
    customer.barcode_type,
    metadata.barcodeFormat,
    metadata.barcode_format,
    metadata.barcodeType,
    metadata.barcode_type,
    template.barcodeFormat,
    template.barcode_format,
    template.barcodeType,
    template.barcode_type,
    settings.barcodeFormat,
    settings.barcode_format,
    settings.barcodeType,
    settings.barcode_type
  ];

  for (const candidate of candidates) {
    const normalized = normalizeBarcodeFormat(candidate);

    if (normalized) {
      return normalized;
    }
  }

  return 'qr';
}

function barcodeValueFor(template: Row, cardInstance: Row, options: Row, fallback: string) {
  const settings = templateSettings(template);
  const customer = cardInstance.customer_cards || {};
  const metadata = metadataFor(cardInstance);
  const candidates = [
    options.barcodeValue,
    options.barcode_value,
    options.barcodeMessage,
    options.barcode_message,
    cardInstance.barcodeValue,
    cardInstance.barcode_value,
    cardInstance.barcodeMessage,
    cardInstance.barcode_message,
    customer.barcodeValue,
    customer.barcode_value,
    customer.barcodeMessage,
    customer.barcode_message,
    metadata.barcodeValue,
    metadata.barcode_value,
    metadata.barcodeMessage,
    metadata.barcode_message,
    template.barcodeValue,
    template.barcode_value,
    template.barcodeMessage,
    template.barcode_message,
    settings.barcodeValue,
    settings.barcode_value,
    settings.barcodeMessage,
    settings.barcode_message
  ];

  for (const candidate of candidates) {
    const value = stringValue(candidate);

    if (value) {
      return value;
    }
  }

  return fallback;
}

function coordinate(value: unknown, min: number, max: number) {
  const parsed = optionalNumber(value);

  return parsed !== null && parsed >= min && parsed <= max ? parsed : null;
}

function firstPresent(source: Row, keys: string[]) {
  for (const key of keys) {
    if (source?.[key] !== undefined && source?.[key] !== null && source?.[key] !== '') {
      return source[key];
    }
  }

  return '';
}

function normalizeWalletLocation(source: Row): WalletLocation | null {
  const latitude = coordinate(firstPresent(source, ['latitude', 'lat', 'location_lat', 'locationLatitude', 'cloakroomLocationLatitude', 'eventLocationLatitude']), -90, 90);
  const longitude = coordinate(firstPresent(source, ['longitude', 'lng', 'location_lng', 'locationLongitude', 'cloakroomLocationLongitude', 'eventLocationLongitude']), -180, 180);

  if (latitude === null || longitude === null) {
    return null;
  }

  const altitude = optionalNumber(firstPresent(source, ['altitude', 'locationAltitude']));
  const relevantText = textLimit(firstPresent(source, [
    'relevantText',
    'relevant_text',
    'locationText',
    'locationName',
    'name',
    'address',
    'cloakroomLocationMessage',
    'cloakroomLocationName',
    'eventLocation'
  ]), 90);
  const location: WalletLocation = { latitude, longitude };

  if (altitude !== null) {
    location.altitude = altitude;
  }

  if (relevantText) {
    location.relevantText = relevantText;
  }

  return location;
}

function collectArrayValues(...values: unknown[]) {
  return values.flatMap((value) => Array.isArray(value) ? value : []);
}

function walletLocationsFor(template: Row, cardInstance: Row, options: Row): WalletLocation[] {
  const settings = templateSettings(template);
  const business = templateBusiness(template) || {};
  const metadata = metadataFor(cardInstance);
  const candidates: Row[] = [
    ...collectArrayValues(
      options.locations,
      options.appleLocations,
      template.locations,
      template.appleLocations,
      settings.locations,
      settings.appleLocations,
      metadata.locations,
      metadata.appleLocations
    ),
    {
      latitude: firstPresent(options, ['locationLatitude', 'location_lat', 'latitude']),
      longitude: firstPresent(options, ['locationLongitude', 'location_lng', 'longitude']),
      relevantText: firstPresent(options, ['locationText', 'locationName', 'relevantText'])
    },
    {
      latitude: firstPresent(settings, ['locationLatitude', 'location_lat', 'latitude']),
      longitude: firstPresent(settings, ['locationLongitude', 'location_lng', 'longitude']),
      relevantText: firstPresent(settings, ['locationText', 'locationName', 'locationAddress'])
    },
    {
      latitude: firstPresent(settings, ['cloakroomLocationLatitude', 'cloakroom_location_latitude']),
      longitude: firstPresent(settings, ['cloakroomLocationLongitude', 'cloakroom_location_longitude']),
      relevantText: firstPresent(settings, ['cloakroomLocationMessage', 'cloakroomLocationName'])
    },
    {
      latitude: firstPresent(settings, ['eventLocationLatitude', 'event_location_latitude']),
      longitude: firstPresent(settings, ['eventLocationLongitude', 'event_location_longitude']),
      relevantText: firstPresent(settings, ['eventLocation', 'eventName'])
    },
    {
      latitude: firstPresent(business, ['location_lat', 'latitude', 'lat']),
      longitude: firstPresent(business, ['location_lng', 'longitude', 'lng']),
      relevantText: firstPresent(business, ['address', 'name'])
    }
  ];
  const seen = new Set<string>();
  const locations: WalletLocation[] = [];

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') {
      continue;
    }

    const location = normalizeWalletLocation(candidate);

    if (!location) {
      continue;
    }

    const key = `${location.latitude.toFixed(6)}:${location.longitude.toFixed(6)}:${location.relevantText || ''}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    locations.push(location);

    if (locations.length >= 10) {
      break;
    }
  }

  return locations;
}

function normalizeBeaconNumber(value: unknown) {
  const parsed = optionalNumber(value);

  if (parsed === null || parsed < 0 || parsed > 65535) {
    return null;
  }

  return Math.round(parsed);
}

function normalizeWalletBeacon(source: Row): WalletBeacon | null {
  const proximityUUID = stringValue(firstPresent(source, [
    'proximityUUID',
    'proximityUuid',
    'proximity_uuid',
    'uuid',
    'beaconUuid',
    'beacon_uuid'
  ]));

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(proximityUUID)) {
    return null;
  }

  const major = normalizeBeaconNumber(source.major);
  const minor = normalizeBeaconNumber(source.minor);
  const relevantText = textLimit(firstPresent(source, ['relevantText', 'relevant_text', 'name', 'message']), 90);
  const beacon: WalletBeacon = { proximityUUID };

  if (major !== null) {
    beacon.major = major;
  }

  if (minor !== null) {
    beacon.minor = minor;
  }

  if (relevantText) {
    beacon.relevantText = relevantText;
  }

  return beacon;
}

function walletBeaconsFor(template: Row, cardInstance: Row, options: Row): WalletBeacon[] {
  const settings = templateSettings(template);
  const metadata = metadataFor(cardInstance);
  const candidates: Row[] = [
    ...collectArrayValues(
      options.beacons,
      options.appleBeacons,
      template.beacons,
      template.appleBeacons,
      settings.beacons,
      settings.appleBeacons,
      metadata.beacons,
      metadata.appleBeacons
    ),
    {
      proximityUUID: firstPresent(settings, ['proximityUUID', 'beaconUuid', 'beacon_uuid']),
      major: firstPresent(settings, ['beaconMajor', 'beacon_major']),
      minor: firstPresent(settings, ['beaconMinor', 'beacon_minor']),
      relevantText: firstPresent(settings, ['beaconRelevantText', 'beaconMessage'])
    }
  ];
  const seen = new Set<string>();
  const beacons: WalletBeacon[] = [];

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') {
      continue;
    }

    const beacon = normalizeWalletBeacon(candidate);

    if (!beacon) {
      continue;
    }

    const key = `${beacon.proximityUUID}:${beacon.major ?? ''}:${beacon.minor ?? ''}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    beacons.push(beacon);

    if (beacons.length >= 10) {
      break;
    }
  }

  return beacons;
}

function templateTypeLabel(template: Row) {
  return {
    generic_card: 'Basiskarte',
    stamp_card: 'Stempelkarte',
    streak_card: 'Streakkarte',
    vip_card: 'VIP-Karte',
    balance_card: 'Guthabenkarte',
    cloakroom_card: 'Garderobenkarte',
    event_card: 'Eventkarte',
    coupon_card: 'Couponkarte',
    membership_card: 'Memberkarte',
    club_card: 'Clubkarte'
  }[normalizeTemplateType(template)] || 'Karte';
}

function statusLabel(value: unknown) {
  const status = stringValue(value).toLowerCase();

  return {
    active: 'Aktiv',
    issued: 'Aktiv',
    redeemed: 'Eingeloest',
    blocked: 'Gesperrt',
    paused: 'Pausiert'
  }[status] || stringValue(value || 'Aktiv');
}

function formatMoney(cents: unknown, currency: unknown) {
  return `${stringValue(currency) || 'CHF'} ${(numberValue(cents) / 100).toFixed(2)}`;
}

function rewardTextForTemplate(template: Row) {
  const settings = templateSettings(template);

  return stringValue(template.reward_text || settings.rewardText || settings.reward_text);
}

function activeFeaturesForTemplate(template: Row) {
  return {
    stamps: featureEnabled(template, 'stamps'),
    streak: featureEnabled(template, 'streak'),
    vip: featureEnabled(template, 'vip'),
    balance: featureEnabled(template, 'balance'),
    cloakroom: featureEnabled(template, 'cloakroom'),
    coupon: featureEnabled(template, 'redemption'),
    membership: featureEnabled(template, 'membership'),
    notifications: featureEnabled(template, 'notifications'),
    eventBackgroundImage: featureEnabled(template, 'eventBackgroundImage')
  };
}

function field(key: string, label: string, value: unknown, priority: number, options: Partial<EditorCardField> = {}): EditorCardField {
  return {
    key,
    label,
    value: stringValue(value),
    priority,
    front: options.front !== false,
    feature: options.feature,
    platformSupport: options.platformSupport || nativeSupport
  };
}

function featureFields(template: Row, cardInstance: Row) {
  const settings = templateSettings(template);
  const templateType = normalizeTemplateType(template);
  const customer = cardInstance.customer_cards || {};
  const metadata = metadataFor(cardInstance);
  const fields: EditorCardField[] = [];
  const stampCount = numberValue(cardInstance.current_stamps, customer.stamp_count, metadata.stamp_count, 0);
  const stampsRequired = Math.max(1, numberValue(template.stamps_required, settings.stampsRequired, settings.stamps_required, 10));
  const streakCount = numberValue(cardInstance.current_streak, customer.streak_count, metadata.streak_count, 0);
  const streakGoal = numberValue(template.streak_goal, settings.streakGoal, settings.streak_goal, 0);
  const vipStatus = stringValue(cardInstance.vip_level || customer.vip_status || metadata.vip_level || template.vip_tier || settings.vipDefaultTier);
  const balanceCents = numberValue(cardInstance.balance_cents, customer.balance_cents, metadata.balance_cents, 0);
  const currency = stringValue(cardInstance.currency || customer.currency || settings.currency || 'CHF');
  const cloakroomActive = Boolean(cardInstance.cloakroom_active ?? customer.cloakroom_active ?? metadata.cloakroom_active);

  if (templateType === 'club_card') {
    if (featureEnabled(template, 'vip')) {
      fields.push(field('vip', 'VIP', vipStatus || 'Member', 30, { feature: 'vip' }));
    }

    if (featureEnabled(template, 'balance')) {
      fields.push(field('balance', 'Guthaben', formatMoney(balanceCents, currency), 40, { feature: 'balance' }));
    }

    if (featureEnabled(template, 'membership')) {
      const membershipNumber = stringValue(metadata.membership_number || cardInstance.membership_number);
      const membershipExpiresAt = stringValue(metadata.membership_expires_at || cardInstance.membership_expires_at || settings.membershipExpiresAt);

      fields.push(field(
        membershipNumber ? 'membershipNumber' : 'membership',
        membershipNumber ? 'Mitgliedsnummer' : 'Mitgliedschaft',
        membershipNumber || metadata.membership_status || cardInstance.membership_status || settings.membershipStatus || 'Aktiv',
        50,
        { feature: 'membership' }
      ));
      fields.push(field(
        'membershipStatus',
        'Mitgliedsstatus',
        [
          stringValue(metadata.membership_status || cardInstance.membership_status || settings.membershipStatus) || 'Aktiv',
          membershipExpiresAt ? `bis ${membershipExpiresAt}` : ''
        ].filter(Boolean).join(' '),
        55,
        { feature: 'membership', front: false }
      ));
    }

    if (featureEnabled(template, 'redemption')) {
      fields.push(field(
        'redemption',
        stringValue(settings.couponTitle) || 'Coupon',
        stringValue(cardInstance.coupon_status || metadata.coupon_status || customer.status || cardInstance.status) === 'redeemed' ? 'Eingeloest' : 'Bereit',
        60,
        { feature: 'coupon' }
      ));
    }

    if (featureEnabled(template, 'cloakroom')) {
      fields.push(field('cloakroom', 'Garderobe', cloakroomActive ? 'Aktiv' : 'Bereit', 70, { feature: 'cloakroom' }));
    }

    return fields.length ? fields : [field('status', 'Status', statusLabel(customer.status || cardInstance.status), 90)];
  }

  if (featureEnabled(template, 'stamps')) {
    fields.push(field('stamps', 'Stempel', `${stampCount}/${stampsRequired}`, 80, {
      feature: 'stamps',
      platformSupport: { apple: 'asset', google: 'asset', samsung: 'partial' }
    }));
  }

  if (featureEnabled(template, 'streak')) {
    fields.push(field('streak', 'Streak', streakGoal > 0 ? `${streakCount}/${streakGoal}` : String(streakCount), 80, {
      feature: 'streak',
      platformSupport: { apple: 'partial', google: 'partial', samsung: 'partial' }
    }));
  }

  if (featureEnabled(template, 'vip')) {
    fields.push(field('vip', 'VIP', vipStatus || 'Member', 30, { feature: 'vip' }));
  }

  if (featureEnabled(template, 'balance')) {
    fields.push(field('balance', 'Guthaben', formatMoney(balanceCents, currency), 40, { feature: 'balance' }));
  }

  if (featureEnabled(template, 'cloakroom')) {
    fields.push(field('cloakroom', 'Garderobe', cloakroomActive ? 'Aktiv' : 'Bereit', 70, { feature: 'cloakroom' }));
  }

  if (featureEnabled(template, 'checkin')) {
    fields.push(field('checkin', stringValue(settings.eventName) || 'Einlass', stringValue(metadata.event_status) || 'Bereit', 75, { feature: 'checkin' }));
  }

  if (featureEnabled(template, 'redemption')) {
    fields.push(field(
      'redemption',
      stringValue(settings.couponTitle) || 'Coupon',
      stringValue(customer.status || cardInstance.status) === 'redeemed' ? 'Eingeloest' : 'Bereit',
      60,
      { feature: 'coupon' }
    ));
  }

  if (featureEnabled(template, 'membership')) {
    fields.push(field('membership', 'Mitgliedschaft', stringValue(metadata.membership_status || settings.membershipStatus) || 'Aktiv', 50, { feature: 'membership' }));
  }

  return fields.length ? fields : [field('status', 'Status', statusLabel(customer.status || cardInstance.status), 90)];
}

function buildWarnings(design: Omit<EditorCardDesign, 'warnings' | 'assetFallbacks'>) {
  const warnings: WalletDesignWarning[] = [
    {
      id: 'platform-fonts',
      level: 'info',
      platforms: ['apple', 'google', 'samsung'],
      element: 'Schriftart',
      problem: 'Wallet-Plattformen rendern Text mit eigenen System- oder Template-Schriften.',
      fallback: 'Text bleibt nativ lesbar; dekorative Schrift muss als serverseitig generiertes Bild-Asset ausgeliefert werden.'
    }
  ];

  if (design.backgroundImageUrl || design.textureUrl) {
    warnings.push({
      id: 'background-image-template-limits',
      level: 'warning',
      platforms: ['apple', 'google', 'samsung'],
      element: 'Hintergrundbild / Textur',
      problem: 'Wallets erlauben keine freie CSS-Hintergrundkomposition wie die Editor-Vorschau.',
      fallback: 'Bild als Strip/Hero/Main-Image verwenden und die Hintergrundfarbe als robuste Basis setzen.'
    });
  }

  if (design.activeFeatures.stamps) {
    warnings.push({
      id: 'stamp-grid-not-native',
      level: 'warning',
      platforms: ['apple', 'google', 'samsung'],
      element: 'Stempelraster',
      problem: 'Das Editor-Stempelraster ist kein natives Wallet-Layout.',
      fallback: 'Stempelstand als priorisiertes Textfeld anzeigen; bei Bedarf serverseitig ein stamp_grid Asset generieren.'
    });
  }

  if (design.activeFeatures.streak) {
    warnings.push({
      id: 'streak-layout-not-native',
      level: 'warning',
      platforms: ['apple', 'google', 'samsung'],
      element: 'Streak-Anzeige',
      problem: 'Die kombinierte Icon-/Zahlendarstellung aus dem Editor ist plattformabhaengig.',
      fallback: 'Streak als Textfeld anzeigen und optional ein streak_badge Asset generieren.'
    });
  }

  if (design.fields.filter((item) => item.front).length > 5) {
    warnings.push({
      id: 'front-field-overflow',
      level: 'warning',
      platforms: ['apple', 'samsung'],
      element: 'Feldanzahl',
      problem: 'Apple und Samsung zeigen nur begrenzte Vorderseitenfelder verlaesslich an.',
      fallback: 'Felder nach Prioritaet vorne zeigen und den Rest auf Rueckseite, Details oder Textmodule verschieben.'
    });
  }

  if (!design.logoUrl && !design.emblemUrl) {
    warnings.push({
      id: 'missing-brand-asset',
      level: 'info',
      platforms: ['apple', 'google', 'samsung'],
      element: 'Logo / Emblem',
      problem: 'Ohne oeffentliches Logo oder Emblem fehlt Wallet-Branding.',
      fallback: 'Business-Logo oder neutrales El-Promillo-Asset verwenden.'
    });
  }

  if (design.logoUrl && !likelyPngAssetUrl(design.logoUrl)) {
    warnings.push({
      id: 'apple-logo-png-format',
      level: 'info',
      platforms: ['apple'],
      element: 'Logo / Bildformat',
      problem: 'Apple Pass-Bildslots werden als PNG-Dateien paketiert; JPEG/WebP-Uploads koennen dort nicht verlaesslich unter PNG-Dateinamen verwendet werden.',
      fallback: 'Apple verwendet ein serverseitig generiertes PNG-Titelbild, falls das hochgeladene Logo nicht als echtes PNG geladen werden kann.'
    });
  }

  if (design.barcodeFormat !== 'qr') {
    warnings.push({
      id: 'barcode-format-template-limits',
      level: 'info',
      platforms: ['samsung'],
      element: 'Barcode-Format',
      problem: 'Apple und Google unterstuetzen mehrere Barcodeformate nativ; Samsung haengt staerker vom Partner-Template ab.',
      fallback: 'Das gewaehlte Format wird als Samsung-Attribut gemappt; falls das Partner-Template es ablehnt, muss das Template angepasst oder auf QR zurueckgestellt werden.'
    });
  }

  if (design.locations.length || design.beacons.length) {
    warnings.push({
      id: 'location-relevance-platform-limits',
      level: 'info',
      platforms: ['google', 'samsung'],
      element: 'Standort / Beacon',
      problem: 'Apple Wallet kann Locations und iBeacons als native Pass-Relevanz nutzen; Google und Samsung haben kein identisches Feld im aktuellen Mapping.',
      fallback: 'Standortrelevanz in Apple Pass `locations`/`beacons` setzen; fuer Google/Samsung Standortinformationen als Details, Push-Logik oder Partner-Template-Konfiguration fuehren.'
    });
  }

  return warnings;
}

function assetFallbacksForDesign(design: Omit<EditorCardDesign, 'warnings' | 'assetFallbacks'>): EditorCardDesign['assetFallbacks'] {
  const fallbacks: EditorCardDesign['assetFallbacks'] = [];
  const appleNeedsPngLogoFallback = Boolean(design.logoUrl && !likelyPngAssetUrl(design.logoUrl));
  const activeClubModules = [
    design.activeFeatures.vip,
    design.activeFeatures.balance,
    design.activeFeatures.cloakroom,
    design.activeFeatures.coupon,
    design.activeFeatures.membership
  ].filter(Boolean).length;

  if (design.activeFeatures.stamps) {
    fallbacks.push({
      assetType: 'stamp_grid',
      reason: 'Komplexe Stempelraster sind nicht nativ plattformuebergreifend darstellbar.',
      platforms: ['apple', 'google', 'samsung']
    });
  }

  if (design.activeFeatures.streak) {
    fallbacks.push({
      assetType: 'streak_badge',
      reason: 'Die Editor-Streak-Anzeige braucht je nach Wallet ein vereinfachtes Bild oder Textfeld.',
      platforms: ['apple', 'google', 'samsung']
    });
  }

  if (design.backgroundImageUrl || design.textureUrl || design.logoUrl || design.emblemUrl) {
    fallbacks.push({
      assetType: 'wallet_background',
      reason: 'Hintergrundbilder, Logos und Wasserzeichen muessen pro Wallet in ein akzeptiertes Bildfeld uebersetzt werden.',
      platforms: ['apple', 'google', 'samsung']
    });
  }

  if (design.emblemUrl) {
    fallbacks.push({
      assetType: 'combined_emblem',
      reason: 'Logo, Titel und demografisches Emblem koennen in Wallets nicht frei ueberlagert werden und brauchen bei begrenzten Bildslots eine kombinierte Branding-Flaeche.',
      platforms: ['apple', 'google', 'samsung']
    });
  }

  if (design.decorativeTitle && design.title) {
    fallbacks.push({
      assetType: 'decorative_title',
      reason: 'Dekorative Editor-Titel koennen nicht als Wallet-Font erzwungen werden und brauchen ein serverseitiges Titel-PNG.',
      platforms: ['apple', 'google', 'samsung']
    });
  } else if (appleNeedsPngLogoFallback && design.title) {
    fallbacks.push({
      assetType: 'decorative_title',
      reason: 'Apple Pass-Bildslots brauchen echte PNG-Bytes; unsichere Logoformate erhalten ein serverseitig erzeugtes Titel-PNG als Fallback.',
      platforms: ['apple']
    });
  }

  if (design.templateType === 'club_card' && activeClubModules > 1) {
    fallbacks.push({
      assetType: 'club_module_badges',
      reason: 'Aktive Clubkarten-Module brauchen in Wallets je nach Plattform eine kompakte Badge-Grafik.',
      platforms: ['apple', 'google', 'samsung']
    });
  }

  return fallbacks;
}

export function editorCardDesignFromTemplate(template: Row = {}, cardInstance: Row = {}, options: Row = {}): EditorCardDesign {
  const settings = templateSettings(template);
  const templateType = normalizeTemplateType(template);
  const business = templateBusiness(template) || {};
  const businessId = stringValue(template.business_id || business.id);
  const templateId = stringValue(template.id);
  const cardName = stringValue(template.card_name || template.name || 'Karte');
  const title = stringValue(options.title || cardName || templateTypeLabel(template));
  const subtitle = stringValue(options.subtitle || business.name || template.business_name || templateTypeLabel(template));
  const description = stringValue(template.description || settings.description || templateTypeLabel(template));
  const logoUrl = businessLogoUrlForTemplate(template);
  const decorativeTitle = booleanFlag(
    options.decorativeTitle,
    options.decorative_title,
    settings.decorativeTitle,
    settings.decorative_title,
    settings.titleAsImage,
    settings.title_as_image,
    settings.customFont,
    settings.custom_font
  ) || !logoUrl;
  const emblemUrl = safeHttpsUrl(
    options.emblemUrl
      || cardInstance.resolved_emblem_url
      || supabaseCardEmblemUrl(cardInstance, Deno.env.get('SUPABASE_URL') || '')
  );
  const activeFeatures = activeFeaturesForTemplate(template);
  const backgroundImageUrl = activeFeatures.eventBackgroundImage
    ? safeHttpsUrl(settings.eventBackgroundImageUrl || settings.event_background_image_url)
    : '';
  const textureUrl = safeHttpsUrl(settings.textureUrl || settings.texture_url);
  const cardInstanceNumber = cardCodeFor(cardInstance);
  const barcodeValue = barcodeValueFor(template, cardInstance, options, cardInstanceNumber);
  const barcodeFormat = barcodeFormatFor(template, cardInstance, options);
  const locations = walletLocationsFor(template, cardInstance, options);
  const beacons = walletBeaconsFor(template, cardInstance, options);
  const rewardText = rewardTextForTemplate(template);
  const baseFields = [
    field('cardId', 'Karten-ID', cardInstanceNumber, 10),
    field('cardName', 'Karte', title, 20),
    ...featureFields(template, cardInstance),
    field('type', 'Typ', templateTypeLabel(template), 95, { front: false }),
    field('description', 'Beschreibung', description, 100, { front: false })
  ];

  if (rewardText) {
    baseFields.push(field('reward', 'Belohnung', rewardText, 85, { front: false }));
  }

  const designBase = {
    businessId,
    templateId,
    templateType,
    cardName,
    title,
    subtitle,
    description,
    logoUrl,
    emblemUrl,
    backgroundColor: hexColor(template.primary_color, '#fffdf9'),
    foregroundColor: hexColor(template.text_color, '#8b4f2f'),
    labelColor: hexColor(template.text_color, '#8b4f2f'),
    accentColor: hexColor(settings.accentColor || settings.accent_color, hexColor(template.text_color, '#8b4f2f')),
    backgroundImageUrl,
    textureUrl,
    barcodeValue,
    barcodeFormat,
    locations,
    beacons,
    cardInstanceNumber,
    rewardText,
    decorativeTitle,
    fields: baseFields.filter((item) => item.value),
    activeFeatures
  };

  return {
    ...designBase,
    assetFallbacks: assetFallbacksForDesign(designBase),
    warnings: buildWarnings(designBase)
  };
}

function warningsForPlatform(design: EditorCardDesign, platform: WalletPlatform) {
  return design.warnings.filter((warning) => warning.platforms.includes(platform));
}

function applePassStyleForDesign(design: EditorCardDesign): ApplePassDesign['passStyle'] {
  if (design.templateType === 'coupon_card') {
    return 'coupon';
  }

  if (design.templateType === 'event_card') {
    return 'eventTicket';
  }

  if (['stamp_card', 'streak_card', 'vip_card', 'balance_card', 'membership_card', 'club_card'].includes(design.templateType)) {
    return 'storeCard';
  }

  return 'generic';
}

function appleField(item: EditorCardField) {
  return {
    key: item.key,
    label: item.label,
    value: item.value,
    changeMessage: '%@'
  };
}

function appleBarcodeFormat(format: EditorBarcodeFormat): ApplePassDesign['barcodes'][number]['format'] {
  return {
    qr: 'PKBarcodeFormatQR',
    aztec: 'PKBarcodeFormatAztec',
    pdf417: 'PKBarcodeFormatPDF417',
    code128: 'PKBarcodeFormatCode128'
  }[format];
}

export function mapEditorDesignToApplePass(editorDesign: EditorCardDesign, _cardInstance: Row = {}): ApplePassDesign {
  const sortedFrontFields = editorDesign.fields
    .filter((item) => item.front && item.value)
    .sort((left, right) => left.priority - right.priority);
  const usedFrontKeys = new Set(sortedFrontFields.slice(0, 7).map((item) => item.key));
  const backFields = editorDesign.fields
    .filter((item) => item.value && (!usedFrontKeys.has(item.key) || !item.front))
    .sort((left, right) => left.priority - right.priority)
    .map(appleField);

  return {
    passStyle: applePassStyleForDesign(editorDesign),
    colors: {
      backgroundColor: editorDesign.backgroundColor,
      foregroundColor: editorDesign.foregroundColor,
      labelColor: editorDesign.labelColor
    },
    barcodes: [
      {
        format: appleBarcodeFormat(editorDesign.barcodeFormat),
        message: editorDesign.barcodeValue || editorDesign.cardInstanceNumber || editorDesign.templateId,
        messageEncoding: 'iso-8859-1',
        altText: editorDesign.barcodeValue || editorDesign.cardInstanceNumber || editorDesign.templateId
      }
    ],
    fieldSets: {
      headerFields: sortedFrontFields.slice(0, 1).map(appleField),
      primaryFields: sortedFrontFields.slice(1, 2).map(appleField),
      secondaryFields: sortedFrontFields.slice(2, 4).map(appleField),
      auxiliaryFields: sortedFrontFields.slice(4, 7).map(appleField),
      backFields
    },
    assets: {
      logoUrl: editorDesign.logoUrl,
      emblemUrl: editorDesign.emblemUrl,
      thumbnailUrl: editorDesign.emblemUrl || editorDesign.logoUrl,
      stripUrl: editorDesign.backgroundImageUrl || editorDesign.emblemUrl || editorDesign.logoUrl,
      backgroundUrl: editorDesign.backgroundImageUrl || editorDesign.textureUrl
    },
    locations: editorDesign.locations,
    beacons: editorDesign.beacons,
    warnings: warningsForPlatform(editorDesign, 'apple'),
    assetFallbacks: editorDesign.assetFallbacks.filter((fallback) => fallback.platforms.includes('apple'))
  };
}

function googleObjectTypeForDesign(design: EditorCardDesign): GoogleWalletDesign['objectType'] {
  if (design.templateType === 'event_card') {
    return 'eventTicketObject';
  }

  if (design.templateType === 'coupon_card') {
    return 'offerObject';
  }

  if (design.templateType === 'balance_card') {
    return 'giftCardObject';
  }

  if (['stamp_card', 'streak_card', 'vip_card', 'membership_card', 'club_card'].includes(design.templateType)) {
    return 'loyaltyObject';
  }

  return 'genericObject';
}

function googleBarcodeType(format: EditorBarcodeFormat): GoogleWalletDesign['barcode']['type'] {
  return {
    qr: 'QR_CODE',
    aztec: 'AZTEC',
    pdf417: 'PDF_417',
    code128: 'CODE_128'
  }[format];
}

export function mapEditorDesignToGoogleWalletObject(editorDesign: EditorCardDesign, _cardInstance: Row = {}): GoogleWalletDesign {
  const frontFields = editorDesign.fields
    .filter((item) => item.front && item.value)
    .sort((left, right) => left.priority - right.priority);
  const textModulesData = editorDesign.fields
    .filter((item) => item.value)
    .sort((left, right) => left.priority - right.priority)
    .map((item) => ({
      id: item.key.replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 32),
      header: item.label,
      body: item.value
    }));
  const logo = imageValue(editorDesign.logoUrl, 'Logo') || undefined;
  const heroImage = imageValue(editorDesign.backgroundImageUrl || editorDesign.emblemUrl || editorDesign.logoUrl, 'Kartenbild') || undefined;
  const imageModulesData = heroImage
    ? [{ id: 'card_emblem', mainImage: heroImage }]
    : [];
  const primaryField = frontFields[0];

  return {
    objectType: googleObjectTypeForDesign(editorDesign),
    hexBackgroundColor: editorDesign.backgroundColor,
    barcode: {
      type: googleBarcodeType(editorDesign.barcodeFormat),
      value: editorDesign.barcodeValue || editorDesign.cardInstanceNumber || editorDesign.templateId,
      alternateText: editorDesign.barcodeValue || editorDesign.cardInstanceNumber || editorDesign.templateId
    },
    cardTitle: localized(editorDesign.title, 'Kundenkarte'),
    header: localized(editorDesign.subtitle || editorDesign.title, 'Karte'),
    subheader: localized(editorDesign.description || editorDesign.templateType, 'Digitale Karte'),
    textModulesData,
    imageModulesData,
    logo,
    heroImage,
    accountId: editorDesign.cardInstanceNumber,
    accountName: editorDesign.title,
    loyaltyPoints: primaryField
      ? {
        label: stringValue(primaryField.label),
        balance: {
          string: primaryField.value
        }
      }
      : undefined,
    warnings: warningsForPlatform(editorDesign, 'google'),
    assetFallbacks: editorDesign.assetFallbacks.filter((fallback) => fallback.platforms.includes('google'))
  };
}

function samsungCardTypeForDesign(design: EditorCardDesign): SamsungWalletDesign['cardType'] {
  if (design.templateType === 'event_card') {
    return 'ticket';
  }

  if (design.templateType === 'coupon_card') {
    return 'coupon';
  }

  if (['stamp_card', 'streak_card', 'vip_card', 'balance_card', 'membership_card', 'club_card'].includes(design.templateType)) {
    return 'loyalty';
  }

  return 'generic';
}

function samsungFontColor(value: string) {
  const color = hexColor(value, '#8b4f2f').slice(1);
  const red = parseInt(color.slice(0, 2), 16);
  const green = parseInt(color.slice(2, 4), 16);
  const blue = parseInt(color.slice(4, 6), 16);
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;

  return luminance > 0.55 ? 'dark' : 'light';
}

function samsungBarcodeAttributes(format: EditorBarcodeFormat): Row {
  return {
    qr: {
      'barcode.serialType': 'QRCODE',
      'barcode.ptFormat': 'QRCODESERIAL',
      'barcode.ptSubFormat': 'QR_CODE'
    },
    aztec: {
      'barcode.serialType': 'AZTEC',
      'barcode.ptFormat': 'AZTECSERIAL',
      'barcode.ptSubFormat': 'AZTEC'
    },
    pdf417: {
      'barcode.serialType': 'PDF417',
      'barcode.ptFormat': 'PDF417SERIAL',
      'barcode.ptSubFormat': 'PDF_417'
    },
    code128: {
      'barcode.serialType': 'BARCODE',
      'barcode.ptFormat': 'BARCODESERIAL',
      'barcode.ptSubFormat': 'CODE_128'
    }
  }[format];
}

export function mapEditorDesignToSamsungWalletCard(editorDesign: EditorCardDesign, _cardInstance: Row = {}): SamsungWalletDesign {
  const frontFields = editorDesign.fields
    .filter((item) => item.front && item.value)
    .sort((left, right) => left.priority - right.priority);
  const primaryField = frontFields[0];
  const imageUrl = editorDesign.logoUrl || editorDesign.emblemUrl || '';
  const barcodeAttributes = samsungBarcodeAttributes(editorDesign.barcodeFormat);
  const attributes: Row = {
    title: textLimit(editorDesign.title, 32, 'Kundenkarte'),
    subtitle1: textLimit(editorDesign.description || primaryField?.value, 32),
    providerName: textLimit(editorDesign.subtitle || 'El Promillo', 32, 'El Promillo'),
    noticeDesc: textLimit([
      editorDesign.description,
      ...editorDesign.fields
        .filter((item) => item.value)
        .sort((left, right) => left.priority - right.priority)
        .map((item) => `${item.label}: ${item.value}`)
    ].filter(Boolean).join('\n'), 5000),
    bgColor: editorDesign.backgroundColor,
    fontColor: samsungFontColor(editorDesign.foregroundColor),
    'barcode.value': editorDesign.barcodeValue || editorDesign.cardInstanceNumber || editorDesign.templateId,
    ...barcodeAttributes,
    amount: primaryField?.value || editorDesign.cardInstanceNumber || '',
    balance: editorDesign.rewardText || editorDesign.description || primaryField?.value || '',
    level: textLimit(frontFields.find((item) => item.feature === 'vip')?.value || '', 16),
    merchantName: textLimit(editorDesign.subtitle || 'El Promillo', 32, 'El Promillo')
  };

  if (imageUrl) {
    attributes.logoImage = imageUrl;
    attributes['logoImage.darkUrl'] = imageUrl;
    attributes['logoImage.lightUrl'] = imageUrl;
    attributes.mainImg = editorDesign.backgroundImageUrl || editorDesign.emblemUrl || imageUrl;
  }

  return {
    cardType: samsungCardTypeForDesign(editorDesign),
    cardSubType: editorDesign.templateType.replace(/_card$/, '') || 'others',
    attributes,
    fields: ['balance', 'barcode.value', 'amount', 'level', 'noticeDesc'],
    warnings: warningsForPlatform(editorDesign, 'samsung'),
    assetFallbacks: editorDesign.assetFallbacks.filter((fallback) => fallback.platforms.includes('samsung'))
  };
}
