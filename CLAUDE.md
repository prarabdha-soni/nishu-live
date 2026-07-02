# CLAUDE.md — Nishu: Live Jewellery Auction PWA

Build guide for turning the **Nishu** design prototype into a complete, production **Progressive Web App**. Nishu is a seller-centric live-auction commerce app (live-shopping pattern, à la Whatnot) focused on **silver & gemstone jewellery**. The flagship seller is **Nishu Silver Jewellery** (`@nishusilver`).

> This file is the source of truth for product behaviour, the design system, and the auction engine. The reference prototype is `Nishu.dc.html` — read it for exact markup, but build the PWA fresh against this spec (don't port the prototype's `.dc.html` runtime).

---

## 1. What we're building

A mobile-first PWA where buyers watch a seller's **live video auction**, bid in real time, chat, and check out — plus browse the seller's shop, follow hosts, and apply to become a seller. Seller is at the centre of the experience (users follow **hosts**, not individual products).

Core loop: **Home → tap a live seller → Live auction → bid → win → checkout → confirm.**

Non-negotiables:
- Installable, offline-capable PWA (manifest + service worker).
- Real-time bidding with a **server-authoritative clock** (no trusting the client).
- Push notifications (outbid, seller going live, order shipped).
- 60fps mobile UI, 390×844 design baseline, safe-area aware.

---

## 2. Recommended stack

- **Frontend:** React 18 + TypeScript + Vite.
- **PWA:** `vite-plugin-pwa` (Workbox) for manifest + service worker + offline precache.
- **Routing:** React Router (one route per screen, see §5).
- **State:** Zustand (light global store: auth, auction room, cart, follows). React Query/TanStack Query for server data.
- **Styling:** Tailwind CSS **or** CSS Modules — either is fine, but encode the tokens in §4 as CSS variables / Tailwind theme. Keep the exact colors, radii, and type scale.
- **Real-time:** Socket.IO (or raw WebSocket) client for the auction room.
- **Backend (reference):** Node + Socket.IO, Postgres (Prisma), Redis (auction state + pub/sub across nodes), Stripe (payments), S3/Cloudflare R2 (media), Web Push / FCM (notifications). Live video via a streaming provider (Mux, LiveKit, Agora, or HLS from the seller's stream).
- **Auth:** phone/email OTP or OAuth; JWT/session.

Don't over-engineer v1: the auction engine + real-time room + checkout are the hard parts. Everything else is CRUD + static screens.

---

## 3. Brand & voice

- Clean, friendly, light. Vibrant accent on a warm off-white canvas. Not dark, not luxury-cold.
- Copy is warm and plain: "Say something…", "Going once…", "You won this lot at auction!", "We review every seller."
- Seller-first: the host's name, rating, and follow button lead every live/detail screen.
- No emoji in UI chrome (chat messages may include the occasional 🎉 from the host, that's it).

---

## 4. Design system (tokens)

### Color
```
--ink            #1C1A19   // primary text, dark buttons
--ink-2          #3A332E
--text-secondary #6B635D
--text-muted     #A79E97
--text-faint     #B3ABA4 / #C2B8B0

--canvas         #FBF8F5   // app screen bg
--desk           radial-gradient(120% 120% at 50% 0%, #EFEAE4, #E1DAD2)  // behind phone
--surface        #FFFFFF   // cards
--border         #EFE7E0
--border-2       #F1E9E2
--divider        #F3ECE6

--accent         #FF2D6F   // primary CTA / brand pink (bids, follow, sell)
--live           #F5333F   // LIVE badges, red states
--gold           #F5C518   // "For You" pill
--gold-soft      #FFD84D / #FFF3C4
--rating         #C9A227
--verified       #7B45C2   // verified check (purple) — storefront uses #2A6FDB
--success        #15B37D   // won / shipped / free
--success-ink    #0E7A52
--success-bg     #EAF8F1
```

Category / pastel card backgrounds (Shop + Home seller cards):
```
cream #F5EEE2 · lavender #EFE6FB / #EEE4FB · peach #FBEFE0 / #FAEEE0
rose #FBE5EC · mint #E6F4EC
```

### Type
- **Hanken Grotesk** (weights 400/500/600/700/800) — all UI. This is the workhorse; use 700–800 for headings and prices.
- **Instrument Serif** — optional accent (was the wordmark). Use sparingly or drop.
- **Material Symbols Rounded** — all icons (`font-variation-settings:'FILL' 1` for filled).
- Scale (mobile): screen titles 27px/800; section titles 21px/800; card titles 14–16px/700–800; body 13.5–14px/500; labels 11px/800 tracked `.6px` uppercase; price hero 30px/800.

### Radius
- Phone frame 46px · cards 18–22px · buttons 14px · chips/pills 999px · small tiles 11–14px.

### Shadow
- Card: `0 12px 26px -18px rgba(40,28,20,.45)`
- Elevated/hero: `0 22px 44px -22px rgba(40,28,20,.6)`
- Pink CTA glow: `0 10px 24px -8px rgba(255,45,111,.6)`

### Motion (keyframes to reproduce)
- `chatIn` — new chat line fades/slides up (`opacity 0→1`, `translateY 10px→0`, .35s).
- `bidPop` — current bid scales `1→1.14→1` on change (.4s). Re-key on each bid.
- `soldIn` — SOLD/WON badge & success checks pop in (scale .7→1.07→1, .5s).
- `dotPulse` — live dot opacity pulse (1.4s infinite).
- `ringPulse` — expanding red ring on "live now" thumbnail (2.2s infinite).
- `floatY` — hero product gently floats/rotates.

### Product imagery
The prototype fakes product photos two ways — **replace both with real seller media in the PWA**:
1. **CSS-gradient "swatches"** keyed by a `material` string. Keep this as the *fallback/skeleton* when an image is missing. Materials → tints:
   `silver #AEB4BB · darksilver #6E767E · pearl #C9BBA6 · amethyst #7B45C2 · sapphire #2A57C2 · emerald #159C66 · ruby #C71E50 · gold #C9A227`. Each swatch = radial highlight top-left + a 140° gradient + inset shadow (gives a gem/metal look). Reuse for loading states.
2. **Generated illustration PNGs** in `assets/` (`seller-jewellery.png`, `seller-saree.png`, `seller-kurti.png`, `shop-lehenga.png`, `shop-accessories.png`) sit inside drag-drop image slots. In production these become real uploaded photos served from object storage with responsive `srcset`.

The **live video feed** is a placeholder `<canvas>` animation (spinning silver ring + faceted gem + bokeh + vignette). In the PWA this is replaced by the real **video stream element** (HLS/WebRTC). Keep the canvas as the poster/reconnecting fallback.

---

## 5. Screens & navigation

Single-seller storefront model. Ten screens; each should be a route.

| Route | Screen | Purpose |
|---|---|---|
| `/` | **Home** | Discovery: search, For You / Followed Hosts pills, **Top Sellers** list |
| `/live/:sellerId` | **Live auction** | The core: video feed, chat, real-time bidding, SOLD/WON |
| `/product/:id` | **Product detail** | Buy-now price, bid-live, specs, shipping |
| `/seller/:id` | **Seller storefront** | Cover, follow, stats, live banner, listings grid |
| `/shop` | **Shop collection** | Search + full-width category cards |
| `/sell` | **Sell** | Seller registration form → "application received" |
| `/activity` | **Activity** | Live banner + notifications (outbid, won, shipped, price drop) |
| `/account` | **Account** | Profile, stats, settings rows, become-a-seller CTA |
| `/checkout` | **Checkout** | Won/bought item, address, payment, summary |
| `/confirm` | **Confirmed** | Order success |

### Bottom nav (5 tabs)
`Home · Shop · [ Sell + ] · Activity · Account` — Sell is a raised pink circular `+` button in the centre. Active tab = accent pink, inactive = `#B3ABA4`.
**Show nav on:** home, shop, sell, activity, account, seller. **Hide on:** live, detail, checkout, confirm (immersive/flow screens).

### Screen details
- **Home:** pill search ("Search Nishu") + chat / notifications / rewards icons. Two pills: **For You** (gold) and **Followed Hosts** (blush + heart). **Top Sellers** = vertical list of full-width pastel cards; each card: product image bleeding from the right (masked fade), seller handle + verified check, category, and a red **Live · N** badge. Tapping a card → that seller's live room. (v1 ships 3 sellers: `jewelrysparkle`/Jewellery, `sareestyle`/Sarees, `kurticollection`/Kurtis — all currently route to the one live auction; wire per-seller rooms when multi-seller lands.)
- **Live auction:** full-bleed video; top-left seller chip (avatar, handle, ⭐4.9, ship <1d, Follow); top-right viewer count + collapse. "Auction rules" popover (how bidding works). Right action rail (More/Share/Report/Shop). Live chat stack (newest at bottom, host badge, bid lines highlighted green). "Say something…" composer. **Auction panel** (see §7). SOLD/WON overlay on timer end.
- **Product detail:** big image, share/save, seller row (→ storefront), **BUY NOW** price + **OR BID LIVE from $1**, 2×2 spec grid (metal/stone/size/hallmark), details copy, free-insured-shipping card, sticky bottom bar: **Bid live** + **Buy · $price**.
- **Seller storefront:** cover, overlapping avatar + Follow, name + verified, @handle, ⭐ / followers / sales, bio, "Silver Auction Night — live" watch banner, **Listings** 2-col grid.
- **Shop collection:** title, search, 5 full-width category cards (Saree/Kurti/Lehenga/Jewellery/Accessories) with item counts and photos.
- **Sell (registration):** form — Shop/brand name (required), "What do you sell?" category chips (single-select), About textarea, "How often will you go live?" (Daily/Weekly/Monthly), "Where should we notify you?" contact (required). Submit → **Application received** state echoing name + contact, "reviewed within 24 hours." Enabled only when shop + contact are non-empty. Reachable from the nav `+` and the Account CTA.
- **Activity:** "nishusilver is live now" join banner (ringPulse) + notification rows (icon tile, title, sub, timestamp). Types: outbid, won a lot, order shipped, price drop, seller added lots.
- **Account:** avatar + name (@avasharma), stat tiles (Won lots / Orders / Saved), settings rows (won lots, orders, saved, payment, addresses, settings, help), **Become a seller** pink button.
- **Checkout:** optional "You won this lot at auction!" banner, item card, deliver-to address, payment method, summary (winning bid, free insured shipping, buyer protection included, total), sticky **Place order**.
- **Confirmed:** green check, "Order confirmed", order card (#NSH-####), arriving date, Back to auction / View in Activity.

---

## 6. Data model

Seed data from the prototype — use it for fixtures/first migration.

```ts
type Material = 'silver'|'darksilver'|'pearl'|'amethyst'|'sapphire'|'emerald'|'ruby'|'gold';

interface Lot {        // auction lots (live)
  id: string; name: string; material: Material;
  start: number;       // opening bid
  value: number;       // ~market settle price (rival bots stop here)
  metal: string; stone: string; size: string;
  imageUrl?: string;
}
interface Listing {    // shop buy-now items
  id: string; name: string; material: Material;
  metal: string; stone: string; size: string;
  price: number; imageUrl?: string;
}
interface Seller {
  id: string; handle: string; name: string; verified: boolean;
  rating: number; followers: number; sales: number; bio: string;
  category: string; liveViewers?: number;
}
interface ChatMessage {
  id: string; userId: string; handle: string; color: string;
  text: string; type: 'msg'|'joined'|'bid'; isHost?: boolean; ts: number;
}
interface SellerApplication {
  shop: string; category: string; about: string;
  frequency: 'Daily'|'Weekly'|'Monthly'; contact: string;
}
```

**Lots (6)** — Sterling Silver Signet Ring ($5→~$120, Black Onyx, US9) · Moonstone Halo Pendant ($10→~$185) · Amethyst Drop Earrings ($8→~$95) · Oxidised Silver Cuff ($12→~$160) · Blue Topaz Cocktail Ring ($10→~$210) · Garnet Charm Necklace ($6→~$130). All 925 Sterling.

**Listings (6)** mirror the lots as buy-now: $135 / $210 / $110 / $175 / $240 / $150.

**Categories (Shop):** Saree 120 · Kurti 150 · Lehenga 90 · Jewellery 200 · Accessories 140. (The account/browse taxonomy also has Rings/Necklaces/Earrings/Bracelets/Gemstone/Oxidised/Charms/Under $50 — keep whichever fits your catalog.)

**Chat bots:** 8 sample users (`silverfox_ny`, `mira.jewels`, `the_curator`(host/mod), `oxide_ollie`, `pearl.diver`, `garnet_gal`, `stackqueen`, `noor.j`) + a rotating pool of ~12 short messages. In production, chat is real; keep a small "ambient" bot only if you want liveliness on quiet streams.

**Current user:** Ava Sharma (@avasharma) — 3 won lots, 38 orders, 64 saved. Address: 214 Larkspur Lane Apt 5, Brooklyn NY 11215. Card: Visa ···· 4242.

---

## 7. Auction engine (the heart — spec precisely)

The prototype simulates this client-side. **In the PWA the server owns it** and broadcasts state over WebSocket; the client renders and sends bid intents. Reproduce these exact rules.

### Bid increments
```
inc(bid) = bid < 50  → 5
           bid < 150 → 10
           bid < 400 → 20
           else      → 50
nextBid = (bidCount === 0) ? lot.start : currentBid + inc(currentBid)
```

### Quick-bid chips
Three buttons: `[ nextBid, nextBid + i2, nextBid + i2*3 ]` where `i2 = inc(nextBid)`. First chip is emphasised (pink outline). Main button places `nextBid`.

### Timer & anti-snipe
- Each lot has a **15s** countdown, ticking 1s.
- **Any accepted bid** (rival or you) with `timeLeft < 6` resets `timeLeft = 8`. This is the anti-snipe rule — surface it in the "Auction rules" popover.
- Status line: `timeLeft ≤ 6` → "Going once…" (amber); `≤ 3` → "Going twice…" (red).
- On `timeLeft === 0`: lot ends. **Won if the top bidder is the current user.** Show SOLD (red) or YOU WON! (green) overlay. If not won, auto-advance to next lot after ~2.6s. Winner sees **Pay now · $bid** → checkout with `won:true`.

### Rival bidding (simulation only — delete when real bidders exist)
On an interval (pace-based), a random bot may bid:
- Stop entirely once `currentBid ≥ lot.value` (market reached).
- Probability gate by pace (below). Skip if `nextBid > lot.value * 1.08`. Skip if the picked bot is already top bidder.
- On bid: set `currentBid = nextBid`, `bidCount++`, `bidder = bot`, apply anti-snipe, push a green "bid $X" chat line, re-key `bidPop`.

### Pace presets (tweakable — expose in seller/admin tools)
```
Calm    → chat every 2600ms, bid every 3200ms, rival threshold 0.50
Lively  → 1800ms / 1900ms / 0.68   (default)
Frenzy  → 1100ms / 1100ms / 0.82
```

### Placing your bid
Sets top bidder to "you", `youWin = true`, applies anti-snipe, pushes your bid to chat. When you're already winning, the main button reads **"You're winning · re-bid $X"** and turns green-tinted; otherwise **"Place bid · $X"** in pink.

### Server-authoritative real-time (production)
- Client sends `bid.place {lotId, amount}`. Server validates amount == server's `nextBid`, that the auction is open, and that `timeLeft > 0`; rejects stale/duplicate bids (idempotency key). Server holds the clock; broadcasts `auction.state` (currentBid, bidder, bidCount, timeLeft, status) to the room ≥ 4×/sec or on change.
- Use Redis for room state + pub/sub so multiple socket nodes stay consistent.
- Optimistic UI on the bidder's device, reconciled by the next authoritative `auction.state`.
- Reconnect: on socket reconnect, fetch a full room snapshot and resync the clock (`serverNow - lotEndsAt`).

---

## 8. Real-time channel

One **auction room** per live seller. Events:
- Server→client: `room.snapshot`, `auction.state`, `lot.changed`, `chat.msg`, `viewers.count`, `sold` (winnerId, price).
- Client→server: `bid.place`, `chat.send`, `join`/`leave`, `follow.toggle`.
Rate-limit `chat.send` and `bid.place`. Sanitise chat. Persist chat + bid history for replay/receipts.

---

## 9. PWA requirements

- **`manifest.webmanifest`:** name "Nishu", short_name "Nishu", `display:"standalone"`, `theme_color:"#FBF8F5"`, `background_color:"#FBF8F5"`, portrait orientation, maskable icons 192/512, categories shopping. Add screenshots for the install prompt.
- **Service worker (Workbox via vite-plugin-pwa):**
  - Precache the app shell (HTML/CSS/JS, fonts, icons).
  - Runtime cache: product images `CacheFirst` (30-day, capped); API GETs (catalog, seller, activity) `StaleWhileRevalidate`; **never** cache the auction WebSocket or auth.
  - Offline fallback page for navigations.
  - `skipWaiting` + `clientsClaim`, with an in-app "Update available — refresh" toast.
- **Install:** custom "Add to Home Screen" prompt (capture `beforeinstallprompt`).
- **Push notifications** (Web Push + FCM fallback): drive the Activity feed — **outbid**, **seller going live** (followed hosts), **you won**, **order shipped**, **price drop on saved**. Ask permission contextually (e.g., after first follow or first bid), never on cold load.
- **Safe areas:** honour `env(safe-area-inset-*)`; the bottom nav and sticky CTAs must clear the home indicator. Design baseline 390×844.
- **Perf:** lazy-load routes; keep the live room lean; target LCP < 2.5s on mid mobile; use `content-visibility` for long lists; responsive images with `srcset`/AVIF/WebP.
- **A11y:** all icon buttons get `aria-label`; live region for the current bid + timer; ≥44px touch targets (already the spec); visible focus.

---

## 10. Suggested structure

```
src/
  app/            router, providers, PWA registration
  screens/        Home, Live, ProductDetail, Seller, Shop, Sell, Activity, Account, Checkout, Confirm
  components/     BottomNav, SellerCard, ProductCard, ChatStack, AuctionPanel, QuickBidChips,
                  Timer, LiveBadge, Swatch (gradient fallback), ImageSlot, StatTile, Field
  live/           socket client, useAuctionRoom(), auction reducer, clock sync
  store/          auth, follows, cart (Zustand)
  api/            catalog, seller, activity, checkout (React Query hooks)
  theme/          tokens.css (the §4 variables) or tailwind.config
  pwa/            manifest, sw registration, push
  data/           seed fixtures (lots, listings, sellers, users, messages)
public/           icons, splash, product images
```

---

## 11. Build milestones

1. **Shell & tokens** — Vite+TS+router, tokens from §4, bottom nav, empty routed screens, PWA manifest + SW installable.
2. **Static catalog** — Home, Shop, Product detail, Seller storefront, Account from seed data + real images.
3. **Auction (local sim)** — port §7 rules into a reducer + `useAuctionRoom` with the timers; full Live screen incl. chat, panel, SOLD/WON, checkout+confirm. Ships as a believable demo with no backend.
4. **Real-time** — swap the sim for a Socket.IO room with a server-authoritative clock; reconnect/resync.
5. **Live video** — replace the canvas with the real stream (HLS/WebRTC); canvas becomes poster/fallback.
6. **Accounts, payments, notifications** — auth, Stripe checkout, Web Push wired to the Activity events; Sell application persists + emails the team.
7. **Polish** — offline states, install prompt, a11y pass, perf budget, analytics.

---

## 12. Conventions & guardrails

- Keep the exact tokens in §4 — colors, radii, type scale, motion. The look is warm-neutral canvas + vibrant pink; don't drift dark or add gradients-as-decoration.
- Prices: whole dollars, `$` + `toLocaleString('en-US')`. Timer: `0:SS`.
- Seller-first everywhere: host identity + Follow lead live/detail screens.
- The gradient **Swatch** is only a fallback/skeleton — real photos are the default in production.
- Auction correctness > flashiness: the **server owns the clock and validates every bid**. Never let the client decide who won.
- Mobile-only for v1 (390-wide baseline). A responsive/desktop pass can come later.
