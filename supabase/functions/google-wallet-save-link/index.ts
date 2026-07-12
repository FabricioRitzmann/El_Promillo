// Supabase Edge Function: Google-Wallet-Save-Link erzeugen.
//
// Die öffentliche Claim-Seite legt zuerst per claim-card eine Karteninstanz an.
// Diese Funktion liest danach die gespeicherte Karte serverseitig und erzeugt
// den Save-to-Google-Wallet-Link über den gemeinsamen Google-Wallet-Provider.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { normalizeTemplateType } from '../_shared/templateFeatures.ts';
import { enforcePublicClaimRateLimit } from '../_shared/publicRateLimit.ts';
import { googleWalletProvider } from '../_shared/googleWalletProvider.ts';
import { ensureWalletAssetFallbacks } from '../_shared/walletAssetFallbacks.ts';

type Row = Record<string, any>;

const googleTemplateSelect = [
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
  'is_active',
  'created_at',
  'updated_at'
].join(',');

const googleCustomerCardSelect = [
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
  'wallet_platform',
  'wallet_object_id',
  'wallet_serial_number',
  'balance_cents',
  'currency',
  'cloakroom_active',
  'metadata',
  'created_at',
  'updated_at'
].join(',');

const googleClaimCardSelect = [
  googleCustomerCardSelect,
  `card_templates(${googleTemplateSelect})`
].join(',');

const googleCardInstanceSelect = [
  'id',
  'customer_card_id',
  'owner_id',
  'business_id',
  'template_id',
  'card_instance_number',
  'wallet_platform',
  'wallet_object_id',
  'wallet_serial_number',
  'google_object_id',
  'demographics_collected',
  'customer_gender',
  'resolved_emblem_key',
  'resolved_emblem_url',
  'emblem_updated_at',
  'current_streak',
  'current_stamps',
  'vip_level',
  'balance_cents',
  'currency',
  'cloakroom_active',
  'cloakroom_started_at',
  'cloakroom_completed_at',
  'created_at',
  'updated_at'
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
    error_code: error?.error_code || 'GOOGLE_WALLET_SAVE_LINK_ERROR',
    error_message: error?.error_message || error?.message || 'Google-Wallet-Link konnte nicht erstellt werden.',
    error_reason: error?.error_reason || 'Bitte prüfe die Google-Wallet-Konfiguration.'
  }, status);
}

function stringValue(value: unknown) {
  return String(value || '').trim();
}

async function loadGoogleCardInstance(supabaseAdmin: any, card: Row) {
  const { data, error } = await supabaseAdmin
    .from('card_instances')
    .select(googleCardInstanceSelect)
    .eq('customer_card_id', card.id)
    .eq('owner_id', card.owner_id)
    .eq('business_id', card.business_id)
    .eq('template_id', card.template_id)
    .eq('wallet_platform', 'google')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw createStructuredError(
      404,
      'GOOGLE_CARD_INSTANCE_NOT_FOUND',
      'Google-Karteninstanz nicht gefunden.',
      'Die Claim-Funktion muss neben der Kundenkarte auch eine passende card_instance für Google Wallet angelegt haben.'
    );
  }

  return data;
}

function googleProviderCardInstance(cardInstance: Row, card: Row) {
  const cardMetadata = card.metadata && typeof card.metadata === 'object' ? card.metadata : {};
  const instanceMetadata = cardInstance.metadata && typeof cardInstance.metadata === 'object' ? cardInstance.metadata : {};

  return {
    ...card,
    ...cardInstance,
    wallet_object_id: cardInstance.google_object_id || cardInstance.wallet_object_id || card.wallet_object_id,
    wallet_serial_number: cardInstance.wallet_serial_number || card.wallet_serial_number,
    card_instance_number: cardInstance.card_instance_number || card.card_instance_number || card.customer_code,
    current_stamps: cardInstance.current_stamps ?? card.stamp_count,
    current_streak: cardInstance.current_streak ?? card.streak_count,
    vip_level: cardInstance.vip_level || card.vip_status,
    balance_cents: cardInstance.balance_cents ?? card.balance_cents,
    currency: cardInstance.currency || card.currency,
    cloakroom_active: cardInstance.cloakroom_active ?? card.cloakroom_active,
    metadata: {
      ...cardMetadata,
      ...instanceMetadata
    },
    customer_cards: card
  };
}

function googleProviderError(result: Row) {
  return createStructuredError(
    Number(result.status || result.statusCode || 502),
    stringValue(result.error_code) || 'GOOGLE_WALLET_SAVE_LINK_PROVIDER_FAILED',
    stringValue(result.error_message) || 'Google-Wallet-Link konnte nicht erstellt werden.',
    stringValue(result.error_reason) || 'Der gemeinsame Google-Wallet-Provider konnte keinen Save-Link erzeugen.'
  );
}

async function logGoogleSaveLink(supabaseAdmin: any, card: Row, cardInstance: Row, status: string, payload: Row, errorMessage: string | null = null) {
  const { error: logError } = await supabaseAdmin.from('wallet_push_logs').insert({
    owner_id: card.owner_id,
    business_id: card.business_id,
    card_instance_id: cardInstance.id,
    wallet_platform: 'google',
    action: 'google_wallet_save_link',
    status,
    request_payload: {
      customer_card_id: card.id,
      card_instance_id: cardInstance.id,
      template_id: card.template_id,
      wallet_object_id: payload.objectId,
      object_type: payload.objectType,
      reused_save_link: Boolean(payload.reusedSaveLink),
      generated_wallet_assets: payload.generatedWalletAssets || []
    },
    response_payload: {
      object_id: payload.objectId,
      class_id: payload.classId,
      object_type: payload.objectType,
      save_url_present: Boolean(payload.saveUrl),
      save_url_length: stringValue(payload.saveUrl).length,
      reused_save_link: Boolean(payload.reusedSaveLink),
      generated_wallet_assets: payload.generatedWalletAssets || []
    },
    error_message: errorMessage
  });

  if (logError) {
    throw createStructuredError(
      500,
      'WALLET_PUSH_LOG_INSERT_FAILED',
      'Wallet Audit-Log konnte nicht gespeichert werden.',
      logError.message || 'google_wallet_save_link konnte nicht in wallet_push_logs geschrieben werden.'
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
      error_reason: 'Google-Wallet-Save-Links müssen als POST angefordert werden.'
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
    const cardId = stringValue(body.cardId || body.card_id);
    const templateId = stringValue(body.templateId || body.template_id);
    const walletObjectId = stringValue(body.walletObjectId || body.wallet_object_id);

    if (!cardId || !templateId) {
      throw createStructuredError(
        400,
        'CARD_AND_TEMPLATE_REQUIRED',
        'Karten-ID oder Template-ID fehlt.',
        'Die Claim-Seite muss cardId und templateId an die Google-Wallet-Function senden.'
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    await enforcePublicClaimRateLimit(supabaseAdmin, request, 'google-wallet-save-link');

    const { data: card, error: cardError } = await supabaseAdmin
      .from('customer_cards')
      .select(googleClaimCardSelect)
      .eq('id', cardId)
      .eq('template_id', templateId)
      .eq('wallet_platform', 'google')
      .maybeSingle();

    if (cardError) {
      throw cardError;
    }

    if (!card || !card.card_templates) {
      throw createStructuredError(
        404,
        'GOOGLE_WALLET_CARD_NOT_FOUND',
        'Google-Wallet-Karte nicht gefunden.',
        'Erstelle die Karteninstanz zuerst über die Claim-Funktion.'
      );
    }

    if (!stringValue(card.business_id)) {
      throw createStructuredError(
        409,
        'GOOGLE_WALLET_BUSINESS_REQUIRED',
        'Diese Karte ist keinem Business zugeordnet.',
        'Öffne die Karte im Editor und speichere sie erneut oder verknüpfe alte Templates/Kundenkarten mit deinem Business.'
      );
    }

    const storedWalletObjectId = stringValue(card.wallet_object_id || card.wallet_serial_number);
    const googleWalletClaimKey = stringValue(card.metadata?.google_wallet_claim_key || storedWalletObjectId);
    const acceptedClaimKeys = new Set([storedWalletObjectId, googleWalletClaimKey].filter(Boolean));

    if (!walletObjectId || acceptedClaimKeys.size === 0 || !acceptedClaimKeys.has(walletObjectId)) {
      throw createStructuredError(
        403,
        'GOOGLE_CLAIM_TOKEN_MISMATCH',
        'Karte passt nicht zu diesem Browser-Claim.',
        'Der gespeicherte Claim-Schlüssel stimmt nicht mit der angefragten Google-Wallet-Karte ueberein.'
      );
    }

    const cardInstance = await loadGoogleCardInstance(supabaseAdmin, card);
    const providerCardInstance = googleProviderCardInstance(cardInstance, card);
    const generatedAssetFallbacks = await ensureWalletAssetFallbacks({
      supabaseAdmin,
      supabaseUrl,
      ownerId: card.owner_id,
      businessId: card.business_id,
      template: card.card_templates,
      cardInstance: providerCardInstance,
      walletPlatform: 'google'
    });
    const saveLinkResult = await googleWalletProvider.generateSaveLink(card.card_templates, providerCardInstance, {
      supabaseAdmin,
      generatedAssetUrls: generatedAssetFallbacks.generatedAssetUrls
    });

    if (!saveLinkResult.ok) {
      throw googleProviderError(saveLinkResult);
    }

    const saveUrl = stringValue(saveLinkResult.saveUrl);
    const objectId = stringValue(saveLinkResult.objectId);
    const classId = stringValue(saveLinkResult.classId);
    const objectType = stringValue(saveLinkResult.objectType);
    const reusedSaveLink = false;

    if (!saveUrl || !objectId || !classId || !objectType) {
      throw createStructuredError(
        502,
        'GOOGLE_WALLET_SAVE_LINK_INCOMPLETE',
        'Google Wallet Save-Link ist unvollständig.',
        'Der gemeinsame Google-Wallet-Provider muss saveUrl, objectId, classId und objectType liefern.'
      );
    }

    if (card.wallet_object_id !== objectId || card.wallet_serial_number !== objectId) {
      const { data: updatedCustomerCard, error: cardUpdateError } = await supabaseAdmin
        .from('customer_cards')
        .update({
          wallet_object_id: objectId,
          wallet_serial_number: objectId,
          metadata: {
            ...(card.metadata || {}),
            google_wallet_claim_key: googleWalletClaimKey,
            google_wallet_object_id: objectId
          }
        })
        .eq('id', card.id)
        .eq('owner_id', card.owner_id)
        .eq('business_id', card.business_id)
        .eq('template_id', card.template_id)
        .eq('wallet_platform', 'google')
        .select('id')
        .maybeSingle();

      if (cardUpdateError || !updatedCustomerCard) {
        throw createStructuredError(
          500,
          'GOOGLE_CUSTOMER_CARD_UPDATE_FAILED',
          'Google Wallet Daten konnten nicht auf der Kundenkarte gespeichert werden.',
          cardUpdateError?.message || 'google-wallet-save-link konnte customer_cards nicht für die erwartete Google-Kundenkarte aktualisieren.'
        );
      }
    }

    const { data: updatedCardInstance, error: cardInstanceUpdateError } = await supabaseAdmin
      .from('card_instances')
      .update({
        wallet_object_id: objectId,
        wallet_serial_number: objectId,
        google_object_id: objectId
      })
      .eq('id', cardInstance.id)
      .eq('customer_card_id', card.id)
      .eq('owner_id', card.owner_id)
      .eq('business_id', card.business_id)
      .eq('template_id', card.template_id)
      .eq('wallet_platform', 'google')
      .select('id')
      .maybeSingle();

    if (cardInstanceUpdateError || !updatedCardInstance) {
      throw createStructuredError(
        500,
        'CARD_WALLET_STATE_UPDATE_FAILED',
        'Wallet-Status der Karteninstanz konnte nicht gespeichert werden.',
        cardInstanceUpdateError?.message || 'google-wallet-save-link konnte die Google-Wallet-IDs nicht für die erwartete Karteninstanz speichern.'
      );
    }

    const { data: updatedGoogleObject, error: googleObjectUpsertError } = await supabaseAdmin
      .from('google_wallet_objects')
      .upsert({
        owner_id: card.owner_id,
        card_instance_id: cardInstance.id,
        business_id: card.business_id,
        template_id: card.template_id,
        issuer_id: objectId.split('.')[0],
        class_id: classId,
        object_id: objectId,
        object_type: objectType,
        save_url: saveUrl,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'card_instance_id'
      })
      .select('id')
      .maybeSingle();

    if (googleObjectUpsertError || !updatedGoogleObject) {
      throw createStructuredError(
        500,
        'GOOGLE_WALLET_OBJECT_SAVE_FAILED',
        'Google Wallet Object-Zuordnung konnte nicht gespeichert werden.',
        googleObjectUpsertError?.message || 'google-wallet-save-link konnte google_wallet_objects nicht für die erwartete Karteninstanz aktualisieren.'
      );
    }

    const { error: eventInsertError } = await supabaseAdmin.from('card_events').insert({
      owner_id: card.owner_id,
      business_id: card.business_id,
      template_id: card.template_id,
      customer_card_id: card.id,
      event_type: 'google_wallet_save_link_created',
      details: {
        source: 'google_wallet_save_link_edge_function',
        wallet_platform: 'google',
        wallet_object_id: objectId,
        customer_card_id: card.id,
        card_instance_id: cardInstance.id,
        google_wallet_object_recorded: true,
        reused_save_link: reusedSaveLink,
        object_type: objectType,
        generated_wallet_assets: generatedAssetFallbacks.generatedAssets,
        template_type: normalizeTemplateType(card.card_templates)
      }
    });

    if (eventInsertError) {
      throw createStructuredError(
        500,
        'GOOGLE_WALLET_EVENT_LOG_FAILED',
        'Google Wallet Ereignis konnte nicht gespeichert werden.',
        eventInsertError.message || 'google-wallet-save-link konnte card_events nicht schreiben.'
      );
    }

    await logGoogleSaveLink(supabaseAdmin, card, cardInstance, 'sent', {
      objectId,
      classId,
      objectType,
      saveUrl,
      reusedSaveLink,
      generatedWalletAssets: generatedAssetFallbacks.generatedAssets
    });

    return json({
      ok: true,
      saveUrl,
      walletObjectId: objectId,
      reused: reusedSaveLink,
      objectType,
      card: {
        id: card.id,
        card_instance_number: card.card_instance_number,
        customer_code: card.customer_code,
        wallet_platform: 'google',
        wallet_object_id: objectId
      }
    });
  } catch (error) {
    return errorJson(error);
  }
});
