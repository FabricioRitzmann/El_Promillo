import { corsHeaders, createStructuredError, errorJson, json, walletNotificationService } from '../_shared/walletNotificationService.ts';
import { isWalletAssetType, supportedWalletAssetTypes, walletAssetStoragePath } from '../_shared/walletAssets.ts';
import type { WalletAssetType, WalletPlatform } from '../_shared/walletAssets.ts';
import { encodeWalletAssetPng, MAX_WALLET_ASSET_BYTES, renderWalletAsset } from '../_shared/walletAssetRenderer.ts';

type Row = Record<string, any>;

const supportedPlatforms = new Set(['apple', 'google', 'samsung']);

const cardTemplateSelect = [
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
  'reward_text',
  'stamps_required',
  'streak_goal',
  'vip_tier',
  'settings',
  'club_features',
  'businesses(name,logo_url)'
].join(',');

const customerCardSelect = [
  'id',
  'card_instance_number',
  'customer_code',
  'status',
  'stamp_count',
  'streak_count',
  'vip_status',
  'balance_cents',
  'currency',
  'cloakroom_active',
  'metadata'
].join(',');

const cardInstanceSelect = [
  'id',
  'owner_id',
  'business_id',
  'template_id',
  'customer_card_id',
  'card_instance_number',
  'wallet_platform',
  'current_stamps',
  'current_streak',
  'vip_level',
  'balance_cents',
  'currency',
  'cloakroom_active',
  'customer_gender',
  'customer_age_group',
  'resolved_emblem_key',
  'resolved_emblem_url',
  'metadata',
  'created_at',
  'updated_at',
  `card_templates(${cardTemplateSelect})`,
  `customer_cards(${customerCardSelect})`
].join(',');

function stringValue(value: unknown) {
  return String(value || '').trim();
}

function normalizePlatform(value: unknown): WalletPlatform {
  const platform = stringValue(value).toLowerCase();

  if (!supportedPlatforms.has(platform)) {
    throw createStructuredError(
      400,
      'WALLET_PLATFORM_INVALID',
      'Wallet-Plattform ist ungueltig.',
      'Erlaubt sind apple, google oder samsung.'
    );
  }

  return platform as WalletPlatform;
}

function normalizeAssetType(value: unknown): WalletAssetType {
  const assetType = stringValue(value).toLowerCase().replace(/-/g, '_');

  if (!isWalletAssetType(assetType)) {
    throw createStructuredError(
      400,
      'WALLET_ASSET_TYPE_INVALID',
      'Wallet-Asset-Typ ist ungueltig.',
      `Erlaubt sind ${supportedWalletAssetTypes.join(', ')}.`
    );
  }

  return assetType as WalletAssetType;
}

function templateFrom(cardInstance: Row) {
  return Array.isArray(cardInstance.card_templates)
    ? cardInstance.card_templates[0]
    : cardInstance.card_templates;
}

async function loadCardInstance(context: Row, cardInstanceId: string) {
  const { data, error } = await context.supabaseAdmin
    .from('card_instances')
    .select(cardInstanceSelect)
    .eq('id', cardInstanceId)
    .eq('owner_id', context.ownerId)
    .eq('business_id', context.business.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw createStructuredError(
      404,
      'CARD_INSTANCE_NOT_FOUND',
      'Karteninstanz wurde nicht gefunden.',
      'Die Asset-Generierung darf nur eigene Karten im aktiven Business verwenden.'
    );
  }

  const template = templateFrom(data);

  if (!template || template.owner_id !== context.ownerId || template.business_id !== context.business.id) {
    throw createStructuredError(
      403,
      'TEMPLATE_SCOPE_MISMATCH',
      'Template passt nicht zum aktiven Business.',
      'Karteninstanz und Template muessen zu owner_id und business_id des eingeloggten Betreibers gehoeren.'
    );
  }

  return {
    cardInstance: data,
    template
  };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (request.method !== 'POST') {
      return json({
        error_code: 'METHOD_NOT_ALLOWED',
        error_message: 'Nur POST ist erlaubt.',
        error_reason: 'Wallet-Assets werden serverseitig per POST generiert.'
      }, 405);
    }

    const context = await walletNotificationService.context(request);
    const body = await request.json().catch(() => ({}));
    const cardInstanceId = stringValue(body.card_instance_id || body.cardInstanceId);
    const walletPlatform = normalizePlatform(body.wallet_platform || body.walletPlatform);
    const assetType = normalizeAssetType(body.asset_type || body.assetType);

    if (!cardInstanceId) {
      throw createStructuredError(
        400,
        'CARD_INSTANCE_ID_REQUIRED',
        'card_instance_id fehlt.',
        'Sende die Karteninstanz, fuer die das Wallet-Asset erzeugt werden soll.'
      );
    }

    const { cardInstance, template } = await loadCardInstance(context, cardInstanceId);
    const rendered = renderWalletAsset(assetType, template, cardInstance, walletPlatform);
    const pngBytes = await encodeWalletAssetPng(rendered.width, rendered.height, rendered.rgba);

    if (pngBytes.byteLength > MAX_WALLET_ASSET_BYTES) {
      throw createStructuredError(
        413,
        'WALLET_ASSET_TOO_LARGE',
        'Wallet-Asset ist zu gross.',
        'Generierte Wallet-Assets muessen unter 2 MB bleiben.'
      );
    }

    const assetPath = walletAssetStoragePath({
      ownerId: context.ownerId,
      businessId: context.business.id,
      templateId: cardInstance.template_id,
      cardInstanceId: cardInstance.id,
      walletPlatform,
      assetType
    });

    if (!assetPath) {
      throw createStructuredError(
        500,
        'WALLET_ASSET_PATH_FAILED',
        'Wallet-Asset-Pfad konnte nicht erstellt werden.',
        'Owner, Business, Template, Karteninstanz, Plattform und Asset-Typ muessen fuer Storage vollstaendig sein.'
      );
    }
    const { error: uploadError } = await context.supabaseAdmin.storage
      .from('wallet-assets')
      .upload(assetPath, pngBytes, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      throw createStructuredError(
        500,
        'WALLET_ASSET_UPLOAD_FAILED',
        'Wallet-Asset konnte nicht gespeichert werden.',
        uploadError.message || 'Supabase Storage Upload fuer wallet-assets ist fehlgeschlagen.'
      );
    }

    const { data: publicUrlData } = context.supabaseAdmin.storage
      .from('wallet-assets')
      .getPublicUrl(assetPath);

    return json({
      asset_url: publicUrlData.publicUrl,
      asset_path: assetPath,
      width: rendered.width,
      height: rendered.height,
      content_type: 'image/png',
      asset_type: assetType,
      wallet_platform: walletPlatform,
      card_instance_id: cardInstance.id,
      template_id: cardInstance.template_id
    });
  } catch (error) {
    return errorJson(error, 'GENERATE_WALLET_ASSET_ERROR');
  }
});
