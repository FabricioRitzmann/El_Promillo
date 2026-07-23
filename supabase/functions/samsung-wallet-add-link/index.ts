// Public Edge Function: creates a Samsung Wallet Data Fetch add link.
//
// This function stores a Samsung refId server-side and returns only the public
// Add-to-Wallet URL. It does not expose service-role secrets or certificate
// material to the browser.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { enforcePublicClaimRateLimit } from '../_shared/publicRateLimit.ts';
import { samsungWalletProvider } from '../_shared/samsungWalletProvider.ts';

type Row = Record<string, any>;

const templateSelect = [
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
  'businesses(name,logo_url)',
  'reward_text',
  'stamps_required',
  'streak_goal',
  'vip_tier',
  'settings',
  'club_features',
  'club_settings',
  'public_claim_token',
  'is_active'
].join(',');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function json(body: Row, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}

function stringValue(value: unknown) {
  return String(value || '').trim();
}

function claimToken(value: unknown) {
  const token = stringValue(value).toLowerCase();

  return /^[a-f0-9]{36}$/.test(token) ? token : '';
}

function createStructuredError(statusCode: number, errorCode: string, message: string, reason: string) {
  return {
    statusCode,
    error_code: errorCode,
    error_message: message,
    error_reason: reason
  };
}

function errorJson(error: any) {
  const status = Number(error?.statusCode || error?.status || 500);

  return json({
    error: error?.message || error?.error_message || 'Unbekannter Fehler',
    error_code: error?.error_code || 'SAMSUNG_WALLET_ADD_LINK_ERROR',
    error_message: error?.error_message || error?.message || 'Samsung Wallet Link konnte nicht erstellt werden.',
    error_reason: error?.error_reason || 'Bitte prüfe Template, Supabase Secrets und Samsung-Konfiguration.'
  }, status);
}

function generateCustomerCode(refId: string) {
  return `SW-${refId.replace(/^sw_/, '').toUpperCase()}`;
}

async function insertSamsungEvent(supabaseAdmin: any, instance: Row, eventType: string, payload: Row = {}) {
  const { error } = await supabaseAdmin
    .from('samsung_wallet_events')
    .insert({
      samsung_wallet_instance_id: instance.id,
      owner_id: instance.owner_id,
      business_id: instance.business_id,
      template_id: instance.template_id,
      ref_id: instance.ref_id,
      event_type: eventType,
      request_payload: payload
    });

  if (error) {
    throw createStructuredError(
      500,
      'SAMSUNG_EVENT_SAVE_FAILED',
      'Samsung Wallet Ereignis konnte nicht gespeichert werden.',
      error.message || 'samsung_wallet_events.insert hat einen Fehler zurückgegeben.'
    );
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return json({
      error_code: 'METHOD_NOT_ALLOWED',
      error_message: 'Nur POST ist erlaubt.',
      error_reason: 'Samsung Add-Links werden serverseitig per POST vorbereitet.'
    }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw createStructuredError(
        500,
        'SUPABASE_EDGE_CONFIG_MISSING',
        'Supabase Edge Secrets fehlen.',
        'Setze SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY für diese Edge Function.'
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    await enforcePublicClaimRateLimit(supabaseAdmin, request, 'samsung-wallet-add-link');

    const body = await request.json().catch(() => ({})) as Row;
    const templateId = stringValue(body.templateId || body.template_id);
    const token = claimToken(body.token || body.claimToken || body.claim_token);

    if (!templateId && !token) {
      throw createStructuredError(
        400,
        'CLAIM_LINK_REQUIRED',
        'Template fehlt.',
        'Die öffentliche Wallet-Seite muss einen gültigen Claim-Token oder eine Template-ID senden.'
      );
    }

    const config = samsungWalletProvider.config();

    if (!config.configured) {
      throw createStructuredError(
        501,
        'SAMSUNG_WALLET_CONFIG_MISSING',
        'Samsung Wallet ist noch nicht vollständig konfiguriert.',
        `Fehlende Supabase Secrets: ${(config.missing || []).join(', ')}.`
      );
    }

    const templateQuery = supabaseAdmin
      .from('card_templates')
      .select(templateSelect)
      .eq('is_active', true);

    const { data: template, error: templateError } = await (token
      ? templateQuery.eq('public_claim_token', token)
      : templateQuery.eq('id', templateId)
    )
      .maybeSingle();

    if (templateError) {
      throw templateError;
    }

    if (!template) {
      throw createStructuredError(
        404,
        'TEMPLATE_NOT_FOUND',
        'Template nicht gefunden oder inaktiv.',
        'Diese Samsung Wallet Karte ist nicht verfügbar.'
      );
    }

    const refId = samsungWalletProvider.randomRefId();
    const customerCode = generateCustomerCode(refId);
    const { data: instance, error: insertError } = await supabaseAdmin
      .from('samsung_wallet_instances')
      .insert({
        owner_id: template.owner_id,
        business_id: template.business_id,
        template_id: template.id,
        ref_id: refId,
        customer_code: customerCode,
        card_id: config.cardId,
        card_type: config.cardType,
        card_sub_type: config.cardSubType,
        country_code: config.countryCode,
        add_flow: config.addFlow,
        card_status: 'pending',
        metadata: {
          source: 'samsung-wallet-add-link',
          add_flow: config.addFlow,
          template_type: template.template_type,
          customer_code: customerCode
        }
      })
      .select('id, owner_id, business_id, template_id, ref_id, customer_code, card_id, card_type, card_sub_type, country_code, add_flow, card_status, created_at, updated_at')
      .single();

    if (insertError) {
      throw createStructuredError(
        500,
        'SAMSUNG_INSTANCE_SAVE_FAILED',
        'Samsung Wallet Instanz konnte nicht gespeichert werden.',
        insertError.message || 'samsung_wallet_instances.insert hat einen Fehler zurückgegeben.'
      );
    }

    const link = samsungWalletProvider.generateAddLink(template, instance);

    if (!link.ok) {
      throw createStructuredError(
        Number(link.status || 501),
        link.error_code || 'SAMSUNG_ADD_LINK_FAILED',
        link.error_message || 'Samsung Wallet Link konnte nicht erzeugt werden.',
        link.error_reason || 'Prüfe Samsung-Konfiguration und refId.'
      );
    }

    await insertSamsungEvent(supabaseAdmin, instance, 'add_link_created', {
      template_id: template.id,
      card_id: config.cardId,
      add_flow: link.addFlow || config.addFlow
    });

    return json({
      ok: true,
      provider: 'samsung',
      addUrl: link.addUrl,
      addFlow: link.addFlow || config.addFlow,
      cardId: link.cardId || config.cardId,
      partnerCode: link.partnerCode || config.partnerCode,
      rdClickUrl: link.rdClickUrl || config.rdClickUrl,
      rdImpressionUrl: link.rdImpressionUrl || config.rdImpressionUrl,
      refId: link.refId,
      card: {
        customer_code: instance.customer_code,
        card_status: instance.card_status
      }
    });
  } catch (error) {
    return errorJson(error);
  }
});
