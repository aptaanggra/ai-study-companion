// Client-side device user id helper. Stored in localStorage.
const KEY = "edumandiri.userId";

export function getOrCreateUserId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

export function getUserIdSafe(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEY);
}
