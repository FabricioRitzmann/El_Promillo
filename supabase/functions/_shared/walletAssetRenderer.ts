import { editorCardDesignFromTemplate } from './walletDesign.ts';
import type { WalletAssetType, WalletPlatform } from './walletAssets.ts';

type Row = Record<string, any>;

export const MAX_WALLET_ASSET_BYTES = 2 * 1024 * 1024;

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

const titleGlyphs: Record<string, string[]> = {
  ' ': ['000', '000', '000', '000', '000', '000', '000'],
  '-': ['00000', '00000', '00000', '11110', '00000', '00000', '00000'],
  '&': ['01100', '10010', '10100', '01000', '10101', '10010', '01101'],
  '?': ['01110', '10001', '00001', '00010', '00100', '00000', '00100'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['10010', '10010', '10010', '11111', '00010', '00010', '00010'],
  '5': ['11111', '10000', '10000', '11110', '00001', '00001', '11110'],
  '6': ['01110', '10000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00001', '01110'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01111', '10000', '10000', '10011', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  J: ['00111', '00010', '00010', '00010', '10010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111']
};

function normalizeTitleText(value: unknown, fallback = 'KARTE') {
  return stringValue(value || fallback)
    .toUpperCase()
    .replace(/Ä/g, 'AE')
    .replace(/Ö/g, 'OE')
    .replace(/Ü/g, 'UE')
    .replace(/É|È|Ê/g, 'E')
    .replace(/Á|À|Â/g, 'A')
    .replace(/Ó|Ò|Ô/g, 'O')
    .replace(/[^A-Z0-9 &-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function glyphWidth(character: string) {
  return (titleGlyphs[character] || titleGlyphs['?'])[0].length;
}

function textPixelWidth(text: string) {
  return [...text].reduce((sum, character, index) => sum + glyphWidth(character) + (index === 0 ? 0 : 1), 0);
}

function fittedTextScale(text: string, maxWidth: number, maxScale: number) {
  const rawWidth = Math.max(1, textPixelWidth(text));

  return Math.max(2, Math.min(maxScale, Math.floor(maxWidth / rawWidth)));
}

function drawGlyph(rgba: Uint8Array, width: number, x: number, y: number, character: string, scale: number, color: [number, number, number]) {
  const glyph = titleGlyphs[character] || titleGlyphs['?'];

  glyph.forEach((row, rowIndex) => {
    [...row].forEach((bit, colIndex) => {
      if (bit === '1') {
        fillRect(rgba, width, x + colIndex * scale, y + rowIndex * scale, scale, scale, color, 255);
      }
    });
  });
}

function drawTextLine(rgba: Uint8Array, width: number, text: string, centerX: number, y: number, scale: number, color: [number, number, number]) {
  let x = Math.round(centerX - (textPixelWidth(text) * scale) / 2);

  for (const character of text) {
    drawGlyph(rgba, width, x, y, character, scale, color);
    x += (glyphWidth(character) + 1) * scale;
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

function renderDecorativeTitle(width: number, height: number, design: ReturnType<typeof editorCardDesignFromTemplate>, background: [number, number, number], foreground: [number, number, number]) {
  const rgba = createCanvas(width, height, background);
  const title = normalizeTitleText(design.title || design.cardName, 'KARTE').slice(0, 28);
  const subtitle = normalizeTitleText(design.subtitle, '').slice(0, 34);
  const panel = blend(background, foreground, 0.10);
  const rule = blend(background, foreground, 0.36);
  const titleScale = fittedTextScale(title, width - 96, 9);
  const subtitleScale = subtitle ? fittedTextScale(subtitle, width - 132, 4) : 0;
  const titleY = Math.round(height / 2 - (7 * titleScale) / 2 - (subtitle ? 16 : 0));

  drawBrandBands(rgba, width, height, background, foreground);
  fillRect(rgba, width, 34, 38, width - 68, height - 76, panel, 255);
  fillRect(rgba, width, 54, 56, width - 108, 5, rule, 255);
  fillRect(rgba, width, 54, height - 61, width - 108, 5, rule, 255);
  drawTextLine(rgba, width, title, width / 2, titleY, titleScale, foreground);

  if (subtitle && subtitleScale) {
    drawTextLine(rgba, width, subtitle, width / 2, titleY + 7 * titleScale + 22, subtitleScale, rule);
  }

  return rgba;
}

function brandInitials(design: ReturnType<typeof editorCardDesignFromTemplate>) {
  const source = normalizeTitleText(design.subtitle || design.title || design.cardName, 'EP');
  const initials = source
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2);

  return initials || 'EP';
}

function emblemLabel(cardInstance: Row) {
  const key = stringValue(cardInstance.resolved_emblem_key);

  if (key === 'male_gentleman') {
    return 'M';
  }

  if (key === 'female_lady') {
    return 'F';
  }

  return 'EP';
}

function renderCombinedEmblem(width: number, height: number, design: ReturnType<typeof editorCardDesignFromTemplate>, cardInstance: Row, background: [number, number, number], foreground: [number, number, number]) {
  const rgba = createCanvas(width, height, background);
  const panel = blend(background, foreground, 0.10);
  const ring = blend(background, foreground, 0.32);
  const soft = blend(background, foreground, 0.18);
  const title = normalizeTitleText(design.title || design.cardName, 'KARTE').slice(0, 24);
  const subtitle = normalizeTitleText(design.subtitle, '').slice(0, 30);
  const leftX = 84;
  const rightX = width - 88;
  const centerY = Math.round(height / 2);
  const titleCenter = Math.round(width / 2 - 10);
  const titleScale = fittedTextScale(title, width - 260, 6);
  const subtitleScale = subtitle ? fittedTextScale(subtitle, width - 300, 3) : 0;
  const titleY = Math.round(centerY - (7 * titleScale) / 2 - (subtitle ? 12 : 0));

  drawBrandBands(rgba, width, height, background, foreground);
  fillRect(rgba, width, 28, 36, width - 56, height - 72, panel, 255);
  drawCircle(rgba, width, leftX, centerY, 48, soft, 255);
  drawCircle(rgba, width, leftX, centerY, 36, background, 255);
  drawCircle(rgba, width, rightX, centerY, 58, ring, 255);
  drawCircle(rgba, width, rightX, centerY, 43, background, 255);
  drawTextLine(rgba, width, brandInitials(design), leftX, centerY - 12, 4, foreground);
  drawTextLine(rgba, width, title, titleCenter, titleY, titleScale, foreground);

  if (subtitle && subtitleScale) {
    drawTextLine(rgba, width, subtitle, titleCenter, titleY + 7 * titleScale + 18, subtitleScale, ring);
  }

  drawTextLine(rgba, width, emblemLabel(cardInstance), rightX, centerY - 15, 5, foreground);

  return rgba;
}

export function renderWalletAsset(assetType: WalletAssetType, template: Row, cardInstance: Row, walletPlatform: WalletPlatform) {
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

  if (assetType === 'combined_emblem') {
    return {
      ...size,
      rgba: renderCombinedEmblem(size.width, size.height, design, cardInstance, background, foreground)
    };
  }

  if (assetType === 'decorative_title') {
    return {
      ...size,
      rgba: renderDecorativeTitle(size.width, size.height, design, background, foreground)
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

export async function encodeWalletAssetPng(width: number, height: number, rgba: Uint8Array) {
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
