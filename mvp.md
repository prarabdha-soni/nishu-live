# Nishu MVP — Tech Design (₹0 / $0, super fast)

Complete technical design for the MVP that is **already built in this repo**: a Whatnot-style live auction — real camera stream, real-time bidding with a server-owned clock, chat, checkout — running on a **100% free stack**. This doc describes what exists, exactly how fast it is, where the free tier tops out, and how to put it on the internet without paying anyone.

> Production upgrade path (Postgres/Supabase, SFU video, payments, scale): see [prod.md](prod.md).

---

## 1. Design goals

| Goal | Target | How |
|---|---|---|
| Cost | $0/month, no card required | Self-hosted Node, WebRTC, free tunnels/CDN free tiers |
| Bid feel | Instant — ack < 100ms, everyone sees it < 300ms | Optimistic UI + 4 Hz authoritative broadcast + event-on-change |
| Video latency | Sub-second (bids and video must agree) | WebRTC (not HLS — HLS adds 3–15s and breaks auction feel) |
| Fairness | Server decides everything | Server-authoritative clock, strict bid validation, anti-snipe |
| Works offline / demo | Always demoable | Local auction simulation fallback baked into the client |
| Installable | Real PWA | Manifest + Workbox service worker, offline shell |

---

## 2. Stack (everything free)

```
┌─────────────────────────────── Client (PWA) ───────────────────────────────┐
│ React 18 + TypeScript + Vite · Zustand · React Router                      │
│ vite-plugin-pwa (Workbox): precache shell, CacheFirst images,              │
│ StaleWhileRevalidate API GETs, never cache the socket                      │
│ socket.io-client (bidding/chat/state) · RTCPeerConnection (video)          │
└──────────────┬─────────────────────────────────────────────┬──────────────┘
               │ WebSocket (Socket.IO)                        │ WebRTC (SRTP)
┌──────────────▼──────────────────────────────┐   ┌──────────▼──────────────┐
│ Auction server — Node 20 + Express          │   │ Seller camera            │
│ + Socket.IO (server/index.js)               │   │ getUserMedia @ /studio   │
│ · AuctionRoom: clock, validation, anti-snipe│◄──┤ signaling relayed over   │
│ · chat + rate limits + nonce idempotency    │   │ the same Socket.IO conn  │
│ · WebRTC signaling relay (offer/answer/ICE) │   │ STUN: Google (free)      │
│ · serves dist/ (the built PWA)              │   └──────────────────────────┘
│ · in-memory state (optional SQLite later)   │
└─────────────────────────────────────────────┘
```

| Layer | Choice | Cost |
|---|---|---|
| Frontend | React 18 + TS + Vite + vite-plugin-pwa, deployed on **Vercel** (free) | $0 |
| Realtime + bidding | **Serverless:** Supabase Realtime channel, auction engine runs on the host's /studio tab · **Self-hosted:** Node + Socket.IO server | $0 |
| Live video | WebRTC mesh: seller → each viewer, Google STUN | $0 |
| Storage | In-memory (seed fixtures); add SQLite (`better-sqlite3`) when orders must survive restarts | $0 |
| Auth | Per-tab guest identity (sessionStorage suffix); host key env var for the seller | $0 |
| Push | Web Push with self-generated VAPID keys (no vendor) | $0 |
| Public HTTPS | Cloudflare Tunnel (`cloudflared`) → free `*.trycloudflare.com` URL to localhost | $0 |
| Always-on host (optional) | Oracle Cloud Always Free VM (ARM, 4 OCPU/24 GB) — genuinely free forever | $0 |
| CI + repo | GitHub free | $0 |

**Total: $0/month.** The only real resource is the seller's upload bandwidth.

---

## 3. The bidding system (the heart)

### 3.1 Rules (implemented in `server/room.js`, mirrored in `src/live/engine.ts`)

```
increment(bid):  < $50 → $5 · < $150 → $10 · < $400 → $20 · else → $50
nextBid       :  bidCount == 0 ? lot.start : currentBid + increment(currentBid)
quickChips    :  [nextBid, nextBid + i2, nextBid + 3·i2]   where i2 = increment(nextBid)
clock         :  15s per lot, stored as an END TIMESTAMP (endsAt), never a countdown int
anti-snipe    :  any accepted bid with < 6s left  →  endsAt = now + 8s
lot end       :  now ≥ endsAt → status ended; top bidder wins at currentBid; next lot after 2.8s
```

Storing the clock as `endsAt` (ms epoch) instead of a decrementing counter is what makes the system honest: there is nothing to drift, pause, or tamper with. Clients *render* a countdown from `endsAt − (now + clockOffset)`.

### 3.2 Bid path — what happens in the first 300ms

```
t=0     buyer taps "Place bid · $45"
t=0     client: optimistic render (price pops, "you are winning"), nonce attached
t≈20ms  server: validate → accept → anti-snipe check → chat line + auction.state broadcast
t≈40ms  bidder receives ack {ok, state} → optimistic state reconciled (or rolled back)
t≤250ms every other viewer has the new price (event-on-change + 4 Hz state tick)
```

### 3.3 Server-side validation (every single bid)

1. Room exists and lot `status === 'open'`.
2. `now < endsAt` — the clock is law, not the client's rendered timer.
3. Amount is a finite number **and exactly one of the three legal chip amounts** — a stale/raced amount is rejected with `stale-amount` plus fresh state so the client resyncs instantly.
4. **Idempotency**: every bid carries a client nonce; replays (double-tap, socket retry) are dropped.
5. **Rate limit**: ≥ 200ms between bids per socket; chat ≥ 1.2s, 200 chars, control-chars stripped.

### 3.4 State sync & reconnect

- `auction.state` broadcast at **4 Hz** *and* immediately on every change; carries `serverNow` so every client continuously recomputes `clockOffset = serverNow − Date.now()`.
- On join/reconnect: `room.snapshot` (lots, chat tail, viewers, state, `serverNow`) — one round trip to fully resync.
- Client freezes a local "YOU WON" snapshot when it wins (so the overlay survives the room auto-advancing), then `room.sync`s when dismissed.
- No server reachable → the client silently falls back to the **local simulation** (same rules, rival bots) labeled "demo · offline sim". The demo never dies on stage.

### 3.5 Liveliness: rival bots (until you have real traffic)

Server-side bot bidders with host-controllable pace — `Off / Calm / Lively / Frenzy` (bid every 3200/1900/1100ms, probability 0.50/0.68/0.82). Bots stop at the lot's market value and never outbid themselves. Turn `Off` from /studio to test pure human bidding.

### 3.6 Event protocol (Socket.IO)

| Direction | Event | Payload |
|---|---|---|
| C→S | `join` / `leave` | `{roomId}` → ack `{snapshot}` |
| C→S | `bid.place` | `{roomId, amount, nonce}` → ack `{ok, reason?, state}` |
| C→S | `chat.send` | `{roomId, text}` |
| C→S | `room.sync` | `{roomId}` → ack `{snapshot}` |
| C→S (host) | `host.claim` `host.nextLot` `host.pace` `host.golive` `host.endlive` | key-gated |
| S→C | `auction.state` | price/bidder/`endsAt`/`serverNow`/`validAmounts`, 4 Hz + on change |
| S→C | `sold` | `{lotId, winnerId, winnerHandle, price}` |
| S→C | `lot.changed` / `chat.msg` / `viewers.count` / `broadcast.state` / `hello` | — |
| both | `rtc.offer` `rtc.answer` `rtc.ice` `rtc.watch` `rtc.viewer` `rtc.viewer-left` | WebRTC signaling relay |

---

## 4. Live streaming (Whatnot feel, $0)

### 4.1 MVP: WebRTC mesh (built)

Seller's browser (`/studio`) captures camera+mic and opens one `RTCPeerConnection` **per viewer**; the Socket.IO server only relays signaling. Latency is glass-to-glass **200–500ms** — comfortably inside the auction feel, better than Whatnot's own HLS fallback.

**The honest limit:** the seller uploads one copy of the stream per viewer.

| Seller upload | 720p @ ~1.5 Mbps supports |
|---|---|
| 10 Mbps | ~5 viewers |
| 50 Mbps | ~25 viewers |
| 100 Mbps | ~50 viewers (CPU becomes the cap first, ~15–30 encodes) |

Practical MVP ceiling: **~8–10 concurrent viewers**. That is exactly right for "test my own live sell."

### 4.2 Free upgrade when you outgrow mesh (no code-throwaway)

Drop-in **MediaMTX** (single free binary, self-hosted): seller publishes once via WHIP, viewers pull via WHEP (still WebRTC, still sub-second). Server bandwidth becomes the cap instead of the seller's laptop — on a free Oracle VM you serve **50–100+ viewers at $0**. The auction/bidding layer doesn't change at all; only the video transport swaps.

### 4.3 Fallback video

When the seller isn't broadcasting, rooms loop per-seller dummy MP4s (`public/videos/`) — the room always looks alive, and the poster doubles as the reconnect frame.

---

## 5. Going public for $0 (four modes)

1. **Vercel + Supabase (recommended — no server at all):** the app deploys as a static PWA on Vercel; **Supabase Realtime** (free tier) carries bids, chat, auction state, and WebRTC signaling. The `/studio` tab on the seller's device **is** the auction authority — it runs the same engine, validates every incoming bid, and broadcasts state. Nothing else to host. Set `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` in Vercel env and deploy. HTTPS comes free, so the camera and PWA install work everywhere.
2. **LAN test:** `npm run build && npm start` → phones on the same wifi hit `http://<your-ip>:8787` (Socket.IO server mode).
3. **Internet, laptop as server:** `cloudflared tunnel --url http://localhost:8787` → free public **HTTPS** URL. Zero config, zero cost.
4. **Always-on:** Oracle Cloud Always Free ARM VM (or any spare machine): `git clone && npm ci && npm run build && HOST_KEY=<secret> node server/index.js` behind `caddy` (free, auto-HTTPS).

### 5.1 Dummy payments & dummy orders (test mode)

The whole money loop runs end-to-end with **no real charges**:

- Anyone watching can bid. When the clock hits zero, the top bidder sees **YOU WON!** → **Pay now** → checkout (address + "Visa ···· 4242 · Test mode") → **Place order**.
- Placing the order generates an order number (`NSH-####`) and the Confirmed screen shows **"Dummy payment received — test mode, no real charge."**
- The winner's order is broadcast back to the seller: the `/studio` **"Orders received (test payments)"** list shows `#NSH-#### · lot · @buyer · $price` the moment they pay.
- Nothing is persisted — no users, no orders, no accounts. The **only** optional persistence is the bid ledger: if a `bids` table exists in your Supabase project, every accepted bid is inserted (room, lot, handle, amount); if the table doesn't exist, the app silently skips it. One SQL statement in the README enables it.
- Swapping the dummy payment for Stripe/Razorpay later only touches the checkout submit handler — the bidding, win, and order-announce flow stays identical (see prod.md).

---

## 6. Performance engineering notes

- **One process, zero hops**: bid → validate → broadcast happens in a single event-loop tick; no DB or queue on the hot path. In-memory room state is what makes $0 also *fast*.
- Socket.IO fanout at MVP scale (≤ a few hundred sockets) is trivial; the 4 Hz tick costs ~O(viewers) small JSON frames.
- Client: lazy-routed screens; the Live screen re-renders only on state deltas; `bidPop`/`chatIn` are CSS keyframes (compositor, not JS); chat capped at 40 lines.
- PWA: precached shell → repeat loads render from disk; images CacheFirst (30d); fonts cached; LCP target < 2.5s on mid-range mobile, 60fps interactions at the 390×844 baseline.
- Measured in this repo: bid ack round-trip **< 50ms on localhost/LAN**; full-room convergence bounded by the 250ms tick.

## 7. Security (MVP-appropriate)

- Host actions gated by `HOST_KEY` (env var); host socket pinned per room; disconnect kills the broadcast flag.
- All amounts/state decided server-side; clients can only *ask*.
- Chat sanitized server-side + rendered as React text (no HTML injection); rate limits on chat and bids; handle sanitization; nonce replay protection.
- No PII stored anywhere in the MVP; guest identities are throwaway.

## 8. Known MVP limits (accepted on purpose)

| Limit | Why it's fine for MVP | Fixed in |
|---|---|---|
| State lost on restart | Test sessions are ephemeral | prod.md §DB |
| Single node, no failover | One seller, tens of viewers | prod.md §Scale |
| Guest auth, fake checkout | Testing the *sell*, not the ledger | prod.md §Auth/Payments |
| Mesh video ~10 viewers | Seller-side test audience | §4.2 / prod.md §Video |
| No moderation tooling | You are the only host | prod.md §T&S |
