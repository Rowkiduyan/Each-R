import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

// Remember-me has been removed. Always use sessionStorage so sessions end when the browser closes.
// Also clear any previously persisted Supabase auth keys from localStorage.
if (typeof window !== 'undefined') {
  try {
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith('sb-')) window.localStorage.removeItem(key)
    }
    window.localStorage.removeItem('eachr_remember_me')
  } catch {
    // ignore storage access errors
  }
}

const storage = typeof window === 'undefined' ? undefined : window.sessionStorage

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    storage,
  },
})

// Public/anon client (no persisted session). Useful for read-only aggregate queries
// that should behave the same for guests and logged-in users.
export const supabasePublic = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
})

