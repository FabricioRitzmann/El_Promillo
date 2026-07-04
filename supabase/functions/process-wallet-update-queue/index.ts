import { corsHeaders, errorJson, json, walletNotificationService } from '../_shared/walletNotificationService.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return json({
      error_code: 'METHOD_NOT_ALLOWED',
      error_message: 'Nur POST ist erlaubt.',
      error_reason: 'Queue-Verarbeitung wird per POST gestartet.'
    }, 405);
  }

  try {
    const context = await walletNotificationService.automationContext(request);

    return json({
      queued: await walletNotificationService.processWalletUpdateQueue(context)
    });
  } catch (error) {
    return errorJson(error, 'PROCESS_WALLET_UPDATE_QUEUE_ERROR');
  }
});
