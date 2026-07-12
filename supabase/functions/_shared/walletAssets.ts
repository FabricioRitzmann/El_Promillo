export type WalletPlatform = 'apple' | 'google' | 'samsung';
export type WalletAssetType = 'stamp_grid' | 'streak_badge' | 'wallet_background' | 'decorative_title' | 'club_module_badges';
export type WalletAssetUrls = Partial<Record<WalletAssetType, string>>;

export const walletAssetBucket = 'wallet-assets';
export const supportedWalletAssetTypes: WalletAssetType[] = [
  'stamp_grid',
  'streak_badge',
  'wallet_background',
  'decorative_title',
  'club_module_badges'
];

type WalletAssetPathParams = {
  ownerId?: unknown;
  businessId?: unknown;
  templateId?: unknown;
  cardInstanceId?: unknown;
  walletPlatform?: unknown;
  assetType?: unknown;
};

function stringValue(value: unknown) {
  return String(value || '').trim();
}

export function isWalletAssetType(value: unknown): value is WalletAssetType {
  return supportedWalletAssetTypes.includes(stringValue(value) as WalletAssetType);
}

export function walletAssetFolderPath(params: WalletAssetPathParams) {
  const parts = [
    params.ownerId,
    params.businessId,
    params.templateId,
    params.cardInstanceId,
    params.walletPlatform
  ].map(stringValue);

  if (parts.some((part) => !part)) {
    return '';
  }

  return parts.map((part) => encodeURIComponent(part)).join('/');
}

export function walletAssetStoragePath(params: WalletAssetPathParams) {
  const folder = walletAssetFolderPath(params);
  const assetType = stringValue(params.assetType);

  if (!folder || !isWalletAssetType(assetType)) {
    return '';
  }

  return `${folder}/${encodeURIComponent(assetType)}.png`;
}

export function walletAssetPublicUrl(supabaseUrl: unknown, params: WalletAssetPathParams) {
  const baseUrl = stringValue(supabaseUrl).replace(/\/+$/, '');
  const assetPath = walletAssetStoragePath(params);

  if (!baseUrl || !assetPath) {
    return '';
  }

  return `${baseUrl}/storage/v1/object/public/${walletAssetBucket}/${assetPath}`;
}

export function walletAssetTypesForFallbacks(fallbacks: Array<{ assetType?: unknown; platforms?: unknown }> = [], platform: WalletPlatform) {
  const assetTypes = new Set<WalletAssetType>();

  for (const fallback of fallbacks) {
    const platforms = Array.isArray(fallback.platforms) ? fallback.platforms.map(stringValue) : [];

    if (!platforms.includes(platform) || !isWalletAssetType(fallback.assetType)) {
      continue;
    }

    assetTypes.add(fallback.assetType);
  }

  return [...assetTypes];
}

export async function existingWalletAssetPublicUrls(supabaseAdmin: any, supabaseUrl: unknown, params: WalletAssetPathParams, assetTypes: WalletAssetType[]) {
  const folderPath = walletAssetFolderPath(params);
  const urls: WalletAssetUrls = {};

  if (!supabaseAdmin || !folderPath || !assetTypes.length) {
    return urls;
  }

  const { data, error } = await supabaseAdmin.storage
    .from(walletAssetBucket)
    .list(folderPath, { limit: 100 });

  if (error || !Array.isArray(data)) {
    return urls;
  }

  const existingNames = new Set(data.map((item: { name?: unknown }) => stringValue(item.name)));

  for (const assetType of assetTypes) {
    if (!existingNames.has(`${assetType}.png`)) {
      continue;
    }

    const publicUrl = walletAssetPublicUrl(supabaseUrl, {
      ...params,
      assetType
    });

    if (publicUrl) {
      urls[assetType] = publicUrl;
    }
  }

  return urls;
}
