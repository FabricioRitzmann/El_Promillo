import QRCode from 'qrcode';
import { activeFeatureLabels, cardFeatureRows, templateFeatureSummary, templateTypeLabel } from '../public/js/templateFeatures.js';

const pageSizes = {
  a4: [595.28, 841.89],
  a5: [419.53, 595.28]
};

function pdfText(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '')
    .replaceAll('\\', '\\\\')
    .replaceAll('(', '\\(')
    .replaceAll(')', '\\)');
}

function hexToRgb01(hexColor, fallback = '#111827') {
  const value = String(hexColor || fallback).replace('#', '').trim();
  const safeValue = /^[0-9a-fA-F]{6}$/.test(value)
    ? value
    : fallback.replace('#', '');

  return [
    parseInt(safeValue.slice(0, 2), 16) / 255,
    parseInt(safeValue.slice(2, 4), 16) / 255,
    parseInt(safeValue.slice(4, 6), 16) / 255
  ];
}

function textLine(text, x, y, size = 11, color = [0.1, 0.1, 0.1]) {
  return [
    'BT',
    `/F1 ${size} Tf`,
    `${color.map((value) => value.toFixed(3)).join(' ')} rg`,
    `${x.toFixed(2)} ${y.toFixed(2)} Td`,
    `(${pdfText(text)}) Tj`,
    'ET'
  ].join('\n');
}

function rect(x, y, width, height, color, operator = 'f') {
  return [
    `${color.map((value) => value.toFixed(3)).join(' ')} rg`,
    `${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re ${operator}`
  ].join('\n');
}

function templateBusiness(template) {
  return Array.isArray(template.businesses) ? template.businesses[0] : template.businesses;
}

function businessNameForTemplate(template) {
  const business = templateBusiness(template);
  return String(business?.name || template.business_name || 'Business').trim() || 'Business';
}

function businessInitials(template) {
  return businessNameForTemplate(template)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'B';
}

function logoMark(template, x, y, size, background, foreground) {
  return [
    rect(x, y, size, size, background),
    textLine(businessInitials(template), x + (size * 0.25), y + (size * 0.35), size * 0.34, foreground)
  ].join('\n');
}

function drawQr(content, x, y, size) {
  const qr = QRCode.create(content, { errorCorrectionLevel: 'M' });
  const quietZone = 4;
  const moduleCount = qr.modules.size + (quietZone * 2);
  const moduleSize = size / moduleCount;
  const commands = [rect(x, y, size, size, [1, 1, 1])];

  for (let row = 0; row < qr.modules.size; row += 1) {
    for (let column = 0; column < qr.modules.size; column += 1) {
      if (!qr.modules.get(row, column)) {
        continue;
      }

      const moduleX = x + ((column + quietZone) * moduleSize);
      const moduleY = y + size - ((row + quietZone + 1) * moduleSize);
      commands.push(rect(moduleX, moduleY, moduleSize + 0.01, moduleSize + 0.01, [0.07, 0.09, 0.15]));
    }
  }

  return commands.join('\n');
}

function buildContent(template, claimUrl, pageWidth, pageHeight) {
  const margin = pageWidth < 500 ? 34 : 52;
  const cardWidth = pageWidth < 500 ? 158 : 210;
  const cardHeight = cardWidth * 0.64;
  const cardX = margin;
  const cardY = pageHeight - margin - 210;
  const qrSize = pageWidth < 500 ? 158 : 210;
  const qrX = pageWidth - margin - qrSize;
  const qrY = cardY;
  const primary = hexToRgb01(template.primary_color, '#fffdf9');
  const foreground = hexToRgb01(template.text_color, '#8b4f2f');
  const businessName = businessNameForTemplate(template);
  const now = new Date().toLocaleDateString('de-CH');
  const description = String(template.description || templateTypeLabel(template)).slice(0, 90);
  const featureRows = cardFeatureRows(template).slice(0, 3);
  const activeFeatures = activeFeatureLabels(template, { includeBaseFallback: false });
  const featureLines = featureRows.map((row, index) => (
    textLine(`${row.label}: ${row.value}`.slice(0, 36), cardX + 18, cardY + cardHeight - 106 - (index * 14), 8, foreground)
  ));
  const activeFeatureLines = activeFeatures.slice(0, 6).map((label, index) => (
    textLine(`- ${label}`.slice(0, 32), qrX, qrY - 72 - (index * 14), 9, [0.25, 0.29, 0.36])
  ));

  return [
    logoMark(template, margin, pageHeight - margin - 16, 28, primary, foreground),
    textLine(businessName, margin + 38, pageHeight - margin, 20),
    textLine(template.card_name || 'Karte', margin, pageHeight - margin - 26, 28),
    textLine('Scannen und Karte zum Wallet hinzufügen', margin, pageHeight - margin - 58, 13, [0.25, 0.29, 0.36]),
    rect(cardX, cardY, cardWidth, cardHeight, primary),
    logoMark(template, cardX + 18, cardY + cardHeight - 36, 18, [1, 1, 1], primary),
    textLine(businessName, cardX + 42, cardY + cardHeight - 28, 11, foreground),
    textLine(template.card_name || 'Karte', cardX + 18, cardY + cardHeight - 58, 19, foreground),
    textLine(description, cardX + 18, cardY + cardHeight - 82, 9, foreground),
    ...featureLines,
    textLine(templateTypeLabel(template), cardX + 18, cardY + 32, 9, foreground),
    textLine(templateFeatureSummary(template).slice(0, 36), cardX + cardWidth - 90, cardY + 32, 9, foreground),
    textLine('Karten-ID wird beim Hinzufügen erzeugt', cardX + 18, cardY + 16, 7, foreground),
    rect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, [0.95, 0.96, 0.98]),
    drawQr(claimUrl, qrX, qrY, qrSize),
    textLine('Claim-Link', qrX, qrY - 26, 10, [0.25, 0.29, 0.36]),
    textLine(claimUrl.slice(0, 74), qrX, qrY - 42, 8, [0.25, 0.29, 0.36]),
    ...(activeFeatureLines.length ? [
      textLine('Aktivierte Funktionen', qrX, qrY - 58, 10, [0.25, 0.29, 0.36]),
      ...activeFeatureLines
    ] : []),
    textLine(`Template-ID: ${template.id}`, margin, margin + 36, 9, [0.35, 0.39, 0.47]),
    textLine(`Erstellt: ${now}`, margin, margin + 20, 9, [0.35, 0.39, 0.47])
  ].join('\n');
}

function object(content) {
  return `${content}\n`;
}

export function buildTemplateQrPdf({ template, claimUrl, format = 'a4' }) {
  const normalizedFormat = String(format || 'a4').toLowerCase() === 'a5' ? 'a5' : 'a4';
  const [pageWidth, pageHeight] = pageSizes[normalizedFormat];
  const content = buildContent(template, claimUrl, pageWidth, pageHeight);
  const stream = Buffer.from(content, 'utf8');
  const objects = [
    object('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj'),
    object('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj'),
    object(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth.toFixed(2)} ${pageHeight.toFixed(2)}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj`),
    object('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj'),
    object(`5 0 obj\n<< /Length ${stream.length} >>\nstream\n${content}\nendstream\nendobj`)
  ];
  const header = '%PDF-1.4\n';
  let body = header;
  const offsets = [0];

  for (const pdfObject of objects) {
    offsets.push(Buffer.byteLength(body, 'utf8'));
    body += pdfObject;
  }

  const xrefOffset = Buffer.byteLength(body, 'utf8');
  body += `xref\n0 ${objects.length + 1}\n`;
  body += '0000000000 65535 f \n';
  for (let index = 1; index < offsets.length; index += 1) {
    body += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(body, 'utf8');
}
