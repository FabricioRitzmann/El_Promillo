import { createSupabaseRestClient } from './supabaseClient.js';
import { pagePath } from './path.js';

const MOBILE_SCANNER_MEDIA_QUERY = '(max-width: 767px)';
const operatorProfileSelect = [
  'id',
  'email',
  'display_name',
  'unlock',
  'created_at',
  'updated_at'
].join(',');

export function isMobileScannerOnly() {
  return false;
}

export function operatorHomePath() {
  return pagePath('dashboard.html');
}

export async function getOwnProfile(client, session) {
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  return client.selectRows('operator_profiles', {
    select: operatorProfileSelect,
    filters: [
      { column: 'id', op: 'eq', value: userId }
    ],
    maybeSingle: true
  });
}

export async function requireLogin({ requireUnlock = false } = {}) {
  const client = await createSupabaseRestClient();
  const session = await client.ensureSession();

  if (!session) {
    window.location.replace(pagePath('index.html'));
    return null;
  }

  const profile = await getOwnProfile(client, session);

  if (requireUnlock && !profile?.unlock) {
    window.location.replace(pagePath('wait.html'));
    return null;
  }

  return { client, session, profile };
}

export async function redirectAfterLogin(client, session) {
  const profile = await getOwnProfile(client, session);

  if (profile?.unlock) {
    window.location.replace(operatorHomePath());
    return;
  }

  window.location.replace(pagePath('wait.html'));
}
