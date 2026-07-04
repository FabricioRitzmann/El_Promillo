// Supabase Edge Function: Payment-Session für Guthaben-Aufladung.
//
// Diese Funktion erzeugt eine pending Topup-Session für Karten mit erlaubter
// Guthabenfunktion. Echte Provider-Redirects werden über serverseitige Secrets
// ergänzt; ohne Provider bleibt die Session als nachvollziehbarer Pending-
// Datensatz bestehen und verändert noch kein Kartenguthaben.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { assertFeatureAllowed, normalizeTemplateType } from '../_shared/templateFeatures.ts';
import { enforcePublicClaimRateLimit } from '../_shared/publicRateLimit.ts';

type Row = Record<string, any>;
const TOPUP_CLAIM_KEY_MAX_LENGTH = 180;
const TOPUP_CLAIM_KEY_PATTERN = /^[A-Za-z0-9._:-]+$/;

const topupTemplateSelect = [
  'id',
  'owner_id',
  'business_id',
  'card_type',
  'template_type',
  'settings'
].join(',');

const topupCardSelect = [
  'id',
  'owner_id',
  'business_id',
  'template_id',
  'card_instance_number',
  'customer_code',
  'wallet_object_id',
  'wallet_serial_number',
  'currency',
  'metadata',
  `card_templates(${topupTemplateSelect})`
].join(',');

const topupPaymentSessionSelect = [
  'id',
  'amount_cents',
  'currency',
  'status',
  'checkout_url',
  'metadata',
  'created_at'
].join(',');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
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
    error_code: error?.error_code || 'CREATE_TOPUP_SESSION_ERROR',
    error_message: error?.error_message || error?.message || 'Topup-Session konnte nicht erstellt werden.',
    error_reason: error?.error_reason || 'Bitte prüfe Karte, Betrag und Kartentyp.'
  }, status);
}

function stringValue(value: unknown) {
  return String(value || '').trim();
}

function checkoutUrl(baseUrl: string, providerSessionId: string) {
  if (!baseUrl) {
    return null;
  }

  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}session=${encodeURIComponent(providerSessionId)}`;
}

function centsSetting(value: unknown, fallbackCents: number) {
  const directCents = Number(value);

  if (Number.isFinite(directCents) && directCents > 0) {
    return Math.round(directCents);
  }

  return fallbackCents;
}

function amountSettingToCents(value: unknown, fallbackCents: number) {
  const amount = Number(String(value || '').replace(',', '.'));

  if (Number.isFinite(amount) && amount > 0) {
    return Math.round(amount * 100);
  }

  return fallbackCents;
}

function publicTopupPaymentSession(session: Row) {
  return {
    id: session.id,
    amount_cents: session.amount_cents,
    currency: session.currency,
    status: session.status,
    checkout_url: session.checkout_url,
    provider_setup_required: Boolean(session.metadata?.provider_setup_required),
    created_at: session.created_at
  };
}

function validateTopupClaimKey(walletObjectId: string) {
  if (!walletObjectId) {
    throw createStructuredError(
      400,
      'TOPUP_CLAIM_KEY_REQUIRED',
      'Claim-Schlüssel fehlt.',
      'Die öffentliche Claim-Seite muss walletObjectId senden, damit nur der aktuelle Browser-Claim eine Topup-Session für diese Karte erstellen kann.'
    );
  }

  if (walletObjectId.length > TOPUP_CLAIM_KEY_MAX_LENGTH || !TOPUP_CLAIM_KEY_PATTERN.test(walletObjectId)) {
    throw createStructuredError(
      400,
      'TOPUP_CLAIM_KEY_INVALID',
      'Claim-Schlüssel ist ungültig.',
      'walletObjectId darf maximal 180 Zeichen enthalten und nur Buchstaben, Zahlen, Punkt, Unterstrich, Bindestrich oder Doppelpunkt nutzen.'
    );
  }
}

function assertTopupClaimKey(card: Row, walletObjectId: string) {
  const metadata = card.metadata && typeof card.metadata === 'object' && !Array.isArray(card.metadata)
    ? card.metadata
    : {};
  const acceptedClaimKeys = new Set([
    stringValue(card.wallet_object_id),
    stringValue(card.wallet_serial_number),
    stringValue(metadata.google_wallet_claim_key)
  ].filter(Boolean));

  if (!acceptedClaimKeys.has(walletObjectId)) {
    throw createStructuredError(
      403,
      'TOPUP_CLAIM_KEY_MISMATCH',
      'Karte passt nicht zu diesem Browser-Claim.',
      'Der gespeicherte Claim-Schlüssel stimmt nicht mit der angefragten Topup-Karte ueberein.'
    );
  }
}

async function loadCard(supabaseAdmin: any, body: Row) {
  const cardId = stringValue(body.cardId || body.card_id || body.customerCardId || body.customer_card_id);
  const code = stringValue(body.customer_code || body.customerCode || body.cardInstanceNumber || body.card_instance_number || body.code);

  if (cardId) {
    const { data, error } = await supabaseAdmin
      .from('customer_cards')
      .select(topupCardSelect)
      .eq('id', cardId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }

  if (!code) {
    throw createStructuredError(
      400,
      'CARD_ID_REQUIRED',
      'Karten-ID fehlt.',
      'Die Topup-Session braucht eine Kundenkarten-ID, Karten-ID oder einen Kundencode.'
    );
  }

  const { data: byCustomerCode, error: customerCodeError } = await supabaseAdmin
    .from('customer_cards')
    .select(topupCardSelect)
    .eq('customer_code', code)
    .maybeSingle();

  if (customerCodeError) {
    throw customerCodeError;
  }

  if (byCustomerCode) {
    return byCustomerCode;
  }

  const { data: byInstanceNumber, error: instanceNumberError } = await supabaseAdmin
    .from('customer_cards')
    .select(topupCardSelect)
    .eq('card_instance_number', code)
    .maybeSingle();

  if (instanceNumberError) {
    throw instanceNumberError;
  }

  return byInstanceNumber;
}

async function loadTopupCardInstance(supabaseAdmin: any, card: Row) {
  const { data, error } = await supabaseAdmin
    .from('card_instances')
    .select('id')
    .eq('customer_card_id', card.id)
    .eq('owner_id', card.owner_id)
    .eq('business_id', card.business_id)
    .eq('template_id', card.template_id)
    .maybeSingle();

  if (error) {
    throw createStructuredError(
      500,
      'TOPUP_CARD_INSTANCE_LOOKUP_FAILED',
      'Karteninstanz konnte nicht geladen werden.',
      error.message || 'card_instances.select hat einen Fehler zurückgegeben.'
    );
  }

  if (!data?.id) {
    throw createStructuredError(
      409,
      'TOPUP_CARD_INSTANCE_REQUIRED',
      'Karteninstanz fehlt.',
      'Diese Wallet-Karte hat keine verknüpfte card_instance. Claim die Karte erneut oder synchronisiere die Karteninstanz, bevor eine Topup-Session erstellt wird.'
    );
  }

  return data;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return json({
      error_code: 'METHOD_NOT_ALLOWED',
      error_message: 'Nur POST ist erlaubt.',
      error_reason: 'Topup-Sessions müssen als POST erstellt werden.'
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

    const body = await request.json().catch(() => ({})) as Row;
    const amountCents = Math.round(Number(body.amountCents ?? body.amount_cents ?? 0));
    const walletObjectId = stringValue(body.walletObjectId || body.wallet_object_id || body.claimKey || body.claim_key);

    validateTopupClaimKey(walletObjectId);

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    await enforcePublicClaimRateLimit(supabaseAdmin, request, 'create-topup-payment-session', {
      limit: 40,
      windowSeconds: 900
    });

    const card = await loadCard(supabaseAdmin, body);

    if (!card) {
      throw createStructuredError(
        404,
        'CARD_NOT_FOUND',
        'Kundenkarte nicht gefunden.',
        'Die Karte existiert nicht oder wurde entfernt.'
      );
    }

    assertTopupClaimKey(card, walletObjectId);

    const template = card.card_templates;

    if (!template) {
      throw createStructuredError(
        404,
        'TEMPLATE_NOT_FOUND',
        'Template zur Kundenkarte nicht gefunden.',
        'Die Kundenkarte ist keinem gültigen Template zugeordnet.'
      );
    }

    try {
      assertFeatureAllowed(template, 'balance');
    } catch (error) {
      throw {
        ...(error as Row),
        statusCode: 403,
        template_type: normalizeTemplateType(template)
      };
    }

    const minTopupCents = template.settings?.minTopupCents
      ? centsSetting(template.settings.minTopupCents, 100)
      : amountSettingToCents(template.settings?.minBalanceAmount, 100);
    const maxTopupCents = template.settings?.maxTopupCents
      ? centsSetting(template.settings.maxTopupCents, 100000)
      : amountSettingToCents(template.settings?.maxBalanceAmount, 100000);

    if (!Number.isFinite(amountCents) || amountCents < minTopupCents || amountCents > maxTopupCents) {
      throw createStructuredError(
        400,
        'INVALID_TOPUP_AMOUNT',
        'Ungültiger Aufladebetrag.',
        `Erlaubt sind ${(minTopupCents / 100).toFixed(2)} bis ${(maxTopupCents / 100).toFixed(2)} ${card.currency || template.settings?.currency || 'CHF'}.`
      );
    }

    const provider = stringValue(Deno.env.get('PAYMENT_PROVIDER')) || 'manual';
    const providerSessionId = `${provider}_${crypto.randomUUID()}`;
    const checkoutBaseUrl = stringValue(Deno.env.get('PAYMENT_CHECKOUT_BASE_URL'));
    const sessionCheckoutUrl = checkoutUrl(checkoutBaseUrl, providerSessionId);
    const instance = await loadTopupCardInstance(supabaseAdmin, card);

    const { data: session, error: sessionError } = await supabaseAdmin
      .from('topup_payment_sessions')
      .insert({
        owner_id: card.owner_id,
        business_id: card.business_id,
        customer_card_id: card.id,
        card_instance_id: instance.id,
        amount_cents: amountCents,
        currency: card.currency || template.settings?.currency || 'CHF',
        payment_provider: provider,
        provider_session_id: providerSessionId,
        checkout_url: sessionCheckoutUrl,
        metadata: {
          source: 'create_topup_payment_session_edge_function',
          template_type: normalizeTemplateType(template),
          provider_setup_required: !sessionCheckoutUrl
        }
      })
      .select(topupPaymentSessionSelect)
      .single();

    if (sessionError || !session) {
      throw createStructuredError(
        500,
        'TOPUP_SESSION_SAVE_FAILED',
        'Topup-Session konnte nicht gespeichert werden.',
        sessionError?.message || 'topup_payment_sessions.insert hat keine Session zurückgegeben.'
      );
    }

    return json({
      ok: true,
      provider_setup_required: !sessionCheckoutUrl,
      error_code: sessionCheckoutUrl ? null : 'PAYMENT_PROVIDER_NOT_CONFIGURED',
      error_message: sessionCheckoutUrl ? null : 'Payment Provider ist noch nicht verbunden.',
      error_reason: sessionCheckoutUrl ? null : 'Setze PAYMENT_PROVIDER und PAYMENT_CHECKOUT_BASE_URL in Supabase Secrets, sobald ein echter Anbieter angebunden ist.',
      template_type: normalizeTemplateType(template),
      topup_payment_session: publicTopupPaymentSession(session)
    });
  } catch (error) {
    return errorJson(error);
  }
});
