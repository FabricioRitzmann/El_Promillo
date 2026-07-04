// Supabase Edge Function: atomare Guthaben-Abbuchung.
//
// Die Funktion prüft Login, Unlock, Mandantenzugehörigkeit und die zentrale
// Template-Feature-Matrix. Die eigentliche Abbuchung läuft in
// public.redeem_card_balance(...) als SQL-Transaktion, damit Guthaben nie unter
// 0 fallen kann und Transaktions-/Event-Logs konsistent geschrieben werden.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { assertFeatureAllowed, normalizeTemplateType } from '../_shared/templateFeatures.ts';
import { publicOperatorCard } from '../_shared/publicResponses.ts';

type Row = Record<string, any>;

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

function stringValue(value: unknown) {
  return String(value || '').trim();
}

function errorJson(error: any) {
  const status = Number(error?.statusCode || error?.status || 500);

  return json({
    error: error?.message || error?.error_message || 'Unbekannter Fehler',
    error_code: error?.error_code || 'REDEEM_BALANCE_EDGE_ERROR',
    error_message: error?.error_message || error?.message || 'Guthaben-Abbuchung fehlgeschlagen.',
    error_reason: error?.error_reason || 'Bitte prüfe Karte, Betrag und Kartentyp.'
  }, status);
}

const redeemBalanceTemplateSelect = [
  'id',
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
  'is_active'
].join(',');

const redeemBalanceCardSelect = [
  'id',
  'owner_id',
  'business_id',
  'template_id',
  'card_instance_number',
  'customer_code',
  'status',
  'stamp_count',
  'streak_count',
  'vip_status',
  'pass_serial_number',
  'wallet_platform',
  'wallet_object_id',
  'wallet_serial_number',
  'balance_cents',
  'currency',
  'cloakroom_active',
  'cloakroom_started_at',
  'cloakroom_completed_at',
  'last_scanned_at',
  'metadata',
  'updated_at',
  'created_at',
  `card_templates(${redeemBalanceTemplateSelect})`
].join(',');

function rpcErrorToStructured(error: any) {
  const message = String(error?.message || '');
  const match = message.match(/^([A-Z_]+):\s*(.*)$/);

  if (!match) {
    return error;
  }

  const [, code, reason] = match;
  const statusByCode: Record<string, number> = {
    AUTH_REQUIRED: 401,
    CARD_ID_REQUIRED: 400,
    INVALID_REDEEM_AMOUNT: 400,
    CARD_NOT_FOUND: 404,
    CARD_FORBIDDEN: 403,
    OPERATOR_LOCKED: 403,
    ACTION_NOT_ALLOWED_FOR_TEMPLATE: 403,
    BALANCE_TOO_LOW: 409
  };
  const messageByCode: Record<string, string> = {
    AUTH_REQUIRED: 'Bitte erneut einloggen.',
    CARD_ID_REQUIRED: 'Karten-ID fehlt.',
    INVALID_REDEEM_AMOUNT: 'Ungültiger Abbuchungsbetrag.',
    CARD_NOT_FOUND: 'Kundenkarte nicht gefunden.',
    CARD_FORBIDDEN: 'Kein Zugriff auf diese Karte.',
    OPERATOR_LOCKED: 'Account nicht freigeschaltet.',
    ACTION_NOT_ALLOWED_FOR_TEMPLATE: 'Aktion nicht erlaubt für diesen Kartentyp.',
    BALANCE_TOO_LOW: 'Guthaben reicht nicht aus.'
  };

  return createStructuredError(
    statusByCode[code] || 500,
    code,
    messageByCode[code] || 'Guthaben-Abbuchung fehlgeschlagen.',
    reason || message
  );
}

async function requireAuthenticatedOperator(supabaseAdmin: any, request: Request) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    throw createStructuredError(
      401,
      'AUTH_REQUIRED',
      'Bitte erneut einloggen.',
      'Die Edge Function hat keinen gültigen Login-Token erhalten.'
    );
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

  if (userError || !userData?.user) {
    throw createStructuredError(
      401,
      'AUTH_INVALID',
      'Bitte erneut einloggen.',
      'Der Login-Token konnte nicht verifiziert werden.'
    );
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('operator_profiles')
    .select('id, unlock')
    .eq('id', userData.user.id)
    .single();

  if (profileError || !profile?.unlock) {
    throw createStructuredError(
      403,
      'OPERATOR_LOCKED',
      'Account nicht freigeschaltet.',
      'Guthaben-Abbuchungen sind nur für freigeschaltete Betreiber erlaubt.'
    );
  }

  return userData.user;
}

async function loadCard(supabaseAdmin: any, body: Row) {
  const cardId = stringValue(body.cardId || body.card_id || body.customerCardId || body.customer_card_id);
  const code = stringValue(body.customer_code || body.customerCode || body.cardInstanceNumber || body.card_instance_number || body.code);

  if (cardId) {
    const { data, error } = await supabaseAdmin
      .from('customer_cards')
      .select(redeemBalanceCardSelect)
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
      'Die Abbuchung braucht eine Kundenkarten-ID, Karten-ID oder einen Kundencode.'
    );
  }

  const { data: byCustomerCode, error: customerCodeError } = await supabaseAdmin
    .from('customer_cards')
    .select(redeemBalanceCardSelect)
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
    .select(redeemBalanceCardSelect)
    .eq('card_instance_number', code)
    .maybeSingle();

  if (instanceNumberError) {
    throw instanceNumberError;
  }

  return byInstanceNumber;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return json({
      error_code: 'METHOD_NOT_ALLOWED',
      error_message: 'Nur POST ist erlaubt.',
      error_reason: 'Guthaben-Abbuchungen müssen als POST gesendet werden.'
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

    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      throw createStructuredError(
        400,
        'INVALID_REDEEM_AMOUNT',
        'Ungültiger Abbuchungsbetrag.',
        'Bitte gib einen Betrag grösser als 0 in Rappen/Cents ein.'
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    const user = await requireAuthenticatedOperator(supabaseAdmin, request);
    const card = await loadCard(supabaseAdmin, body);

    if (!card) {
      throw createStructuredError(
        404,
        'CARD_NOT_FOUND',
        'Kundenkarte nicht gefunden.',
        'Die Karte existiert nicht oder wurde entfernt.'
      );
    }

    if (card.owner_id !== user.id) {
      throw createStructuredError(
        403,
        'CARD_FORBIDDEN',
        'Kein Zugriff auf diese Karte.',
        'Die Kundenkarte gehört zu einem anderen Betreiber.'
      );
    }

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

    const currentBalance = Number(card.balance_cents ?? card.metadata?.balance_cents ?? 0);

    if (currentBalance - amountCents < 0) {
      throw createStructuredError(
        409,
        'BALANCE_TOO_LOW',
        'Guthaben reicht nicht aus.',
        `Aktuell verfügbar: ${(currentBalance / 100).toFixed(2)} ${card.currency || template.settings?.currency || 'CHF'}.`
      );
    }

    const { data: redeemResult, error: redeemError } = await supabaseAdmin.rpc('redeem_card_balance', {
      p_customer_card_id: card.id,
      p_amount_cents: amountCents,
      p_created_by: user.id,
      p_source: stringValue(body.source) || 'redeem_balance_edge_function'
    });

    if (redeemError) {
      throw rpcErrorToStructured(redeemError);
    }

    const { data: updatedCard, error: updatedCardError } = await supabaseAdmin
      .from('customer_cards')
      .select(redeemBalanceCardSelect)
      .eq('id', card.id)
      .single();

    if (updatedCardError) {
      throw updatedCardError;
    }

    return json({
      ok: true,
      action: 'balance-redeem',
      template_type: normalizeTemplateType(template),
      result: redeemResult,
      card: publicOperatorCard(updatedCard)
    });
  } catch (error) {
    return errorJson(error);
  }
});
