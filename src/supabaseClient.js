import { createClient } from '@supabase/supabase-js'
import { isRememberMeEnabled } from './authStorage'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

// Use a dynamic storage adapter so the app can support a "Remember me" toggle:
// - enabled  -> persist session in localStorage (survives browser restarts)
// - disabled -> persist session in sessionStorage (cleared when browser closes)
const dynamicStorage = typeof window === 'undefined' ? undefined : {
  getItem: (key) => {
    const remember = isRememberMeEnabled()
    const preferred = remember ? window.localStorage : window.sessionStorage
    const other = remember ? window.sessionStorage : window.localStorage

    const value = preferred.getItem(key)
    if (!remember) {
      // Prevent lingering long-lived sessions when remember-me is off.
      other.removeItem(key)
    }
    return value
  },
  setItem: (key, value) => {
    const remember = isRememberMeEnabled()
    const preferred = remember ? window.localStorage : window.sessionStorage
    const other = remember ? window.sessionStorage : window.localStorage

    preferred.setItem(key, value)
    other.removeItem(key)
  },
  removeItem: (key) => {
    window.localStorage.removeItem(key)
    window.sessionStorage.removeItem(key)
  },
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    storage: dynamicStorage,
  },
})

