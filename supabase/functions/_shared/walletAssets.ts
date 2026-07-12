export type WalletPlatform = 'apple' | 'google' | 'samsung';
export type WalletAssetType = 'stamp_grid' | 'streak_badge' | 'wallet_background' | 'decorative_title' | 'club_module_badges';

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
