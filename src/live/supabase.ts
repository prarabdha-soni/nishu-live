import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';

// Serverless transport for Vercel: Supabase Realtime carries auction state,
// bids, chat, and WebRTC signaling. The /studio host device owns the clock.
// Configure VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (.env.local / Vercel env).

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseEnabled = !!(URL && KEY);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(URL!, KEY!, {
      realtime: { params: { eventsPerSecond: 20 } },
    });
  }
  return client;
}

export function liveChannel(sellerId: string): RealtimeChannel {
  return getSupabase().channel(`live:${sellerId}`, {
    config: { broadcast: { self: false }, presence: { key: crypto.randomUUID() } },
  });
}

/**
 * Optional bid ledger — the only thing persisted, and only if the table exists.
 * Create it in Supabase (SQL editor):
 *
 *   create table if not exists bids (
 *     id bigint generated always as identity primary key,
 *     room_id text not null, lot_id text not null,
 *     handle text not null, amount int not null,
 *     created_at timestamptz not null default now()
 *   );
 *   alter table bids enable row level security;
 *   create policy "anon can insert bids" on bids for insert to anon with check (true);
 */
/**
 * Winner → host: "dummy payment received". Fired from Checkout after the
 * (test) order is placed; opens a short-lived channel since the Live screen's
 * channel is gone by then.
 */
export function announceOrder(
  sellerId: string,
  payload: { orderNo: string; handle: string; title: string; price: number },
): void {
  if (!supabaseEnabled) return;
  const client = getSupabase();
  const ch = client.channel(`live:${sellerId}`);
  ch.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      void ch.send({ type: 'broadcast', event: 'order.placed', payload }).then(() => {
        setTimeout(() => void client.removeChannel(ch), 800);
      });
    }
  });
}

let ledgerWarned = false;

export function persistBid(roomId: string, lotId: string, handle: string, amount: number): void {
  if (!supabaseEnabled) return;
  void getSupabase()
    .from('bids')
    .insert({ room_id: roomId, lot_id: lotId, handle, amount })
    .then(({ error }) => {
      if (error && !ledgerWarned) {
        ledgerWarned = true;
        console.info('bid ledger off (create the bids table to enable):', error.message);
      }
    });
}
