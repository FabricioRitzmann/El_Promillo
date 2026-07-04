import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { looksConfigured } from './config.js';

export function createSupabaseAdmin(config) {
  const { url, serviceRoleKey } = config.supabase;

  if (!looksConfigured(url) || !looksConfigured(serviceRoleKey)) {
    return null;
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    realtime: {
      transport: WebSocket
    }
  });
}

export function requireSupabaseAdmin(admin) {
  if (!admin) {
    const error = new Error('Supabase ist noch nicht konfiguriert. Bitte config.json anlegen und Service Role Key eintragen.');
    error.statusCode = 503;
    throw error;
  }
}
