# Nishu — Live Jewellery Auction PWA

Mobile-first live-auction commerce PWA (Whatnot-style): real live stream from your camera, real-time bidding with proper auction rules, dummy payments/orders for testing. 100% free stack — no paid services.

Two ways to run the live auction:

| Mode | Transport | Auction authority | Use it for |
|---|---|---|---|
| **Serverless** (Vercel + Supabase) | Supabase Realtime | your `/studio` browser tab | deploying & testing from anywhere |
| **Self-hosted** (Socket.IO) | local Node server | the server | LAN testing without Supabase |

## Deploy to Vercel (serverless mode) — the happy flow

1. Push this repo to GitHub → **vercel.com → Import** (Vite is auto-detected), or run `npx vercel`.
2. In Vercel → Project → **Environment Variables**, add your Supabase project's values:
   - `VITE_SUPABASE_URL` = `https://YOUR-PROJECT.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = your anon public key
3. Deploy. Then:
   - **Laptop:** open `https://your-app.vercel.app/studio` → **Start camera** → **Go live**. Keep this tab open — it runs the auction (validates bids, owns the clock).
   - **Phone:** open `https://your-app.vercel.app` → tap the live seller → watch your own stream → **bid**.
   - Win the lot → **Pay now** → checkout → **Place order** (dummy payment, no real charge) → the order pops up in the studio's **"Orders received (test payments)"** list.
4. Nothing is saved — no users, no orders. **Optional bid ledger:** run this once in Supabase → SQL editor, and every accepted bid gets recorded:

```sql
create table if not exists bids (
  id bigint generated always as identity primary key,
  room_id text not null, lot_id text not null,
  handle text not null, amount int not null,
  created_at timestamptz not null default now()
);
alter table bids enable row level security;
create policy "anon can insert bids" on bids for insert to anon with check (true);
```

To test serverless mode locally first: `cp .env.example .env.local`, fill in the two values, `npm run dev`, open `http://localhost:5173/studio` (laptop) and `http://<your-ip>:5173` (phone, same wifi).

In the studio, **Rival bots** defaults to **Off** (only real bidders); switch to Calm/Lively/Frenzy to add simulated bidders. Different tabs/devices get separate bidder identities, so you can bid against yourself.

## Self-hosted mode (no Supabase needed)

```bash
npm install
npm run dev:all        # web on :5173 + auction server on :8787
# or production: npm run build && npm start   → http://localhost:8787
```

Open **/studio**, claim the room with the host key (default `nishu-live`, change via `HOST_KEY=... npm run server`), start camera, go live; other devices on the wifi join via `http://<your-ip>:8787`. Note: the camera needs `localhost` or https — that's why Vercel mode is easier for phones.

## The bidding system (authority-owned, §7 of CLAUDE.md)

- Increments: `<$50 → $5 · <$150 → $10 · <$400 → $20 · else $50`; quick chips `[next, next+i, next+3i]`.
- 15s clock per lot, **anti-snipe**: any bid in the last 6s resets the clock to 8s.
- One authority validates every bid (auction open, clock running, exact legal amount) and dedupes by nonce — the Socket.IO server in self-hosted mode, the seller's /studio tab in serverless mode. **A bidder's device never decides who won.**
- Bidders get optimistic UI reconciled by the authority's next state broadcast.
- Winner sees YOU WON! → pays a **dummy payment** → order number issued → seller's studio shows the order instantly.
- No auction reachable → the Live screen falls back to a local simulation (marked "demo · offline sim"), so the PWA still demos offline.

## Layout

```
server/         Node + Socket.IO auction server (self-hosted mode)
src/screens/    Home · Live · ProductDetail · Seller · Shop · Sell · Activity · Account ·
                Checkout · Confirm · Studio (socket host) · StudioServerless (supabase host)
src/live/       engine (auction rules) · useAuctionRoom (engine runner / offline sim) ·
                useLiveRoom (transport picker) · useSupabaseRoom (serverless viewer) ·
                useHostRoom (serverless host) · supabase · socket
src/data/       seed fixtures (lots, listings, sellers, bots)
src/theme/      design tokens + app styles (CLAUDE.md §4)
public/         dummy product photos, seller videos, posters, avatars, PWA icons
scripts/        gen-icons.mjs (regenerates PWA icons, zero deps)
```

Dummy media: product photos in `public/assets/products/`, per-seller looped videos in `public/videos/` (shown when the seller isn't broadcasting a real camera).

## Next steps (per CLAUDE.md milestones)

- Persist lots/orders in Postgres; Redis pub/sub for multi-node rooms.
- Real auth (OTP) instead of per-tab guest identities.
- Stripe checkout; Web Push for outbid / going-live / shipped.
- Swap WebRTC mesh for an SFU or HLS (e.g. MediaMTX, LiveKit) beyond ~10 viewers.
