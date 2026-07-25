import { edgeFunctionUrl, loadPublicConfig } from './config.js';
import { byId, escapeHtml, showMessage } from './ui.js';

const messageNotice = byId('messageNotice');
const messageTitle = byId('messageTitle');
const messageMeta = byId('messageMeta');
const messageCard = byId('messageCard');
const messageBody = byId('messageBody');
const messageBusiness = byId('messageBusiness');
const messageCardName = byId('messageCardName');
const messageCardCode = byId('messageCardCode');
const messageHistorySection = byId('messageHistorySection');
const messageHistory = byId('messageHistory');

function formatDate(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString('de-CH', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

function platformLabel(value) {
  return {
    apple: 'Apple Wallet',
    google: 'Google Wallet'
  }[String(value || '').toLowerCase()] || 'Wallet';
}

function renderHistory(messages = []) {
  const olderMessages = messages.slice(1).filter((message) => message?.message);

  if (!olderMessages.length) {
    messageHistorySection.hidden = true;
    messageHistory.innerHTML = '';
    return;
  }

  messageHistorySection.hidden = false;
  messageHistory.innerHTML = olderMessages.map((message) => [
    '<article class="wallet-message-history-item">',
    '<strong>' + escapeHtml(message.title || 'Wallet Nachricht') + '</strong>',
    '<time>' + escapeHtml(formatDate(message.sentAt)) + '</time>',
    '<p>' + escapeHtml(message.message) + '</p>',
    '</article>'
  ].join('')).join('');
}

async function loadWalletMessage() {
  const params = new URLSearchParams(window.location.search);
  const card = params.get('card') || params.get('card_id') || '';
  const token = params.get('token') || '';

  if (!card || !token) {
    throw new Error('Dieser Nachrichten-Link ist unvollständig. Öffne die Nachricht direkt aus deiner Wallet-Karte.');
  }

  const publicConfig = await loadPublicConfig();
  const url = new URL(edgeFunctionUrl('get-wallet-message'));
  url.searchParams.set('card', card);
  url.searchParams.set('token', token);

  const response = await fetch(url, {
    headers: {
      apikey: publicConfig.supabase.anonKey,
      Authorization: 'Bearer ' + publicConfig.supabase.anonKey
    }
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data?.ok) {
    throw new Error(data.error_message || data.error || 'Nachricht konnte nicht geladen werden.');
  }

  const latest = data.latestMessage;

  if (!latest?.message) {
    showMessage(messageNotice, 'Für diese Karte ist noch keine Nachricht vorhanden.', 'info');
    messageTitle.textContent = data.card?.cardName || 'Nachricht';
    messageMeta.textContent = data.card?.businessName || 'El Promillo';
    return;
  }

  messageTitle.textContent = latest.title || 'Wallet Nachricht';
  messageMeta.textContent = [formatDate(latest.sentAt), platformLabel(latest.walletPlatform)].filter(Boolean).join(' · ');
  messageBody.textContent = latest.message;
  messageBusiness.textContent = data.card?.businessName || 'Mein Unternehmen';
  messageCardName.textContent = data.card?.cardName || 'Kundenkarte';
  messageCardCode.textContent = data.card?.cardInstanceNumber || data.card?.customerCode || '-';
  messageCard.hidden = false;
  renderHistory(data.messages || []);
}

loadWalletMessage().catch((error) => {
  messageTitle.textContent = 'Nachricht nicht verfügbar';
  messageMeta.textContent = 'El Promillo';
  showMessage(messageNotice, error.message || 'Nachricht konnte nicht geladen werden.', 'error');
});
