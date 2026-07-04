import { corsHeaders, createStructuredError, errorJson, json, walletNotificationService } from '../_shared/walletNotificationService.ts';

const resolveCampaignSelect = [
  'id',
  'owner_id',
  'business_id',
  'template_id',
  'target_type',
  'target_filter',
  'send_type',
  'scheduled_at',
  'location_lat',
  'location_lng',
  'location_radius_m',
  'status'
].join(',');

function stringValue(value: unknown) {
  return String(value || '').trim();
}

function incrementCounter(target: Record<string, number>, value: unknown) {
  const key = stringValue(value || 'unknown') || 'unknown';
  target[key] = Number(target[key] || 0) + 1;
}

function recipientSummary(recipients: Array<Record<string, unknown>>) {
  const statusCounts: Record<string, number> = {};
  const platformCounts: Record<string, number> = {};

  for (const recipient of recipients) {
    incrementCounter(statusCounts, recipient.status);
    incrementCounter(platformCounts, recipient.wallet_platform);
  }

  return {
    total: recipients.length,
    status_counts: statusCounts,
    platform_counts: platformCounts
  };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return json({
      error_code: 'METHOD_NOT_ALLOWED',
      error_message: 'Nur POST ist erlaubt.',
      error_reason: 'Empfänger werden per POST aufgelöst.'
    }, 405);
  }

  try {
    const context = await walletNotificationService.context(request);
    const body = await request.json().catch(() => ({}));
    const campaignId = stringValue(body.campaignId || body.campaign_id);

    if (!campaignId) {
      throw createStructuredError(400, 'CAMPAIGN_ID_REQUIRED', 'Kampagnen-ID fehlt.', 'Sende campaignId an diese Edge Function.');
    }

    const { data: campaign, error } = await context.supabaseAdmin
      .from('wallet_notification_campaigns')
      .select(resolveCampaignSelect)
      .eq('id', campaignId)
      .eq('owner_id', context.ownerId)
      .eq('business_id', context.business.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!campaign) {
      throw createStructuredError(
        404,
        'CAMPAIGN_NOT_FOUND',
        'Kampagne nicht gefunden.',
        'Die Kampagne gehört nicht zu deinem Business oder existiert nicht.'
      );
    }

    const recipients = await walletNotificationService.resolveRecipients(context, campaign);
    const summary = recipientSummary(recipients);

    return json({
      campaign_id: campaign.id,
      recipients_count: summary.total,
      recipient_summary: summary
    });
  } catch (error) {
    return errorJson(error, 'RESOLVE_WALLET_NOTIFICATION_RECIPIENTS_ERROR');
  }
});
