export function setStoredJson(key, value) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(key, JSON.stringify(value));
}

export function getStoredJson(key) {
  if (typeof window === "undefined") return null;

  const raw = window.sessionStorage.getItem(key);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  return null;
}

export function removeStoredItem(key) {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(key);
}
