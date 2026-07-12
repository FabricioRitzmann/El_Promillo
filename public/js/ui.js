import { cardFeatureRows, featureEnabled, normalizeTemplateType, templateTypeLabel, templateSettings } from './templateFeatures.js';
import { cardEmblemImageUrl, cardEmblemMeta } from './cardEmblems.js';
import { assetPath } from './path.js';

const appBrandMarkUrl = assetPath('assets/el-promillo-emblem-cutout.png');

export function byId(id) {
  return document.getElementById(id);
}

export function setText(id, value) {
  const element = byId(id);

  if (element) {
    element.textContent = value ?? '';
  }
}

export function showMessage(element, message, type = 'info') {
  if (!element) {
    return;
  }

  element.textContent = message || '';
  element.className = `message ${type}`;
  element.hidden = !message;
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function businessDisplayName(business = {}, fallback = 'Mein Unternehmen') {
  return String(
    business?.name
      || business?.company_name
      || business?.business_name
      || business?.businesses?.name
      || fallback
  ).trim() || fallback;
}

export function businessLogoUrl(business = {}) {
  return String(
    business?.logo_url
      || business?.company_logo_url
      || business?.business_logo_url
      || business?.businesses?.logo_url
      || ''
  ).trim();
}

export function businessInitials(name = 'Mein Unternehmen') {
  const parts = String(name || 'Mein Unternehmen')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) {
    return 'MU';
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'MU';
}

export function businessLogoMarkup(business = {}, className = 'business-logo-fallback') {
  const name = businessDisplayName(business);
  const logoUrl = businessLogoUrl(business);
  const classAttribute = className ? ` class="${escapeHtml(className)}"` : '';

  if (logoUrl) {
    return `<img${classAttribute} src="${escapeHtml(logoUrl)}" alt="${escapeHtml(name)}" loading="lazy" decoding="async">`;
  }

  return `<span class="${escapeHtml(className)}">${escapeHtml(businessInitials(name))}</span>`;
}

export function renderBusinessHeader(business = {}) {
  const name = businessDisplayName(business);
  const logoUrl = businessLogoUrl(business);

  document.querySelectorAll('[data-business-name]').forEach((element) => {
    element.textContent = name;
  });

  document.querySelectorAll('[data-business-logo]').forEach((element) => {
    element.textContent = '';
    element.classList.toggle('has-image', Boolean(logoUrl));

    if (logoUrl) {
      const image = document.createElement('img');
      image.src = logoUrl;
      image.alt = name;
      image.addEventListener('error', () => {
        element.classList.remove('has-image');
        element.textContent = businessInitials(name);
      }, { once: true });
      element.append(image);
      return;
    }

    element.textContent = businessInitials(name);
  });
}

export function normalizeCode(value) {
  const rawValue = String(value || '').trim();

  try {
    const parsedUrl = new URL(rawValue);
    return parsedUrl.searchParams.get('code')
      || parsedUrl.searchParams.get('customer_code')
      || parsedUrl.searchParams.get('card')
      || rawValue;
  } catch {
    return rawValue;
  }
}

export function cardTypeLabel(type) {
  return templateTypeLabel(type);
}

function featureIconHtml(url, label, { brand = false } = {}) {
  if (url) {
    return `<img class="wallet-feature-icon ${brand ? 'wallet-feature-brand-icon' : ''}" src="${escapeHtml(url)}" alt="">`;
  }

  return `<span class="wallet-feature-icon wallet-feature-fallback">${escapeHtml(label)}</span>`;
}

function stampSlotsHtml(stampValue, stampsRequired, iconUrl = appBrandMarkUrl) {
  const total = Math.max(1, Math.round(Number(stampsRequired) || 10));
  const activeCount = Math.max(0, Math.min(total, Math.round(Number(stampValue) || 0)));

  return `
    <div class="wallet-stamp-strip" aria-label="${escapeHtml(`${activeCount} von ${total} Stempeln`)}">
      ${Array.from({ length: total }, (_, index) => {
        const isActive = index < activeCount;

        return `
          <span class="wallet-stamp-slot ${isActive ? 'is-active' : 'is-open'}">
            <img src="${escapeHtml(iconUrl)}" alt="">
          </span>
        `;
      }).join('')}
    </div>
  `;
}

function escapeCssUrl(value) {
  return String(value || '').replace(/["'()\\\n\r]/g, '');
}

function normalizeWalletBarcodeFormat(value) {
  const text = String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  if (!text) {
    return null;
  }

  if (text.includes('aztec')) {
    return { key: 'aztec', label: 'Aztec' };
  }

  if (text.includes('pdf417')) {
    return { key: 'pdf417', label: 'PDF417' };
  }

  if (text.includes('code128') || text === 'barcode' || text === 'barcodeserial') {
    return { key: 'code128', label: 'Code128' };
  }

  if (text.includes('qr')) {
    return { key: 'qr', label: 'QR' };
  }

  return null;
}

function walletBarcodeFormat(template, card, context = {}) {
  const settings = context.settings || templateSettings(template);
  const metadata = card?.metadata && typeof card.metadata === 'object' ? card.metadata : {};
  const candidates = [
    context.barcodeFormat,
    context.barcode_format,
    card?.barcodeFormat,
    card?.barcode_format,
    card?.barcodeType,
    card?.barcode_type,
    metadata.barcodeFormat,
    metadata.barcode_format,
    metadata.barcodeType,
    metadata.barcode_type,
    template?.barcodeFormat,
    template?.barcode_format,
    template?.barcodeType,
    template?.barcode_type,
    settings.barcodeFormat,
    settings.barcode_format,
    settings.barcodeType,
    settings.barcode_type
  ];

  for (const candidate of candidates) {
    const normalized = normalizeWalletBarcodeFormat(candidate);

    if (normalized) {
      return normalized;
    }
  }

  return { key: 'qr', label: 'QR' };
}

function walletBarcodeValue(template, card, context = {}) {
  const settings = context.settings || templateSettings(template);
  const metadata = card?.metadata && typeof card.metadata === 'object' ? card.metadata : {};
  const fallback = context.cardInstanceNumber || card?.card_instance_number || metadata.card_instance_number || card?.customer_code || 'Karten-ID';
  const candidates = [
    context.barcodeValue,
    context.barcode_value,
    card?.barcodeValue,
    card?.barcode_value,
    card?.barcodeMessage,
    card?.barcode_message,
    metadata.barcodeValue,
    metadata.barcode_value,
    metadata.barcodeMessage,
    metadata.barcode_message,
    template?.barcodeValue,
    template?.barcode_value,
    template?.barcodeMessage,
    template?.barcode_message,
    settings.barcodeValue,
    settings.barcode_value,
    settings.barcodeMessage,
    settings.barcode_message
  ];

  for (const candidate of candidates) {
    const value = String(candidate || '').trim();

    if (value) {
      return value;
    }
  }

  return fallback;
}

function walletHasLocationRelevance(template, context = {}) {
  const settings = context.settings || templateSettings(template);
  const locationValues = [
    settings.locationLatitude,
    settings.location_lat,
    settings.latitude,
    settings.cloakroomLocationLatitude,
    settings.cloakroom_location_latitude,
    settings.eventLocationLatitude,
    settings.event_location_latitude,
    template?.location_lat,
    template?.latitude
  ];

  return locationValues.some((value) => String(value || '').trim())
    || (Array.isArray(settings.locations) && settings.locations.length > 0)
    || (Array.isArray(settings.appleLocations) && settings.appleLocations.length > 0)
    || (Array.isArray(settings.beacons) && settings.beacons.length > 0)
    || (Array.isArray(settings.appleBeacons) && settings.appleBeacons.length > 0)
    || Boolean(settings.proximityUUID || settings.beaconUuid || settings.beacon_uuid);
}

function walletPlatformWarnings(template, card, context = {}) {
  const warnings = [];
  const settings = context.settings || templateSettings(template);
  const featureRows = context.featureRows || cardFeatureRows(template, card);
  const barcodeFormat = walletBarcodeFormat(template, card, { ...context, settings });
  const templateType = normalizeTemplateType(template);
  const eventBackgroundImageUrl = context.eventBackgroundImageUrl || (
    featureEnabled(template, 'eventBackgroundImage') ? settings.eventBackgroundImageUrl : ''
  );
  const activeClubFeatures = templateType === 'club_card'
    ? ['vip', 'balance', 'cloakroom', 'redemption', 'membership'].filter((featureName) => featureEnabled(template, featureName))
    : [];

  warnings.push({
    level: 'info',
    platforms: ['Apple', 'Google', 'Samsung'],
    title: 'Titel-Schrift',
    body: 'Wallets nutzen native System- oder Template-Schriften; dekorative Web-Schrift wird nicht erzwungen.'
  });

  if (barcodeFormat.key !== 'qr') {
    warnings.push({
      level: 'info',
      platforms: ['Samsung'],
      title: 'Barcode-Format',
      body: `${barcodeFormat.label} wird fuer Apple und Google nativ gemappt; Samsung muss das Format im Partner-Template erlauben.`
    });
  }

  if (walletHasLocationRelevance(template, { ...context, settings })) {
    warnings.push({
      level: 'info',
      platforms: ['Apple', 'Google', 'Samsung'],
      title: 'Standort-Hinweis',
      body: 'Apple Wallet nutzt Standorte oder Beacons als native Pass-Relevanz; Google und Samsung erhalten keinen identischen Standortbereich.'
    });
  }

  if (featureEnabled(template, 'stamps')) {
    warnings.push({
      level: 'warning',
      platforms: ['Apple', 'Google', 'Samsung'],
      title: 'Stempelraster',
      body: 'Das Raster wird als Statusfeld angezeigt; bei Bedarf erzeugt das Backend ein Wallet-Asset.'
    });
  }

  if (featureEnabled(template, 'streak')) {
    warnings.push({
      level: 'warning',
      platforms: ['Apple', 'Google', 'Samsung'],
      title: 'Streak-Anzeige',
      body: 'Icon und Zaehler koennen nicht pixelgenau positioniert werden und werden vereinfacht gemappt.'
    });
  }

  if (eventBackgroundImageUrl) {
    warnings.push({
      level: 'warning',
      platforms: ['Apple', 'Google', 'Samsung'],
      title: 'Hintergrundbild',
      body: 'Das Bild wird je nach Plattform als Strip, Hero oder Main Image genutzt.'
    });
  }

  if (featureRows.length > 4 || activeClubFeatures.length > 3) {
    warnings.push({
      level: 'warning',
      platforms: ['Apple', 'Samsung'],
      title: 'Viele Felder',
      body: 'Nicht alle aktiven Module passen verlaesslich auf die Vorderseite; Details werden ausgelagert.'
    });
  }

  const externalImages = [
    template.business_logo_url,
    template.logo_url,
    settings.stampIconUrl,
    settings.streakIconUrl,
    eventBackgroundImageUrl
  ].filter(Boolean);
  const invalidImage = externalImages.find((url) => !String(url).startsWith('https://'));

  if (invalidImage) {
    warnings.push({
      level: 'critical',
      platforms: ['Google', 'Samsung'],
      title: 'Bild-URL',
      body: 'Wallet-Bilder brauchen oeffentliche HTTPS-URLs; lokale oder unsichere URLs werden ausgelassen.'
    });
  }

  return warnings;
}

function walletPlatformWarningsHtml(template, card, context = {}) {
  const warnings = walletPlatformWarnings(template, card, context);

  if (!warnings.length) {
    return '';
  }

  return `
    <div class="wallet-platform-warnings" aria-label="Wallet-Plattformhinweise">
      <div class="wallet-warning-heading">Wallet-Hinweise</div>
      ${warnings.map((warning) => `
        <div class="wallet-warning-item wallet-warning-${escapeHtml(warning.level)}">
          <div class="wallet-warning-title">
            <span class="wallet-warning-level">${escapeHtml(warning.level)}</span>
            <strong>${escapeHtml(warning.title)}</strong>
          </div>
          <p>${escapeHtml(warning.body)}</p>
          <div class="wallet-warning-platforms">
            ${warning.platforms.map((platform) => `<span>${escapeHtml(platform)}</span>`).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function walletPlatformPreviewRowsHtml(rows, limit = 4) {
  return rows.slice(0, limit).map((row) => `
    <div class="wallet-platform-preview-row">
      <span>${escapeHtml(row.label || row.header || row.key)}</span>
      <strong>${escapeHtml(row.value || row.body || '')}</strong>
    </div>
  `).join('');
}

function walletPlatformStyleLabels(template) {
  const templateType = normalizeTemplateType(template);

  return {
    apple: templateType === 'event_card' ? 'Event Ticket' : templateType === 'coupon_card' ? 'Coupon' : ['stamp_card', 'streak_card', 'vip_card', 'balance_card', 'membership_card', 'club_card'].includes(templateType) ? 'Store Card' : 'Generic',
    google: templateType === 'event_card' ? 'Event Ticket' : templateType === 'coupon_card' ? 'Offer' : ['stamp_card', 'streak_card', 'vip_card', 'balance_card', 'membership_card', 'club_card'].includes(templateType) ? 'Loyalty' : 'Generic',
    samsung: templateType === 'event_card' ? 'Ticket' : templateType === 'coupon_card' ? 'Coupon' : ['stamp_card', 'streak_card', 'vip_card', 'balance_card', 'membership_card', 'club_card'].includes(templateType) ? 'Loyalty' : 'Generic'
  };
}

function walletPlatformPreviewsHtml(template, card, context = {}) {
  const featureRows = context.featureRows || cardFeatureRows(template, card);
  const cardInstanceNumber = context.cardInstanceNumber || card?.card_instance_number || card?.metadata?.card_instance_number || card?.customer_code || 'Karten-ID';
  const settings = context.settings || templateSettings(template);
  const barcodeFormat = walletBarcodeFormat(template, card, { ...context, settings });
  const barcodeValue = walletBarcodeValue(template, card, { ...context, settings, cardInstanceNumber });
  const labels = walletPlatformStyleLabels(template);
  const title = template.card_name || 'Karte';
  const description = template.description || cardTypeLabel(template);
  const firstRows = [
    { label: 'Karten-ID', value: cardInstanceNumber },
    ...featureRows
  ];
  const appleRows = firstRows.slice(0, 4);
  const googleRows = firstRows.concat(template.reward_text ? [{ label: 'Belohnung', value: template.reward_text }] : []);
  const samsungRows = firstRows.slice(0, 3).concat(description ? [{ label: 'Details', value: description }] : []);

  return `
    <div class="wallet-platform-previews" aria-label="Wallet-Plattformvorschau">
      <div class="wallet-warning-heading">Plattform-Vorschau</div>
      <div class="wallet-platform-preview-grid">
        <div class="wallet-platform-preview-card wallet-platform-apple">
          <div class="wallet-platform-preview-head">
            <span>Apple</span>
            <strong>${escapeHtml(labels.apple)}</strong>
          </div>
          <div class="wallet-platform-preview-title">${escapeHtml(title)}</div>
          ${walletPlatformPreviewRowsHtml(appleRows, 4)}
          <div class="wallet-platform-preview-code">${escapeHtml(barcodeFormat.label)} · ${escapeHtml(barcodeValue)}</div>
        </div>
        <div class="wallet-platform-preview-card wallet-platform-google">
          <div class="wallet-platform-preview-head">
            <span>Google</span>
            <strong>${escapeHtml(labels.google)}</strong>
          </div>
          <div class="wallet-platform-preview-title">${escapeHtml(title)}</div>
          ${walletPlatformPreviewRowsHtml(googleRows, 5)}
          <div class="wallet-platform-preview-code">${escapeHtml(barcodeFormat.label)} · ${escapeHtml(barcodeValue)}</div>
        </div>
        <div class="wallet-platform-preview-card wallet-platform-samsung">
          <div class="wallet-platform-preview-head">
            <span>Samsung</span>
            <strong>${escapeHtml(labels.samsung)}</strong>
          </div>
          <div class="wallet-platform-preview-title">${escapeHtml(title)}</div>
          ${walletPlatformPreviewRowsHtml(samsungRows, 4)}
          <div class="wallet-platform-preview-code">${escapeHtml(barcodeFormat.label)} · ${escapeHtml(barcodeValue)}</div>
        </div>
      </div>
    </div>
  `;
}

export function walletPreviewHtml(template, card = null, options = {}) {
  const resolvedBusinessLogoUrl = template.business_logo_url || template.logo_url || template.company_logo_url || '';
  const business = {
    name: template.business_name,
    business_name: template.business_name,
    logo_url: resolvedBusinessLogoUrl,
    business_logo_url: template.business_logo_url,
    company_logo_url: template.company_logo_url
  };
  const stampValue = card ? Number(card.stamp_count || 0) : 0;
  const streakValue = card ? Number(card.streak_count || 0) : 0;
  const settings = templateSettings(template);
  const eventBackgroundImageUrl = featureEnabled(template, 'eventBackgroundImage')
    ? settings.eventBackgroundImageUrl
    : '';
  const eventBackgroundStyle = eventBackgroundImageUrl
    ? ` background-image: linear-gradient(rgba(0, 0, 0, 0.36), rgba(0, 0, 0, 0.36)), url('${escapeCssUrl(eventBackgroundImageUrl)}'); background-size: cover; background-position: center;`
    : '';
  const cardEmblemUrl = cardEmblemImageUrl(card || {}, { fallbackUrl: appBrandMarkUrl });
  const cardEmblem = cardEmblemMeta(card || {});
  const cardInstanceNumber = card?.card_instance_number || card?.metadata?.card_instance_number || card?.customer_code || 'Karten-ID';
  const stampsRequired = Number(template.stamps_required || 10);
  const streakGoal = Number(template.streak_goal || settings.streakGoal || 0);
  const templateType = normalizeTemplateType(template);
  const featureRows = cardFeatureRows(template, card);
  const stampComplete = featureEnabled(template, 'stamps') && card && stampValue >= stampsRequired;
  const streakComplete = featureEnabled(template, 'streak') && card && streakGoal > 0 && streakValue >= streakGoal;
  const rewardVisible = Boolean(template.reward_text) && (
    !card
    || templateType === 'generic_card'
    || featureEnabled(template, 'vip')
    || featureEnabled(template, 'redemption')
    || featureEnabled(template, 'membership')
    || stampComplete
    || streakComplete
  );
  const progress = featureRows[0]?.value || card?.status || 'Aktiv';
  const walletFrontRows = featureRows.slice(0, 4);
  const overflowFeatureCount = Math.max(0, featureRows.length - walletFrontRows.length);
  const featureRowsHtml = walletFrontRows.map((row) => {
    const isBrandedFeature = row.feature === 'stamps' || row.feature === 'streak';
    const iconUrl = row.feature === 'stamps'
      ? settings.stampIconUrl || cardEmblemUrl
      : row.feature === 'streak'
        ? settings.streakIconUrl || cardEmblemUrl
        : '';
    const valueHtml = row.feature === 'streak'
      ? `
        <strong class="wallet-streak-value">
          <img class="wallet-streak-value-icon" src="${escapeHtml(cardEmblemUrl)}" alt="${escapeHtml(cardEmblem.label)}">
          <span>${escapeHtml(row.value)}</span>
        </strong>
      `
      : `<strong>${escapeHtml(row.value)}</strong>`;

    return `
      <div class="wallet-feature-row">
        ${featureIconHtml(iconUrl, row.iconText || row.label.slice(0, 2).toUpperCase(), { brand: isBrandedFeature })}
        <span>${escapeHtml(row.label)}</span>
        ${valueHtml}
      </div>
    `;
  }).join('');
  const overflowFeatureHtml = overflowFeatureCount
    ? `<div class="wallet-feature-overflow">+${escapeHtml(overflowFeatureCount)} Details auf der Rueckseite</div>`
    : '';
  const stampSlots = featureEnabled(template, 'stamps')
    ? stampSlotsHtml(stampValue, stampsRequired, settings.stampIconUrl || cardEmblemUrl)
    : '';
  const platformWarnings = walletPlatformWarningsHtml(template, card, {
    settings,
    featureRows,
    eventBackgroundImageUrl
  });
  const walletInsights = options.showWalletInsights === true
    ? `
      ${walletPlatformPreviewsHtml(template, card, { settings, featureRows, cardInstanceNumber })}
      ${platformWarnings}
    `
    : '';

  return `
    <div class="wallet-preview-stack">
      <div class="wallet-preview" style="--card-bg: ${escapeHtml(template.primary_color || '#fffdf9')}; --card-fg: ${escapeHtml(template.text_color || '#8b4f2f')}; --card-emblem: url('${escapeCssUrl(cardEmblemUrl)}');${eventBackgroundStyle}">
        <div class="wallet-top">
          ${businessLogoMarkup(business, 'wallet-logo-placeholder')}
          <span>${escapeHtml(businessDisplayName(business, 'Business'))}</span>
        </div>
        <div class="wallet-front">
          <div class="wallet-title">${escapeHtml(template.card_name || 'Karte')}</div>
          <div class="wallet-description">${escapeHtml(template.description || cardTypeLabel(template))}</div>
          <div class="wallet-meta">
            <span>${escapeHtml(cardTypeLabel(template))}</span>
            <strong>${escapeHtml(progress)}</strong>
          </div>
          <div class="wallet-feature-list">
            ${featureRowsHtml}
            ${overflowFeatureHtml}
          </div>
          ${stampSlots}
          ${rewardVisible ? `<div class="wallet-reward">${escapeHtml(template.reward_text)}</div>` : ''}
        </div>
        <div class="wallet-code">${escapeHtml(cardInstanceNumber)}</div>
      </div>
      ${walletInsights}
    </div>
  `;
}
