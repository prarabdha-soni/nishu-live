import { CURRENT_USER } from '../data/seed';

// Per-tab identity so you can bid against yourself from multiple tabs/devices.
// Real auth (Supabase Auth) replaces this later — see prod.md.

function fromSession(key: string, make: () => string): string {
  let v = sessionStorage.getItem(key);
  if (!v) {
    v = make();
    sessionStorage.setItem(key, v);
  }
  return v;
}

export function getUid(): string {
  return fromSession('nishu-uid', () => `u-${Math.random().toString(36).slice(2, 10)}`);
}

export function getHandle(): string {
  return fromSession('nishu-handle', () => `${CURRENT_USER.handle}-${Math.random().toString(36).slice(2, 5)}`);
}

const COLORS = ['#2a6fdb', '#c71e50', '#159c66', '#c9a227', '#e0537a', '#3a7bd5', '#8a5a3b', '#7b45c2'];

export function getColor(): string {
  const uid = getUid();
  let h = 0;
  for (const ch of uid) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length];
}
