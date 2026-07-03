// Per-device user data (profile, orders, saved items, notifications).
// Primary store is Supabase (keyed by the device uid); falls back to
// localStorage so the screens stay functional before the tables exist.
//
// Run db/user-schema.sql in Supabase → SQL editor to enable Supabase persistence.
import { getSupabase, supabaseEnabled } from '../live/supabase';
import { getUid } from '../lib/identity';

const nsKey = (k: string) => `nishu:${getUid()}:${k}`;

function lsGet<T>(k: string, def: T): T {
  try {
    const v = localStorage.getItem(nsKey(k));
    return v ? (JSON.parse(v) as T) : def;
  } catch {
    return def;
  }
}
function lsSet(k: string, v: unknown) {
  try {
    localStorage.setItem(nsKey(k), JSON.stringify(v));
  } catch {
    /* quota / private mode — ignore */
  }
}

let warned = false;
function warn(e: unknown) {
  if (!warned) {
    warned = true;
    const msg = (e as { message?: string })?.message ?? String(e);
    console.info('nishu store: using local fallback (run db/user-schema.sql to persist in Supabase):', msg);
  }
}

/* ---------------- profile ---------------- */

export interface Profile {
  name: string;
  handle: string;
}

export async function getProfile(fallback: Profile): Promise<Profile> {
  if (supabaseEnabled) {
    try {
      const { data, error } = await getSupabase()
        .from('profiles')
        .select('name,handle')
        .eq('uid', getUid())
        .maybeSingle();
      if (error) throw error;
      if (data) return { name: data.name ?? fallback.name, handle: data.handle ?? fallback.handle };
    } catch (e) {
      warn(e);
    }
  }
  return lsGet('profile', fallback);
}

export async function saveProfile(p: Profile): Promise<void> {
  lsSet('profile', p);
  if (supabaseEnabled) {
    try {
      const { error } = await getSupabase()
        .from('profiles')
        .upsert({ uid: getUid(), name: p.name, handle: p.handle, updated_at: new Date().toISOString() });
      if (error) throw error;
    } catch (e) {
      warn(e);
    }
  }
}

/* ---------------- orders ---------------- */

export interface Order {
  id: string;
  title: string;
  imageUrl: string | null;
  amount: number;
  kind: 'won' | 'bought';
  status: string;
  createdAt: number;
}

type NewOrder = Omit<Order, 'id' | 'createdAt' | 'status'> & { status?: string };

export async function listOrders(): Promise<Order[]> {
  if (supabaseEnabled) {
    try {
      const { data, error } = await getSupabase()
        .from('orders')
        .select('*')
        .eq('uid', getUid())
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (data) return data.map(rowToOrder);
    } catch (e) {
      warn(e);
    }
  }
  return lsGet('orders', []);
}

export async function createOrder(o: NewOrder): Promise<Order> {
  const order: Order = {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    status: o.status ?? 'confirmed',
    title: o.title,
    imageUrl: o.imageUrl,
    amount: o.amount,
    kind: o.kind,
  };
  lsSet('orders', [order, ...lsGet<Order[]>('orders', [])].slice(0, 50));
  if (supabaseEnabled) {
    try {
      const { error } = await getSupabase().from('orders').insert({
        uid: getUid(),
        title: order.title,
        image_url: order.imageUrl,
        amount: order.amount,
        kind: order.kind,
        status: order.status,
      });
      if (error) throw error;
    } catch (e) {
      warn(e);
    }
  }
  return order;
}

interface OrderRow {
  id: number | string;
  title: string;
  image_url: string | null;
  amount: number;
  kind: 'won' | 'bought';
  status: string;
  created_at: string;
}
function rowToOrder(r: OrderRow): Order {
  return {
    id: String(r.id),
    title: r.title,
    imageUrl: r.image_url,
    amount: Number(r.amount),
    kind: r.kind,
    status: r.status,
    createdAt: new Date(r.created_at).getTime(),
  };
}

/* ---------------- saved items ---------------- */

export interface Saved {
  productId: string;
  name: string;
  price: number;
  imageUrl: string | null;
}

export async function listSaved(): Promise<Saved[]> {
  if (supabaseEnabled) {
    try {
      const { data, error } = await getSupabase()
        .from('saved_items')
        .select('*')
        .eq('uid', getUid())
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (data)
        return data.map((r) => ({ productId: r.product_id, name: r.name, price: Number(r.price), imageUrl: r.image_url }));
    } catch (e) {
      warn(e);
    }
  }
  return lsGet('saved', []);
}

export async function persistSaved(item: Saved, on: boolean): Promise<void> {
  const local = lsGet<Saved[]>('saved', []);
  lsSet('saved', on ? [item, ...local.filter((s) => s.productId !== item.productId)] : local.filter((s) => s.productId !== item.productId));
  if (supabaseEnabled) {
    try {
      const db = getSupabase();
      const { error } = on
        ? await db.from('saved_items').upsert({
            uid: getUid(),
            product_id: item.productId,
            name: item.name,
            price: item.price,
            image_url: item.imageUrl,
          })
        : await db.from('saved_items').delete().eq('uid', getUid()).eq('product_id', item.productId);
      if (error) throw error;
    } catch (e) {
      warn(e);
    }
  }
}

/* ---------------- notifications ---------------- */

export interface Notif {
  id: string;
  type: string;
  title: string;
  sub: string | null;
  createdAt: number;
}

export async function listNotifications(): Promise<Notif[]> {
  if (supabaseEnabled) {
    try {
      const { data, error } = await getSupabase()
        .from('notifications')
        .select('*')
        .eq('uid', getUid())
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      if (data)
        return data.map((r) => ({
          id: String(r.id),
          type: r.type,
          title: r.title,
          sub: r.sub,
          createdAt: new Date(r.created_at).getTime(),
        }));
    } catch (e) {
      warn(e);
    }
  }
  return lsGet('notifications', []);
}

export async function addNotification(n: Omit<Notif, 'id' | 'createdAt'>): Promise<void> {
  const notif: Notif = { id: crypto.randomUUID(), createdAt: Date.now(), ...n };
  lsSet('notifications', [notif, ...lsGet<Notif[]>('notifications', [])].slice(0, 50));
  if (supabaseEnabled) {
    try {
      const { error } = await getSupabase()
        .from('notifications')
        .insert({ uid: getUid(), type: n.type, title: n.title, sub: n.sub });
      if (error) throw error;
    } catch (e) {
      warn(e);
    }
  }
}

/** Relative "2m / 3h / 1d" label. */
export function timeAgo(ts: number): string {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
