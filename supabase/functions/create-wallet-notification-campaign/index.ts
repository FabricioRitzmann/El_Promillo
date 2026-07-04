import { corsHeaders, errorJson, json, walletNotificationService } from '../_shared/walletNotificationService.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return json({
      error_code: 'METHOD_NOT_ALLOWED',
      error_message: 'Nur POST ist erlaubt.',
      error_reason: 'Wallet-Kampagnen müssen per POST erstellt werden.'
    }, 405);
  }

  try {
    const context = await walletNotificationService.context(request);
    const body = await request.json().catch(() => ({}));
    const idempotencyKey = request.headers.get('idempotency-key');
    const result = await walletNotificationService.createCampaign(context, {
      ...body,
      idempotencyKey: body.idempotencyKey || body.idempotency_key || idempotencyKey
    });

    return json(result);
  } catch (error) {
    return errorJson(error, 'CREATE_WALLET_NOTIFICATION_CAMPAIGN_ERROR');
  }
});
