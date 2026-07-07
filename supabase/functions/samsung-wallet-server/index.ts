// Samsung Partner Server API for Data Fetch Links.
//
// Samsung calls:
//   GET  /cards/{cardId}/{refId}?fields=...
//   POST /cards/{cardId}/{refId}?cc2=CH&event=ADDED
//
// The function validates Samsung's Bearer JWS before returning or storing any
// card data. For sandbox-only debugging, SAMSUNG_WALLET_ALLOW_UNVERIFIED_AUTH
// can be set to true, but production must use SAMSUNG_WALLET_SAMSUNG_PUBLIC_KEY_PEM.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
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
  'is_active',
  'created_at',
  'updated_at'
].join(',');

const samsungInstanceSelect = [
  'id',
  'owner_id',
  'business_id',
  'template_id',
  'ref_id',
  'customer_code',
  'card_id',
  'card_type',
  'card_sub_type',
  'country_code',
  'card_status',
  'samsung_callback_url',
  'last_event',
  'last_event_at',
  'last_synced_at',
  'metadata',
  'created_at',
  'updated_at',
  'businesses(name,logo_url)',
  `card_templates(${templateSelect})`
].join(',');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-request-id, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
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

function noContent(status = 204) {
  return new Response(null, {
    status,
    headers: corsHeaders
  });
}

function stringValue(value: unknown) {
  return String(value || '').trim();
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
    error_code: error?.error_code || 'SAMSUNG_WALLET_SERVER_ERROR',
    error_message: error?.error_message || error?.message || 'Samsung Partner Server konnte die Anfrage nicht verarbeiten.',
    error_reason: error?.error_reason || 'Bitte prüfe Route, Authorization und Samsung-Konfiguration.'
  }, status);
}

function routeParts(request: Request) {
  const url = new URL(request.url);
  const marker = '/samsung-wallet-server/';
  const route = url.pathname.includes(marker)
    ? url.pathname.slice(url.pathname.indexOf(marker) + marker.length)
    : url.pathname.replace(/^\/+/, '');

  return route.split('/').filter(Boolean);
}

function eventStatus(value: unknown) {
  const event = stringValue(value).toUpperCase();

  if (event === 'ADDED' || event === 'PROVISIONED' || event === 'UPDATED') {
    return 'active';
  }

  if (event === 'DELETED') {
    return 'deleted';
  }

  if (event === 'CANCELED' || event === 'CANCELLED') {
    return 'cancelled';
  }

  if (event === 'EXPIRED') {
    return 'expired';
  }

  return '';
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
      samsung_request_id: payload.samsung_request_id || null,
      samsung_event: payload.samsung_event || null,
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

async function loadSamsungInstance(supabaseAdmin: any, cardId: string, refId: string) {
  const { data, error } = await supabaseAdmin
    .from('samsung_wallet_instances')
    .select(samsungInstanceSelect)
    .eq('card_id', cardId)
    .eq('ref_id', refId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

function templateForInstance(instance: Row) {
  const template = Array.isArray(instance.card_templates) ? instance.card_templates[0] : instance.card_templates;
  const business = Array.isArray(instance.businesses) ? instance.businesses[0] : instance.businesses;

  return {
    ...(template || {}),
    businesses: business || template?.businesses || null
  };
}

function assertSamsungAuthorization(request: Request, cardId: string, refId: string) {
  const auth = samsungWalletProvider.verifyPartnerServerAuthorization(request, {
    method: request.method,
    path: `/cards/${cardId}/${refId}`,
    refId
  });

  if (!auth.ok) {
    throw createStructuredError(
      Number(auth.status || 401),
      auth.error_code || 'SAMSUNG_AUTHORIZATION_INVALID',
      auth.error_message || 'Samsung Authorization ist ungültig.',
      auth.error_reason || 'Die Anfrage wurde nicht von Samsung Wallet autorisiert.'
    );
  }

  return auth;
}

async function handleGetCardData(request: Request, supabaseAdmin: any, cardId: string, refId: string) {
  assertSamsungAuthorization(request, cardId, refId);

  const instance = await loadSamsungInstance(supabaseAdmin, cardId, refId);

  if (!instance) {
    return noContent(204);
  }

  const template = templateForInstance(instance);
  const payload = samsungWalletProvider.cardDataForInstance(template, instance, {
    refId,
    fields: new URL(request.url).searchParams.get('fields') || ''
  });

  if (!payload.ok) {
    throw createStructuredError(
      Number(payload.status || 501),
      payload.error_code || 'SAMSUNG_CARD_DATA_FAILED',
      payload.error_message || 'Samsung Card Data konnte nicht erstellt werden.',
      payload.error_reason || 'Prüfe Samsung-Konfiguration und Template-Daten.'
    );
  }

  const nowIso = new Date().toISOString();
  const { error: updateError } = await supabaseAdmin
    .from('samsung_wallet_instances')
    .update({
      last_synced_at: nowIso,
      updated_at: nowIso
    })
    .eq('id', instance.id);

  if (updateError) {
    throw updateError;
  }

  await insertSamsungEvent(supabaseAdmin, instance, 'get_card_data', {
    samsung_request_id: stringValue(request.headers.get('x-request-id')),
    fields: new URL(request.url).searchParams.get('fields') || null
  });

  return json({
    card: payload.card
  });
}

async function handleSendCardState(request: Request, supabaseAdmin: any, cardId: string, refId: string) {
  assertSamsungAuthorization(request, cardId, refId);

  const instance = await loadSamsungInstance(supabaseAdmin, cardId, refId);

  if (!instance) {
    return noContent(204);
  }

  const url = new URL(request.url);
  const body = await request.json().catch(() => ({})) as Row;
  const samsungEvent = stringValue(url.searchParams.get('event')).toUpperCase();
  const cc2 = stringValue(url.searchParams.get('cc2')).toUpperCase();
  const callbackUrl = stringValue(body.callback);
  const cardStatus = eventStatus(samsungEvent);
  const nowIso = new Date().toISOString();
  const updatePayload: Row = {
    last_event: samsungEvent || 'UNKNOWN',
    last_event_at: nowIso,
    updated_at: nowIso,
    metadata: {
      ...(instance.metadata || {}),
      last_samsung_cc2: cc2 || instance.country_code || null
    }
  };

  if (callbackUrl) {
    updatePayload.samsung_callback_url = callbackUrl;
  }

  if (cardStatus) {
    updatePayload.card_status = cardStatus;
  }

  const { error: updateError } = await supabaseAdmin
    .from('samsung_wallet_instances')
    .update(updatePayload)
    .eq('id', instance.id);

  if (updateError) {
    throw updateError;
  }

  await insertSamsungEvent(supabaseAdmin, instance, 'send_card_state', {
    samsung_request_id: stringValue(request.headers.get('x-request-id')),
    samsung_event: samsungEvent || null,
    cc2: cc2 || null,
    callback_present: Boolean(callbackUrl)
  });

  return json({ ok: true });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!['GET', 'POST'].includes(request.method)) {
    return json({
      error_code: 'METHOD_NOT_ALLOWED',
      error_message: 'Nur GET oder POST ist erlaubt.',
      error_reason: 'Samsung Partner Server API unterstützt Get Card Data und Send Card State.'
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

    const parts = routeParts(request);

    if (parts[0] !== 'cards' || parts.length !== 3) {
      throw createStructuredError(
        404,
        'SAMSUNG_ROUTE_NOT_FOUND',
        'Samsung Partner Server Route nicht gefunden.',
        'Erwartet wird /cards/{cardId}/{refId}.'
      );
    }

    const [, cardId, refId] = parts;

    if (!cardId || !refId) {
      throw createStructuredError(
        400,
        'SAMSUNG_ROUTE_PARAMS_REQUIRED',
        'Samsung Card ID oder Ref-ID fehlt.',
        'Die Route muss /cards/{cardId}/{refId} enthalten.'
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    if (request.method === 'GET') {
      return await handleGetCardData(request, supabaseAdmin, cardId, refId);
    }

    return await handleSendCardState(request, supabaseAdmin, cardId, refId);
  } catch (error) {
    return errorJson(error);
  }
});
