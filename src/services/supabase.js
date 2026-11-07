import { createClient } from '@supabase/supabase-js'

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://fkgcduzlvchjmipausde.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!rawSupabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase URL or Anon Key is missing. Please set them in your .env.local file.")
}

// Direct URL avoids localhost:5173 header bloat (431 error) entirely
export const supabaseUrl = rawSupabaseUrl;

// Consistent storage key so auth session remains valid
const projectRef = rawSupabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || 'fkgcduzlvchjmipausde';
const authStorageKey = `sb-${projectRef}-auth-token`;

// Clean up any bloated/legacy cookies on localhost
if (typeof document !== 'undefined') {
  try {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
      if (name) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=localhost`;
      }
    }
  } catch (e) {
    console.warn('Cookie cleanup warning:', e);
  }
}

// Resilient fetch wrapper with credentials: 'omit' to ensure zero cookie transmission
const resilientFetch = async (url, options = {}) => {
  const maxRetries = 2;
  let lastError;

  // CRITICAL: Strip cookies! Supabase uses Bearer token, never cookies.
  // Setting credentials: 'omit' ensures the browser never sends any Cookie headers.
  const cleanOptions = {
    ...options,
    credentials: 'omit',
  };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, cleanOptions);

      // If server returns 431, retry via direct URL or proxy
      if (response.status === 431) {
        throw new Error('431 Request Header Fields Too Large');
      }

      return response;
    } catch (err) {
      lastError = err;

      // Smart bi-directional fallback:
      // If direct Supabase fails (e.g. ISP block), try /supabase-proxy.
      // If /supabase-proxy fails (e.g. 431 header error), try direct Supabase!
      if (typeof window !== 'undefined' && typeof url === 'string') {
        const isDirect = url.includes('supabase.co');
        const fallbackUrl = isDirect
          ? url.replace(/https:\/\/[^/]+/, `${window.location.origin}/supabase-proxy`)
          : url.replace(new RegExp(`^${window.location.origin}/supabase-proxy`), rawSupabaseUrl);

        try {
          const fallbackRes = await fetch(fallbackUrl, cleanOptions);
          if (fallbackRes.status !== 431) {
            return fallbackRes;
          }
        } catch {
          // continue loop
        }
      }

      const isIdempotent = !options.method || options.method === 'GET' || options.method === 'HEAD';
      if (attempt < maxRetries && isIdempotent) {
        console.warn(`[Supabase Fetch] Percobaan ${attempt + 1} gagal (${err.message}). Mencoba kembali...`);
        await new Promise(resolve => setTimeout(resolve, 300 * (attempt + 1)));
      } else {
        break;
      }
    }
  }
  throw lastError;
};

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    storageKey: authStorageKey,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    fetch: resilientFetch,
  },
});
