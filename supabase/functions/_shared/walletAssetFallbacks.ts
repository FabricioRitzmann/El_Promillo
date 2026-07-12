import { editorCardDesignFromTemplate } from './walletDesign.ts';
import { walletAssetBucket, walletAssetStoragePath, walletAssetTypesForFallbacks } from './walletAssets.ts';
import type { WalletAssetType, WalletAssetUrls, WalletPlatform } from './walletAssets.ts';
import { encodeWalletAssetPng, MAX_WALLET_ASSET_BYTES, renderWalletAsset } from './walletAssetRenderer.ts';

type Row = Record<string, any>;

function stringValue(value: unknown) {
  return String(value || '').trim();
}

function templateFrom(value: Row = {}) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizedWalletPlatform(value: unknown): WalletPlatform | '' {
  const platform = stringValue(value);

  return ['apple', 'google', 'samsung'].includes(platform)
    ? platform as WalletPlatform
    : '';
}

export async function ensureWalletAssetFallbacks(params: {
  supabaseAdmin: any;
  supabaseUrl?: unknown;
  ownerId?: unknown;
  businessId?: unknown;
  template?: Row;
  cardInstance?: Row;
  walletPlatform?: unknown;
}) {
  const walletPlatform = normalizedWalletPlatform(params.walletPlatform);
  const cardInstance = params.cardInstance || {};
  const template = templateFrom(params.template || cardInstance.card_templates || {});
  const ownerId = stringValue(params.ownerId || cardInstance.owner_id || template.owner_id);
  const businessId = stringValue(params.businessId || cardInstance.business_id || template.business_id);
  const generatedAssets: Row[] = [];
  const generatedAssetUrls: WalletAssetUrls = {};

  if (!params.supabaseAdmin || !walletPlatform || !template?.id || !cardInstance?.id || !ownerId || !businessId) {
    return {
      generatedAssets,
      generatedAssetUrls
    };
  }

  const editorDesign = editorCardDesignFromTemplate(template, cardInstance);
  const assetTypes = walletAssetTypesForFallbacks(editorDesign.assetFallbacks, walletPlatform);

  for (const assetType of assetTypes) {
    const assetPath = walletAssetStoragePath({
      ownerId,
      businessId,
      templateId: cardInstance.template_id || template.id,
      cardInstanceId: cardInstance.id,
      walletPlatform,
      assetType
    });

    if (!assetPath) {
      throw {
        statusCode: 500,
        error_code: 'WALLET_ASSET_PATH_FAILED',
        error_message: 'Wallet-Asset-Pfad konnte nicht erstellt werden.',
        error_reason: 'Owner, Business, Template, Karteninstanz, Plattform und Asset-Typ muessen fuer automatische Wallet-Asset-Fallbacks vollstaendig sein.'
      };
    }

    const rendered = renderWalletAsset(assetType as WalletAssetType, template, cardInstance, walletPlatform);
    const pngBytes = await encodeWalletAssetPng(rendered.width, rendered.height, rendered.rgba);

    if (pngBytes.byteLength > MAX_WALLET_ASSET_BYTES) {
      throw {
        statusCode: 413,
        error_code: 'WALLET_ASSET_TOO_LARGE',
        error_message: 'Generiertes Wallet-Asset ist zu gross.',
        error_reason: 'Automatisch erzeugte Wallet-Assets muessen unter 2 MB bleiben.'
      };
    }

    const { error: uploadError } = await params.supabaseAdmin.storage
      .from(walletAssetBucket)
      .upload(assetPath, pngBytes, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      throw {
        statusCode: 500,
        error_code: 'WALLET_ASSET_UPLOAD_FAILED',
        error_message: 'Wallet-Asset konnte nicht gespeichert werden.',
        error_reason: uploadError.message || 'Supabase Storage Upload fuer automatisch erzeugte Wallet-Assets ist fehlgeschlagen.'
      };
    }

    const { data: publicUrlData } = params.supabaseAdmin.storage
      .from(walletAssetBucket)
      .getPublicUrl(assetPath);
    const publicUrl = stringValue(publicUrlData?.publicUrl);

    if (publicUrl) {
      generatedAssetUrls[assetType] = publicUrl;
    }

    generatedAssets.push({
      asset_type: assetType,
      asset_path: assetPath,
      asset_url: publicUrl || null,
      width: rendered.width,
      height: rendered.height,
      content_type: 'image/png',
      wallet_platform: walletPlatform
    });
  }

  return {
    generatedAssets,
    generatedAssetUrls
  };
}
