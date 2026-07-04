import { corsHeaders, createStructuredError, errorJson, json, walletNotificationService } from '../_shared/walletNotificationService.ts';

const limitCardInstanceSelect = [
  'id',
  'customer_card_id',
  'owner_id',
  'business_id',
  'template_id',
  'customer_id',
  'wallet_platform',
  'push_enabled'
].join(',');

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
      error_reason: 'Limit-Prüfungen werden per POST ausgeführt.'
    }, 405);
  }

  try {
    const context = await walletNotificationService.context(request);
    const body = await request.json().catch(() => ({}));
    const cardInstanceId = stringValue(body.cardInstanceId || body.card_instance_id);
    const requestedWalletPlatform = stringValue(body.walletPlatform || body.wallet_platform);

    if (!cardInstanceId) {
      return json(await walletNotificationService.previewNotificationLimits(context, body));
    }

    const { data: cardInstance, error } = await context.supabaseAdmin
      .from('card_instances')
      .select(limitCardInstanceSelect)
      .eq('id', cardInstanceId)
      .eq('owner_id', context.ownerId)
      .eq('business_id', context.business.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!cardInstance) {
      throw createStructuredError(404, 'CARD_INSTANCE_NOT_FOUND', 'Karteninstanz nicht gefunden.', 'Die Karte gehört nicht zu deinem Account.');
    }

    const walletPlatform = requestedWalletPlatform || stringValue(cardInstance.wallet_platform);

    return json(await walletNotificationService.checkPlatformLimits(context, cardInstance, walletPlatform));
  } catch (error) {
    return errorJson(error, 'CHECK_WALLET_NOTIFICATION_LIMITS_ERROR');
  }
});
