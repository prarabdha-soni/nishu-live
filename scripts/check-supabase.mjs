// Verifies the Supabase Realtime channel the auction actually uses.
// Run after pasting your anon key into .env.local:  node scripts/check-supabase.mjs
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function readEnv() {
  const env = {};
  try {
    for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/);
      if (m) env[m[1]] = m[2];
    }
  } catch {
    /* ignore */
  }
  return env;
}

const env = readEnv();
const url = process.env.VITE_SUPABASE_URL ?? env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_ANON_KEY;

if (!url || !key || key.includes('PASTE_YOUR')) {
  console.log('❌ Set VITE_SUPABASE_URL and a real VITE_SUPABASE_ANON_KEY in .env.local first.');
  process.exit(1);
}

console.log('URL :', url);
console.log('KEY :', key.slice(0, 12) + '…' + key.slice(-6));

// Two separate clients — exactly like studio (host) → phone (viewer).
const host = createClient(url, key, { realtime: { params: { eventsPerSecond: 20 } } });
const viewer = createClient(url, key, { realtime: { params: { eventsPerSecond: 20 } } });

const ROOM = 'live:healthcheck';
const viewerCh = viewer.channel(ROOM, { config: { broadcast: { self: false } } });
const hostCh = host.channel(ROOM, { config: { broadcast: { self: false } } });

const done = (code) => {
  Promise.all([host.removeChannel(hostCh), viewer.removeChannel(viewerCh)]).finally(() => process.exit(code));
};

const timeout = setTimeout(() => {
  console.log('❌ Timed out. Check: key correct? Realtime enabled for the project?');
  done(1);
}, 12000);

let viewerReady = false;
let hostReady = false;

viewerCh
  .on('broadcast', { event: 'auction.state' }, ({ payload }) => {
    console.log('✅ Viewer received host broadcast — cross-client works:', payload);
    clearTimeout(timeout);
    done(0);
  })
  .subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      viewerReady = true;
      console.log('✅ Viewer subscribed.');
      maybeSend();
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      console.log('❌ Viewer channel error:', status, '— usually a wrong anon key or Realtime disabled.');
      clearTimeout(timeout);
      done(1);
    }
  });

hostCh.subscribe((status) => {
  if (status === 'SUBSCRIBED') {
    hostReady = true;
    console.log('✅ Host subscribed.');
    maybeSend();
  }
});

function maybeSend() {
  if (viewerReady && hostReady) {
    hostCh.send({ type: 'broadcast', event: 'auction.state', payload: { currentBid: 45, at: Date.now() } });
  }
}
