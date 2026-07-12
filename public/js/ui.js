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

  if (logoUrl) {
    return `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(name)}">`;
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

export function walletPreviewHtml(template, card = null) {
  const business = {
    name: template.business_name,
    business_name: template.business_name,
    logo_url: template.business_logo_url,
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
  const featureRowsHtml = featureRows.map((row) => {
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
  const stampSlots = featureEnabled(template, 'stamps')
    ? stampSlotsHtml(stampValue, stampsRequired, settings.stampIconUrl || cardEmblemUrl)
    : '';

  return `
    <div class="wallet-preview" style="--card-bg: ${escapeHtml(template.primary_color || '#fffdf9')}; --card-fg: ${escapeHtml(template.text_color || '#8b4f2f')}; --card-emblem: url('${escapeCssUrl(cardEmblemUrl)}');${eventBackgroundStyle}">
      <div class="wallet-top">
        ${businessLogoMarkup(business, 'wallet-logo-placeholder')}
        <span>${escapeHtml(businessDisplayName(business, 'Business'))}</span>
      </div>
      <div class="wallet-title">${escapeHtml(template.card_name || 'Karte')}</div>
      <div class="wallet-description">${escapeHtml(template.description || cardTypeLabel(template))}</div>
      <div class="wallet-meta">
        <span>${escapeHtml(cardTypeLabel(template))}</span>
        <strong>${escapeHtml(progress)}</strong>
      </div>
      ${featureRowsHtml}
      ${stampSlots}
      ${rewardVisible ? `<div class="wallet-reward">${escapeHtml(template.reward_text)}</div>` : ''}
      <div class="wallet-code">${escapeHtml(cardInstanceNumber)}</div>
    </div>
  `;
}
