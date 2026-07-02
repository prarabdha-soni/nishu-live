# Nishu Production — Tech Design (minimal cost, Whatnot-grade)

Production architecture for Nishu: real users, real money, real streams — engineered for **lowest possible monthly cost** without giving up sub-second video or the instant-bid feel. Every choice below has a free tier or a single-digit-dollar price, and a clear upgrade valve when you grow.

> The MVP you can run today for $0 is specced in [mvp.md](mvp.md). This doc is the path from there.
> Prices are approximate as of mid-2026 — verify before committing.

---

## 1. SLOs (what "super fast" means, in numbers)

| Metric | Target |
|---|---|
| Bid accept ack (p50 / p95) | < 60ms / < 150ms |
| Bid visible to all viewers in room (p95) | < 300ms |
| Video glass-to-glass latency | < 800ms (WebRTC) — never HLS-class 5–15s for auction rooms |
| Auction clock skew across clients | < 100ms (server timestamps, continuous offset resync) |
| Cold PWA load LCP (mid mobile) | < 2.5s |
| Room join → full snapshot | < 1 RTT + 50ms |
| Availability (auction path) | 99.9% |

---

## 2. Stack at a glance

| Concern | Pick | Why | Monthly cost (start → grow) |
|---|---|---|---|
| Frontend hosting | **Cloudflare Pages** | free, global CDN, instant deploys from Git | $0 |
| Realtime + auction engine | **Node (Fastify + Socket.IO) on Hetzner VPS** | best price/perf on the internet; 20 TB traffic included | €4.5–13 (CX22→CX32) |
| Database | **Supabase (managed Postgres)** | Postgres + Auth + Storage + Realtime + RLS in one, generous free tier | $0 → $25 (Pro) |
| Hot state / pub-sub | **Redis — Upstash** (or Redis on the same VPS) | auction room state, socket fanout across nodes, rate limits | $0 (free tier) → pay-per-use |
| Live video | **LiveKit (self-hosted SFU) on Hetzner** | open-source WebRTC SFU, <500ms, thousands of viewers per node | included in VPS → +€6.8/node |
| TURN | coturn on the same VPS (or Cloudflare TURN $0.05/GB) | ~10–15% of users need relay | ~$0 |
| Auth | **Supabase Auth** (email OTP/magic link + Google) | free, integrates with RLS; add SMS OTP later (SMS costs real money) | $0 |
| Payments | **Stripe** (global) / **Razorpay** (India) | no fixed fee — pure % per transaction | 2–3% of GMV only |
| Object storage / images | **Cloudflare R2** + image resizing | S3-compatible, **zero egress fees** | $0 (10 GB free) → ~$0.015/GB |
| Push | **Web Push (VAPID) + FCM** | both free | $0 |
| Observability | **Sentry** (errors) + **Grafana Cloud** (metrics/logs) + UptimeRobot | all free tiers | $0 |
| CI/CD | GitHub Actions | free tier is plenty | $0 |

**Floor: ~$5/mo** (one Hetzner VPS, everything else on free tiers). **Comfortable production: ~$60/mo** (2 VPS + Supabase Pro + headroom). Details in §10.

---

## 3. Architecture

```
                    ┌──────────────── Cloudflare (free) ────────────────┐
                    │  Pages (PWA shell)   ·   CDN/R2 (images, posters) │
                    └──────────────┬────────────────────────────────────┘
                                   │ https
        ┌──────────────────────────▼───────────────────────────┐
        │                     Client PWA                        │
        │   Socket.IO (bids/chat/state)      WebRTC (video)     │
        └───────────┬──────────────────────────────┬───────────┘
                    │ wss                          │ SRTP
     ┌──────────────▼───────────────┐   ┌──────────▼───────────────┐
     │  Realtime nodes (1..N)       │   │  LiveKit SFU (1..N)      │
     │  Fastify + Socket.IO         │   │  seller publishes once,  │
     │  · room worker = single      │   │  SFU fans out to viewers │
     │    writer per auction room   │   │  (simulcast 720/360/180) │
     │  · validates every bid       │   └──────────┬───────────────┘
     │  · Redis adapter for fanout  │              │ join tokens (JWT)
     └───────┬──────────────┬───────┘              │
             │              │          ┌───────────▼───────────┐
   ┌─────────▼─────┐  ┌─────▼───────┐  │  API (same node app)  │
   │ Redis         │  │ Postgres    │  │  auth, catalog, orders │
   │ (Upstash/VPS) │  │ (Supabase)  │  │  webhooks (Stripe)     │
   │ room state,   │  │ system of   │  └───────────────────────┘
   │ pub/sub, rate │  │ record:     │
   │ limits, locks │  │ bids ledger,│
   └───────────────┘  │ orders, ... │
                      └─────────────┘
```

**Placement rule:** the hot path (bid → validate → broadcast) touches **memory + Redis only**. Postgres is the system of record, written asynchronously; it is never awaited inside the bid path.

---

## 4. Bidding engine, production-grade

The MVP rules carry over unchanged (increments, `endsAt` clock, 6s→8s anti-snipe, exact-amount validation, nonce idempotency, rate limits — see mvp.md §3). Production adds correctness under scale and crashes:

### 4.1 Single writer per room
Every auction room is **owned by exactly one worker** (consistent-hash `roomId → node`; ownership lease in Redis `SET room:owner:{id} NX PX 5000`, renewed every 2s). All bids for a room funnel to its owner — no distributed locking on the hot path, no race conditions by construction. Any socket node can *receive* a bid; it forwards over Redis pub/sub to the owner, which validates and broadcasts. Owner crashes → lease expires in ≤5s → another node loads the room's Redis snapshot and resumes the clock (`endsAt` is an absolute timestamp, so a takeover doesn't stretch the auction).

### 4.2 Durability
- Room state (current lot, `endsAt`, top bid, bid count) mirrored to Redis on every change (`HSET`, ~50µs).
- Every accepted bid appended to a **Redis Stream** (`XADD bids:{roomId}`) — the authoritative ledger of the show.
- A background consumer batches the stream into Postgres `bids` (system of record, receipts, disputes, analytics). Loss window on total Redis failure: seconds, and only for a live show's in-flight lot — acceptable; money only moves at checkout, which is Postgres+Stripe transactional.
- `sold` → creates a Postgres `orders` row with `status='pending_payment'` inside the same async consumer, idempotent on `(lot_id, show_id)`.

### 4.3 Fairness hardening
- Server timestamps every bid at arrival; ties resolved by arrival order at the single writer (deterministic).
- Anti-snipe extension is capped (max 10 extensions per lot) to prevent infinite stalling.
- Per-user AND per-IP rate limits (Redis token bucket); shadow-ban list checked at accept time.
- Payment discipline: winner has 10 min to pay (`pending_payment` → `expired`); repeat offenders lose bidding rights (`users.strike_count`).

### 4.4 Reconnect & multi-device
Same snapshot/resync protocol as MVP. JWT (Supabase) identifies the user across devices; `winnerId` is the user id, not the socket id, so you can win on the phone and pay on the laptop.

---

## 5. Database (Supabase Postgres)

```sql
users          (id uuid pk, handle citext unique, phone, email, avatar_url,
                strike_count int default 0, created_at)
sellers        (id uuid pk, user_id fk, handle citext unique, name, verified bool,
                rating numeric, bio, category, stripe_account_id)   -- Stripe Connect
follows        (user_id fk, seller_id fk, pk(user_id, seller_id))
shows          (id uuid pk, seller_id fk, title, status enum[scheduled,live,ended],
                scheduled_at, started_at, ended_at)
lots           (id uuid pk, show_id fk, name, description, start_cents int,
                reserve_cents int null, order_idx int, image_urls text[],
                status enum[queued,open,sold,passed])
bids           (id bigserial pk, lot_id fk, user_id fk, amount_cents int,
                nonce text, created_at timestamptz,
                unique(lot_id, user_id, nonce))                      -- idempotency
orders         (id uuid pk, order_no text unique, user_id fk, lot_id fk null,
                listing_id fk null, amount_cents int, status enum[pending_payment,
                paid,shipped,delivered,cancelled,expired],
                payment_intent_id text, address jsonb, created_at)
listings       (id uuid pk, seller_id fk, name, price_cents, specs jsonb, image_urls)
notifications  (id, user_id fk, type, payload jsonb, read_at, created_at)
applications   (id, shop, category, about, frequency, contact, status, created_at)
chat_archive   (show_id fk, msg jsonb, ts)          -- batch-flushed for replay/receipts
```

- **RLS** on for everything client-readable via Supabase (catalog, own orders/notifications); the auction server uses the service role.
- Indexes: `bids(lot_id, created_at)`, `orders(user_id, created_at)`, `shows(status)`, `follows(seller_id)`.
- Supabase free: 500 MB DB / 50k MAU auth — months of runway. Pro at $25/mo removes pausing and adds PITR.

---

## 6. Live video (Whatnot-grade, minimal cost)

**Self-hosted LiveKit SFU** — the cost/latency sweet spot:

- Seller publishes **once** (WebRTC, simulcast 720p/360p/180p). SFU forwards packets — no transcoding, so CPU stays tiny; **bandwidth is the only real cost**, and Hetzner includes 20 TB/mo.
- Latency stays **< 500ms** — bids and video agree, the Whatnot feel.
- Capacity per €6.8 CX32 node: ~1 Gbps egress ≈ **600–700 concurrent 360p viewers** (or ~250 at 720p). 20 TB/mo ≈ ~2M viewer-minutes at 1.5 Mbps.
- Auth: API issues short-lived LiveKit JWTs (`canPublish` only for the show's seller; viewers subscribe-only).
- The client swap from MVP is contained to `LiveVideo`/studio (~200 lines): getUserMedia + manual peers → LiveKit SDK `Room.connect()`.
- Recording (VOD replays) later: LiveKit Egress → R2.

Managed valves if you'd rather not run it: **LiveKit Cloud** (free tier, then usage) or **Cloudflare Realtime SFU** (~$0.05/GB after 1 TB free). Same client SDK — switching is a URL + keys change.
Scale-out: shard shows across SFU nodes (a show pins to one node; LiveKit multi-node handles overflow).

---

## 7. Auth, payments, notifications

- **Auth:** Supabase email OTP / magic link + Google OAuth at $0. Phone OTP only when justified (SMS ≈ $0.01–0.05 each — the one thing that quietly costs money). Socket handshake carries the Supabase JWT; server verifies signature locally (JWKS cached) — no per-connection auth API call.
- **Payments:** Stripe PaymentIntents; **Stripe Connect** (Express) to route funds to sellers minus platform fee. Winner flow: `sold` → order `pending_payment` → sheet with saved card (off-session confirm) → webhook `payment_intent.succeeded` flips to `paid` (webhook is the source of truth, idempotent on event id). India-first: Razorpay Route equivalent (~2% + GST).
- **Push (all free):** Web Push (VAPID) + FCM for installed Android. Events: outbid (only if not returned to top within 5s — debounced server-side), followed-seller-live, you-won, order-shipped, price-drop. Permission asked contextually (after first follow/bid), never on load.

---

## 8. Performance engineering

- Bid hot path budget (p50): parse ~0.1ms · validate in-memory ~0.1ms · Redis mirror ~1ms (same-box Redis) · broadcast serialize ~1ms → **ack < 5ms server-side**; network RTT dominates.
- `auction.state` frames are ~300 bytes; 4 Hz × 1,000 sockets ≈ 10 Mbps — noise next to video.
- Socket nodes: Fastify + Socket.IO with `@socket.io/redis-adapter`; sticky sessions at the LB (Caddy/HAProxy on the VPS; Cloudflare proxies wss fine). One CX32 handles ~10–20k idle sockets; CPU is fanout-bound, so shard rooms across nodes before that.
- Postgres never blocks bids: writes are stream-consumed in batches (100ms flush).
- Frontend: unchanged PWA discipline from MVP (precache, lazy routes, compositor-only animations, capped chat, `content-visibility` on feeds). Images via R2 + Cloudflare resizing (AVIF/WebP, `srcset`).

## 9. Observability & T&S

- **Sentry** (client+server errors, free), **Grafana Cloud** (Prometheus metrics: bid ack p95, state fanout lag, room ownership churn, SFU egress; free tier), UptimeRobot on `/healthz`, logs as JSON → Grafana Loki.
- Alerts: bid p95 > 150ms · ownership takeovers > 1/min · payment webhook failures · SFU egress > 80%.
- T&S: chat rate limits + profanity filter server-side, report → mod queue, seller KYC via Stripe Connect onboarding, per-user strike/ban tables enforced at bid-accept.

## 10. Cost at three scales (monthly, approx — verify current pricing)

| | **Launch** (≤50 concurrent, 1–2 shows/day) | **Traction** (~500 concurrent nightly) | **Growth** (~5k concurrent, multi-show) |
|---|---|---|---|
| Compute (Hetzner) | 1× CX22 — €4.5 (app+Redis+SFU+coturn) | CX32 app + CX32 SFU — ~€14 | 2× app + 3× SFU + LB — ~€50 |
| Supabase | Free | Pro $25 | Pro $25–100 |
| Upstash Redis | Free (or on-VPS $0) | ~$5 | ~$20 (or on-VPS) |
| Cloudflare Pages/R2/DNS | $0 | ~$1 | ~$10 |
| Sentry/Grafana/CI | $0 | $0 | ~$20 |
| **Fixed total** | **~$5** | **~$50** | **~$180–250** |
| Stripe/Razorpay | 2–3% of GMV (scales with revenue, not traffic) | ″ | ″ |

Comparison: the same Growth tier on managed everything (IVS/Mux video + managed sockets + RDS) runs $1.5k–5k/mo. Self-hosted SFU + Hetzner bandwidth is the whole trick.

## 11. Migration path from the MVP (each step independently shippable)

1. **Supabase in** — schema §5, catalog/orders/applications move to Postgres; Supabase Auth replaces guest identities (socket handshake carries JWT). *(~2–3 days)*
2. **Redis in** — room state mirror + bid stream + rate limits; auction engine unchanged, now crash-safe. *(1–2 days)*
3. **LiveKit in** — replace mesh in `LiveVideo` + `/studio`; keep mesh as dev fallback. *(1–2 days)*
4. **Stripe in** — PaymentIntents + webhooks + Connect onboarding for sellers. *(2–4 days)*
5. **Push + observability** — VAPID/FCM wiring to the existing Activity events; Sentry/Grafana. *(1–2 days)*
6. **Scale valves** (only when metrics say so) — second socket node + Redis adapter; second SFU node; Supabase Pro.

The auction rules, event protocol, screens, and PWA shell **do not change** at any step — that's why the MVP was built with a server-authoritative engine from day one.
