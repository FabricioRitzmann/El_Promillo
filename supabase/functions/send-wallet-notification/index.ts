import { corsHeaders, createStructuredError, errorJson, json, walletNotificationService } from '../_shared/walletNotificationService.ts';

function stringValue(value: unknown) {
  return String(value || '').trim();
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return json({
      error_code: 'METHOD_NOT_ALLOWED',
      error_message: 'Nur POST ist erlaubt.',
      error_reason: 'Wallet-Benachrichtigungen müssen per POST gesendet werden.'
    }, 405);
  }

  try {
    const context = await walletNotificationService.context(request);
    const body = await request.json().catch(() => ({}));
    const campaignId = stringValue(body.campaignId || body.campaign_id);

    if (!campaignId) {
      throw createStructuredError(400, 'CAMPAIGN_ID_REQUIRED', 'Kampagnen-ID fehlt.', 'Sende campaignId an diese Edge Function.');
    }

    return json(await walletNotificationService.sendNow(context, campaignId));
  } catch (error) {
    return errorJson(error, 'SEND_WALLET_NOTIFICATION_ERROR');
  }
});
