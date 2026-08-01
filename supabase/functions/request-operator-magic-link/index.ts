// Supabase Edge Function: Einmaligen Login-Link für offizielle Betreiber senden.
//
// Die öffentliche Auth-API antwortet bei unbekannten Adressen absichtlich
// neutral. Diese Function setzt die gewünschte explizite Betreiberprüfung um:
// Ein Magic Link wird nur für ein vorhandenes, freigeschaltetes
// operator_profile mit passendem Supabase-Auth-User versendet.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { enforcePublicClaimRateLimit } from '../_shared/publicRateLimit.ts';

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
  return json({
    error_code: error?.error_code || 'OPERATOR_MAGIC_LINK_ERROR',
    error_message: error?.error_message || error?.message || 'Login-Link konnte nicht angefordert werden.',
    error_reason: error?.error_reason || 'Bitte warte kurz und versuche es erneut.'
  }, Number(error?.statusCode || error?.status || 500));
}

function normalizeEmail(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function validateEmail(value: unknown) {
  const email = normalizeEmail(value);

  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email)) {
    throw createStructuredError(
      400,
      'OPERATOR_EMAIL_INVALID',
      'E-Mail-Adresse ist ungültig.',
      'Bitte überprüfe die Schreibweise der E-Mail-Adresse.'
    );
  }

  return email;
}

function validateRedirectTo(value: unknown) {
  try {
    const redirectUrl = new URL(String(value || ''));

    if (
      !['http:', 'https:'].includes(redirectUrl.protocol)
      || !redirectUrl.pathname.endsWith('/account.html')
      || redirectUrl.searchParams.get('magic_login') !== '1'
    ) {
      throw new Error('invalid redirect');
    }

    return redirectUrl.toString();
  } catch {
    throw createStructuredError(
      400,
      'OPERATOR_MAGIC_LINK_REDIRECT_INVALID',
      'Login-Weiterleitung ist ungültig.',
      'Bitte lade die El Promillo Login-Seite neu und versuche es erneut.'
    );
  }
}

function serviceClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    throw createStructuredError(
      500,
      'SUPABASE_EDGE_CONFIG_MISSING',
      'Supabase Edge Secrets fehlen.',
      'Setze SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY für request-operator-magic-link.'
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

function anonAuthClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !anonKey) {
    throw createStructuredError(
      500,
      'SUPABASE_EDGE_CONFIG_MISSING',
      'Supabase Auth-Konfiguration fehlt.',
      'Setze SUPABASE_URL und SUPABASE_ANON_KEY für request-operator-magic-link.'
    );
  }

  return createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

async function loadOfficialOperator(supabaseAdmin: any, email: string) {
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('operator_profiles')
    .select('id,email,unlock')
    .eq('email', email)
    .maybeSingle();

  if (profileError) {
    throw createStructuredError(
      500,
      'OPERATOR_ACCOUNT_CHECK_FAILED',
      'Betreiberkonto konnte nicht geprüft werden.',
      'Bitte versuche es später erneut.'
    );
  }

  if (!profile) {
    throw createStructuredError(
      404,
      'OPERATOR_ACCOUNT_NOT_FOUND',
      'Kein offizieller Account gefunden.',
      'Wir konnten keinen offiziellen El Promillo Account mit dieser E-Mail-Adresse finden. Bitte überprüfe die Schreibweise oder verwende die E-Mail-Adresse, mit der dein Account registriert wurde.'
    );
  }

  if (!profile.unlock) {
    throw createStructuredError(
      403,
      'OPERATOR_ACCOUNT_NOT_APPROVED',
      'Account noch nicht freigeschaltet.',
      'Dieser Account wurde gefunden, ist aber noch nicht freigeschaltet. Bitte wende dich an den El Promillo Support.'
    );
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(profile.id);
  const authEmail = normalizeEmail(authData?.user?.email);

  if (authError || !authData?.user || authEmail !== email) {
    throw createStructuredError(
      404,
      'OPERATOR_ACCOUNT_NOT_FOUND',
      'Kein offizieller Account gefunden.',
      'Wir konnten keinen offiziellen El Promillo Account mit dieser E-Mail-Adresse finden. Bitte überprüfe die Schreibweise oder verwende die E-Mail-Adresse, mit der dein Account registriert wurde.'
    );
  }

  return profile;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return json({
      error_code: 'METHOD_NOT_ALLOWED',
      error_message: 'Nur POST ist erlaubt.',
      error_reason: 'Der Login-Link wird per POST angefordert.'
    }, 405);
  }

  try {
    const supabaseAdmin = serviceClient();
    await enforcePublicClaimRateLimit(supabaseAdmin, request, 'request-operator-magic-link', {
      limitEnv: 'OPERATOR_MAGIC_LINK_RATE_LIMIT',
      windowSecondsEnv: 'OPERATOR_MAGIC_LINK_RATE_LIMIT_WINDOW_SECONDS',
      limit: 8,
      windowSeconds: 3600
    });

    const body = await request.json().catch(() => ({}));
    const email = validateEmail(body.email);
    const redirectTo = validateRedirectTo(body.redirectTo || body.redirect_to);

    await loadOfficialOperator(supabaseAdmin, email);

    const { error } = await anonAuthClient().auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
        shouldCreateUser: false
      }
    });

    if (error) {
      throw createStructuredError(
        502,
        'OPERATOR_MAGIC_LINK_SEND_FAILED',
        'Login-Link konnte nicht versendet werden.',
        'Bitte warte kurz und versuche es erneut. Falls das Problem bleibt, wende dich an den El Promillo Support.'
      );
    }

    return json({
      ok: true,
      message: 'Der einmalige Login-Link wurde an die hinterlegte E-Mail-Adresse versendet.'
    });
  } catch (error) {
    return errorJson(error);
  }
});
