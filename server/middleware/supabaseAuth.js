import { createClient } from '@supabase/supabase-js';
import { isDatabaseConfigured } from '../db/client.js';
import { findOrCreateAppUser } from '../repositories/usersRepository.js';

let supabase = null;

export function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  if (!supabase) {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return supabase;
}

function getBearerToken(req) {
  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');

  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token;
}

export async function resolveSupabaseUser(req) {
  const token = getBearerToken(req);
  const client = getSupabaseClient();

  if (!token || !client || !isDatabaseConfigured()) {
    return null;
  }

  const { data, error } = await client.auth.getUser(token);

  if (error || !data?.user?.id) {
    return null;
  }

  return findOrCreateAppUser({
    supabaseUserId: data.user.id,
    email: data.user.email,
  });
}

export async function requireSupabaseUser(req, res, next) {
  try {
    const token = getBearerToken(req);

    if (!token) {
      res.status(401).json({ error: 'Missing bearer token.' });
      return;
    }

    if (!isDatabaseConfigured()) {
      res.status(503).json({ error: 'DATABASE_URL is required for authenticated app data.' });
      return;
    }

    const client = getSupabaseClient();

    if (!client) {
      res.status(503).json({ error: 'Supabase auth is not configured on the backend.' });
      return;
    }

    const { data, error } = await client.auth.getUser(token);

    if (error || !data?.user?.id) {
      res.status(401).json({ error: 'Invalid or expired bearer token.' });
      return;
    }

    req.user = await findOrCreateAppUser({
      supabaseUserId: data.user.id,
      email: data.user.email,
    });

    next();
  } catch (error) {
    next(error);
  }
}
