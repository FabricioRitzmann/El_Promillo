import { corsHeaders, createStructuredError, errorJson, json, walletNotificationService } from '../_shared/walletNotificationService.ts';
import { editorCardDesignFromTemplate } from '../_shared/walletDesign.ts';
import { isWalletAssetType, supportedWalletAssetTypes, walletAssetStoragePath } from '../_shared/walletAssets.ts';
import type { WalletAssetType, WalletPlatform } from '../_shared/walletAssets.ts';

type Row = Record<string, any>;

const supportedPlatforms = new Set(['apple', 'google', 'samsung']);
const MAX_WALLET_ASSET_BYTES = 2 * 1024 * 1024;

const cardTemplateSelect = [
  'id',
  'owner_id',
  'business_id',
  'business_name',
  'card_name',
  'card_type',
  'template_type',
  'description',
  'primary_color',
  'text_color',
  'logo_url',
  'reward_text',
  'stamps_required',
  'streak_goal',
  'vip_tier',
  'settings',
  'club_features',
  'businesses(name,logo_url)'
].join(',');

const customerCardSelect = [
  'id',
  'card_instance_number',
  'customer_code',
  'status',
  'stamp_count',
  'streak_count',
  'vip_status',
  'balance_cents',
  'currency',
  'cloakroom_active',
  'metadata'
].join(',');

const cardInstanceSelect = [
  'id',
  'owner_id',
  'business_id',
  'template_id',
  'customer_card_id',
  'card_instance_number',
  'wallet_platform',
  'current_stamps',
  'current_streak',
  'vip_level',
  'balance_cents',
  'currency',
  'cloakroom_active',
  'customer_gender',
  'customer_age_group',
  'resolved_emblem_key',
  'resolved_emblem_url',
  'metadata',
  'created_at',
  'updated_at',
  `card_templates(${cardTemplateSelect})`,
  `customer_cards(${customerCardSelect})`
].join(',');

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

function normalizePlatform(value: unknown): WalletPlatform {
  const platform = stringValue(value).toLowerCase();

  if (!supportedPlatforms.has(platform)) {
    throw createStructuredError(
      400,
      'WALLET_PLATFORM_INVALID',
      'Wallet-Plattform ist ungueltig.',
      'Erlaubt sind apple, google oder samsung.'
    );
  }

  return platform as WalletPlatform;
}

function normalizeAssetType(value: unknown): WalletAssetType {
  const assetType = stringValue(value).toLowerCase().replace(/-/g, '_');

  if (!isWalletAssetType(assetType)) {
    throw createStructuredError(
      400,
      'WALLET_ASSET_TYPE_INVALID',
      'Wallet-Asset-Typ ist ungueltig.',
      `Erlaubt sind ${supportedWalletAssetTypes.join(', ')}.`
    );
  }

  return assetType as WalletAssetType;
}

function hexToRgb(value: unknown, fallback: [number, number, number]): [number, number, number] {
  const text = stringValue(value);

  if (!/^#[0-9a-f]{6}$/i.test(text)) {
    return fallback;
  }

  return [
    parseInt(text.slice(1, 3), 16),
    parseInt(text.slice(3, 5), 16),
    parseInt(text.slice(5, 7), 16)
  ];
}

function blend(left: [number, number, number], right: [number, number, number], amount: number): [number, number, number] {
  const clamped = Math.max(0, Math.min(1, amount));

  return [
    Math.round(left[0] + (right[0] - left[0]) * clamped),
    Math.round(left[1] + (right[1] - left[1]) * clamped),
    Math.round(left[2] + (right[2] - left[2]) * clamped)
  ];
}

function setPixel(rgba: Uint8Array, width: number, x: number, y: number, color: [number, number, number], alpha = 255) {
  if (x < 0 || y < 0 || x >= width || y >= rgba.length / width / 4) {
    return;
  }

  const offset = (y * width + x) * 4;
  rgba[offset] = color[0];
  rgba[offset + 1] = color[1];
  rgba[offset + 2] = color[2];
  rgba[offset + 3] = alpha;
}

function fillRect(rgba: Uint8Array, width: number, x: number, y: number, rectWidth: number, rectHeight: number, color: [number, number, number], alpha = 255) {
  for (let row = Math.max(0, y); row < y + rectHeight; row += 1) {
    for (let col = Math.max(0, x); col < x + rectWidth; col += 1) {
      setPixel(rgba, width, col, row, color, alpha);
    }
  }
}

function drawCircle(rgba: Uint8Array, width: number, centerX: number, centerY: number, radius: number, color: [number, number, number], alpha = 255) {
  const radiusSquared = radius * radius;

  for (let y = Math.floor(centerY - radius); y <= Math.ceil(centerY + radius); y += 1) {
    for (let x = Math.floor(centerX - radius); x <= Math.ceil(centerX + radius); x += 1) {
      const dx = x - centerX;
      const dy = y - centerY;

      if (dx * dx + dy * dy <= radiusSquared) {
        setPixel(rgba, width, x, y, color, alpha);
      }
    }
  }
}

function createCanvas(width: number, height: number, background: [number, number, number]) {
  const rgba = new Uint8Array(width * height * 4);

  fillRect(rgba, width, 0, 0, width, height, background);

  return rgba;
}

function drawBrandBands(rgba: Uint8Array, width: number, height: number, background: [number, number, number], foreground: [number, number, number]) {
  const muted = blend(background, foreground, 0.16);
  const strong = blend(background, foreground, 0.36);

  fillRect(rgba, width, 0, 0, width, 16, strong);
  fillRect(rgba, width, 0, height - 18, width, 18, strong);

  for (let x = 0; x < width; x += 18) {
    const stripeColor = x % 36 === 0 ? muted : blend(background, foreground, 0.08);
    fillRect(rgba, width, x, 16, 9, height - 34, stripeColor, 255);
  }
}

function renderStampGrid(width: number, height: number, template: Row, cardInstance: Row, background: [number, number, number], foreground: [number, number, number]) {
  const customer = cardInstance.customer_cards || {};
  const metadata = cardInstance.metadata || {};
  const total = Math.max(1, Math.min(20, Math.round(numberValue(template.stamps_required, template.settings?.stampsRequired, template.settings?.stamps_required, 10))));
  const active = Math.max(0, Math.min(total, Math.round(numberValue(cardInstance.current_stamps, customer.stamp_count, metadata.stamp_count, 0))));
  const rgba = createCanvas(width, height, background);
  const columns = Math.min(10, total);
  const rows = Math.ceil(total / columns);
  const cellWidth = width / columns;
  const cellHeight = (height - 38) / rows;
  const activeColor = foreground;
  const openColor = blend(background, foreground, 0.26);

  drawBrandBands(rgba, width, height, background, foreground);

  for (let index = 0; index < total; index += 1) {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const centerX = Math.round(col * cellWidth + cellWidth / 2);
    const centerY = Math.round(24 + row * cellHeight + cellHeight / 2);
    const radius = Math.max(10, Math.min(cellWidth, cellHeight) * 0.28);
    const filled = index < active;

    drawCircle(rgba, width, centerX, centerY, radius + 5, openColor, 255);
    drawCircle(rgba, width, centerX, centerY, radius, filled ? activeColor : background, 255);

    if (filled) {
      drawCircle(rgba, width, centerX, centerY, Math.max(3, radius * 0.28), blend(activeColor, [255, 255, 255], 0.45), 255);
    }
  }

  return rgba;
}

function renderStreakBadge(width: number, height: number, template: Row, cardInstance: Row, background: [number, number, number], foreground: [number, number, number]) {
  const customer = cardInstance.customer_cards || {};
  const metadata = cardInstance.metadata || {};
  const streakGoal = Math.max(1, Math.round(numberValue(template.streak_goal, template.settings?.streakGoal, template.settings?.streak_goal, 7)));
  const streakValue = Math.max(0, Math.round(numberValue(cardInstance.current_streak, customer.streak_count, metadata.streak_count, 0)));
  const progress = Math.max(0, Math.min(1, streakValue / streakGoal));
  const rgba = createCanvas(width, height, background);
  const track = blend(background, foreground, 0.22);
  const active = foreground;

  drawBrandBands(rgba, width, height, background, foreground);
  drawCircle(rgba, width, 112, height / 2, 58, track, 255);
  drawCircle(rgba, width, 112, height / 2, 42, background, 255);
  drawCircle(rgba, width, 112, height / 2, Math.max(8, 42 * progress), active, 255);
  fillRect(rgba, width, 210, Math.round(height / 2 - 18), Math.round((width - 260) * progress), 36, active, 255);
  fillRect(rgba, width, 210 + Math.round((width - 260) * progress), Math.round(height / 2 - 18), Math.round((width - 260) * (1 - progress)), 36, track, 255);

  return rgba;
}

function renderBackground(width: number, height: number, background: [number, number, number], foreground: [number, number, number]) {
  const rgba = createCanvas(width, height, background);

  drawBrandBands(rgba, width, height, background, foreground);
  drawCircle(rgba, width, width - 98, 92, 78, blend(background, foreground, 0.18), 255);
  drawCircle(rgba, width, width - 98, 92, 46, blend(background, foreground, 0.34), 255);

  return rgba;
}

function renderClubBadges(width: number, height: number, design: ReturnType<typeof editorCardDesignFromTemplate>, background: [number, number, number], foreground: [number, number, number]) {
  const rgba = createCanvas(width, height, background);
  const fields = design.fields.filter((field) => field.front && field.feature).slice(0, 5);
  const badgeWidth = Math.max(80, Math.floor((width - 52) / Math.max(1, fields.length)));
  const badgeColor = blend(background, foreground, 0.22);

  drawBrandBands(rgba, width, height, background, foreground);

  fields.forEach((_field, index) => {
    const x = 24 + index * badgeWidth;
    const y = Math.round(height / 2 - 34);

    fillRect(rgba, width, x, y, badgeWidth - 12, 68, badgeColor, 255);
    fillRect(rgba, width, x + 10, y + 12, badgeWidth - 32, 12, foreground, 255);
    fillRect(rgba, width, x + 10, y + 36, badgeWidth - 44, 10, blend(background, foreground, 0.48), 255);
  });

  return rgba;
}

function renderAsset(assetType: WalletAssetType, template: Row, cardInstance: Row, walletPlatform: WalletPlatform) {
  const design = editorCardDesignFromTemplate(template, cardInstance);
  const background = hexToRgb(design.backgroundColor, [255, 253, 249]);
  const foreground = hexToRgb(design.foregroundColor, [139, 79, 47]);
  const size = walletPlatform === 'apple' && assetType === 'wallet_background'
    ? { width: 624, height: 246 }
    : { width: 600, height: 200 };

  if (assetType === 'stamp_grid') {
    return {
      ...size,
      rgba: renderStampGrid(size.width, size.height, template, cardInstance, background, foreground)
    };
  }

  if (assetType === 'streak_badge') {
    return {
      ...size,
      rgba: renderStreakBadge(size.width, size.height, template, cardInstance, background, foreground)
    };
  }

  if (assetType === 'club_module_badges') {
    return {
      ...size,
      rgba: renderClubBadges(size.width, size.height, design, background, foreground)
    };
  }

  return {
    ...size,
    rgba: renderBackground(size.width, size.height, background, foreground)
  };
}

function uint32(value: number) {
  return Uint8Array.of(
    (value >>> 24) & 255,
    (value >>> 16) & 255,
    (value >>> 8) & 255,
    value & 255
  );
}

function concatBytes(...chunks: Uint8Array[]) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }

  return output;
}

function crcTable() {
  const table = new Uint32Array(256);

  for (let index = 0; index < 256; index += 1) {
    let crc = index;

    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }

    table[index] = crc >>> 0;
  }

  return table;
}

const pngCrcTable = crcTable();

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc = pngCrcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array) {
  const typeBytes = new TextEncoder().encode(type);
  const body = concatBytes(typeBytes, data);

  return concatBytes(uint32(data.length), body, uint32(crc32(body)));
}

async function zlibDeflate(data: Uint8Array) {
  const stream = new Blob([data]).stream().pipeThrough(new CompressionStream('deflate'));

  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function encodePng(width: number, height: number, rgba: Uint8Array) {
  const scanlines = new Uint8Array((width * 4 + 1) * height);
  let inputOffset = 0;
  let outputOffset = 0;

  for (let row = 0; row < height; row += 1) {
    scanlines[outputOffset] = 0;
    outputOffset += 1;
    scanlines.set(rgba.slice(inputOffset, inputOffset + width * 4), outputOffset);
    inputOffset += width * 4;
    outputOffset += width * 4;
  }

  const ihdr = concatBytes(
    uint32(width),
    uint32(height),
    Uint8Array.of(8, 6, 0, 0, 0)
  );
  const idat = await zlibDeflate(scanlines);

  return concatBytes(
    Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', new Uint8Array())
  );
}

function templateFrom(cardInstance: Row) {
  return Array.isArray(cardInstance.card_templates)
    ? cardInstance.card_templates[0]
    : cardInstance.card_templates;
}

async function loadCardInstance(context: Row, cardInstanceId: string) {
  const { data, error } = await context.supabaseAdmin
    .from('card_instances')
    .select(cardInstanceSelect)
    .eq('id', cardInstanceId)
    .eq('owner_id', context.ownerId)
    .eq('business_id', context.business.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw createStructuredError(
      404,
      'CARD_INSTANCE_NOT_FOUND',
      'Karteninstanz wurde nicht gefunden.',
      'Die Asset-Generierung darf nur eigene Karten im aktiven Business verwenden.'
    );
  }

  const template = templateFrom(data);

  if (!template || template.owner_id !== context.ownerId || template.business_id !== context.business.id) {
    throw createStructuredError(
      403,
      'TEMPLATE_SCOPE_MISMATCH',
      'Template passt nicht zum aktiven Business.',
      'Karteninstanz und Template muessen zu owner_id und business_id des eingeloggten Betreibers gehoeren.'
    );
  }

  return {
    cardInstance: data,
    template
  };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (request.method !== 'POST') {
      return json({
        error_code: 'METHOD_NOT_ALLOWED',
        error_message: 'Nur POST ist erlaubt.',
        error_reason: 'Wallet-Assets werden serverseitig per POST generiert.'
      }, 405);
    }

    const context = await walletNotificationService.context(request);
    const body = await request.json().catch(() => ({}));
    const cardInstanceId = stringValue(body.card_instance_id || body.cardInstanceId);
    const walletPlatform = normalizePlatform(body.wallet_platform || body.walletPlatform);
    const assetType = normalizeAssetType(body.asset_type || body.assetType);

    if (!cardInstanceId) {
      throw createStructuredError(
        400,
        'CARD_INSTANCE_ID_REQUIRED',
        'card_instance_id fehlt.',
        'Sende die Karteninstanz, fuer die das Wallet-Asset erzeugt werden soll.'
      );
    }

    const { cardInstance, template } = await loadCardInstance(context, cardInstanceId);
    const rendered = renderAsset(assetType, template, cardInstance, walletPlatform);
    const pngBytes = await encodePng(rendered.width, rendered.height, rendered.rgba);

    if (pngBytes.byteLength > MAX_WALLET_ASSET_BYTES) {
      throw createStructuredError(
        413,
        'WALLET_ASSET_TOO_LARGE',
        'Wallet-Asset ist zu gross.',
        'Generierte Wallet-Assets muessen unter 2 MB bleiben.'
      );
    }

    const assetPath = walletAssetStoragePath({
      ownerId: context.ownerId,
      businessId: context.business.id,
      templateId: cardInstance.template_id,
      cardInstanceId: cardInstance.id,
      walletPlatform,
      assetType
    });

    if (!assetPath) {
      throw createStructuredError(
        500,
        'WALLET_ASSET_PATH_FAILED',
        'Wallet-Asset-Pfad konnte nicht erstellt werden.',
        'Owner, Business, Template, Karteninstanz, Plattform und Asset-Typ muessen fuer Storage vollstaendig sein.'
      );
    }
    const { error: uploadError } = await context.supabaseAdmin.storage
      .from('wallet-assets')
      .upload(assetPath, pngBytes, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      throw createStructuredError(
        500,
        'WALLET_ASSET_UPLOAD_FAILED',
        'Wallet-Asset konnte nicht gespeichert werden.',
        uploadError.message || 'Supabase Storage Upload fuer wallet-assets ist fehlgeschlagen.'
      );
    }

    const { data: publicUrlData } = context.supabaseAdmin.storage
      .from('wallet-assets')
      .getPublicUrl(assetPath);

    return json({
      asset_url: publicUrlData.publicUrl,
      asset_path: assetPath,
      width: rendered.width,
      height: rendered.height,
      content_type: 'image/png',
      asset_type: assetType,
      wallet_platform: walletPlatform,
      card_instance_id: cardInstance.id,
      template_id: cardInstance.template_id
    });
  } catch (error) {
    return errorJson(error, 'GENERATE_WALLET_ASSET_ERROR');
  }
});
