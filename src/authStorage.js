export const REMEMBER_ME_KEY = "eachr_remember_me";

export function isRememberMeEnabled() {
  if (typeof window === "undefined") return true;
  const raw = window.localStorage.getItem(REMEMBER_ME_KEY);
  // Backwards-compatible default: remember by default (matches Supabase default behavior)
  if (raw === null) return true;
  return raw === "true";
}

export function setRememberMeEnabled(enabled) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REMEMBER_ME_KEY, enabled ? "true" : "false");
}

export function getPreferredStorage() {
  if (typeof window === "undefined") return undefined;
  return isRememberMeEnabled() ? window.localStorage : window.sessionStorage;
}

export function setStoredJson(key, value) {
  if (typeof window === "undefined") return;

  const preferred = getPreferredStorage();
  const other = preferred === window.localStorage ? window.sessionStorage : window.localStorage;

  preferred.setItem(key, JSON.stringify(value));
  other.removeItem(key);
}

export function getStoredJson(key) {
  if (typeof window === "undefined") return null;

  const preferred = getPreferredStorage();
  const other = preferred === window.localStorage ? window.sessionStorage : window.localStorage;

  const rawPreferred = preferred.getItem(key);
  if (rawPreferred) {
    try {
      return JSON.parse(rawPreferred);
    } catch {
      return null;
    }
  }

  // Fallback to the other storage (e.g. data saved before remember-me preference changed)
  const rawOther = other.getItem(key);
  if (!rawOther) return null;

  try {
    const parsed = JSON.parse(rawOther);
    // Migrate to preferred for consistency
    preferred.setItem(key, rawOther);
    other.removeItem(key);
    return parsed;
  } catch {
    return null;
  }
}

export function removeStoredItem(key) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key);
  window.sessionStorage.removeItem(key);
}
