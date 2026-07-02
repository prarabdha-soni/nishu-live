// Server-authoritative auction room (§7 of CLAUDE.md).
// The server owns the clock (endsAt timestamp) and validates every bid.
import { BOTS, BOT_MESSAGES, HOST_MESSAGES } from './lots.js';

export const LOT_MS = 15_000;
const ANTI_SNIPE_WINDOW_MS = 6_000;
const ANTI_SNIPE_RESET_MS = 8_000;
const NEXT_LOT_DELAY_MS = 2_800;
const BROADCAST_MS = 250; // ≥ 4×/sec
const CHAT_CAP = 40;

export const PACES = {
  Off: null,
  Calm: { chatEvery: 2600, bidEvery: 3200, threshold: 0.5 },
  Lively: { chatEvery: 1800, bidEvery: 1900, threshold: 0.68 },
  Frenzy: { chatEvery: 1100, bidEvery: 1100, threshold: 0.82 },
};

export function inc(bid) {
  if (bid < 50) return 5;
  if (bid < 150) return 10;
  if (bid < 400) return 20;
  return 50;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

let seq = 0;
function msgId() {
  return `m${Date.now().toString(36)}-${++seq}`;
}

export class AuctionRoom {
  constructor(io, id, lots, hooks = {}) {
    this.io = io;
    this.id = id;
    this.channel = `room:${id}`;
    this.lots = lots;
    this.hooks = hooks; // { onBid({room,user,amount,prevBidder}), onSold({room,winner,price,lot}) }
    this.paceName = 'Lively';
    this.hostSocketId = null;
    this.broadcasting = false;
    this.chat = [];
    this.nonces = new Map(); // userId -> Set of recent nonces

    this.resetLot(0);
    this.timers = {
      tick: setInterval(() => this.tick(), BROADCAST_MS),
      bots: null,
      chat: null,
    };
    this.applyPace();
  }

  resetLot(index) {
    this.lotIndex = index % this.lots.length;
    this.currentBid = this.lot.start;
    this.bidCount = 0;
    this.bidder = null;
    this.status = 'open';
    this.soldPrice = null;
    this.endsAt = Date.now() + LOT_MS;
  }

  get lot() {
    return this.lots[this.lotIndex];
  }

  get nextBid() {
    return this.bidCount === 0 ? this.lot.start : this.currentBid + inc(this.currentBid);
  }

  /** legal amounts right now: the three quick chips */
  get validAmounts() {
    const nb = this.nextBid;
    const i2 = inc(nb);
    return [nb, nb + i2, nb + i2 * 3];
  }

  viewers() {
    return this.io.sockets.adapter.rooms.get(this.channel)?.size ?? 0;
  }

  publicState() {
    return {
      roomId: this.id,
      lotIndex: this.lotIndex,
      lotId: this.lot.id,
      currentBid: this.currentBid,
      bidCount: this.bidCount,
      bidder: this.bidder,
      nextBid: this.nextBid,
      validAmounts: this.validAmounts,
      status: this.status,
      soldPrice: this.soldPrice,
      endsAt: this.endsAt,
      serverNow: Date.now(),
    };
  }

  snapshot() {
    return {
      ...this.publicState(),
      lots: this.lots,
      chat: this.chat.slice(-30),
      viewers: this.viewers(),
      broadcasting: this.broadcasting,
      pace: this.paceName,
    };
  }

  emitState() {
    this.io.to(this.channel).emit('auction.state', this.publicState());
  }

  emitChat(msg) {
    this.chat.push(msg);
    if (this.chat.length > CHAT_CAP) this.chat.splice(0, this.chat.length - CHAT_CAP);
    this.io.to(this.channel).emit('chat.msg', msg);
  }

  emitViewers() {
    this.io.to(this.channel).emit('viewers.count', { count: this.viewers() });
  }

  tick() {
    if (this.status === 'open' && Date.now() >= this.endsAt) {
      this.status = 'ended';
      this.soldPrice = this.bidCount > 0 ? this.currentBid : null;
      this.io.to(this.channel).emit('sold', {
        lotId: this.lot.id,
        lotIndex: this.lotIndex,
        winnerId: this.bidder?.userId ?? null,
        winnerHandle: this.bidder?.handle ?? null,
        price: this.soldPrice,
      });
      if (this.bidder && this.soldPrice != null) {
        this.hooks.onSold?.({ room: this, winner: this.bidder, price: this.soldPrice, lot: this.lot });
      }
      setTimeout(() => this.advance(), NEXT_LOT_DELAY_MS);
    }
    this.emitState();
  }

  advance() {
    this.resetLot(this.lotIndex + 1);
    this.io.to(this.channel).emit('lot.changed', { lotIndex: this.lotIndex, lot: this.lot });
    this.emitState();
  }

  /**
   * Validate and accept a bid from a real user.
   * Rejections return { ok:false, reason } plus fresh state so the client resyncs.
   */
  placeBid(user, amount, nonce) {
    const fail = (reason) => ({ ok: false, reason, state: this.publicState() });

    if (this.status !== 'open') return fail('auction-closed');
    if (Date.now() >= this.endsAt) return fail('too-late');
    if (typeof amount !== 'number' || !Number.isFinite(amount)) return fail('bad-amount');
    if (!this.validAmounts.includes(amount)) return fail('stale-amount');

    // idempotency: drop duplicate nonces
    if (nonce != null) {
      let seen = this.nonces.get(user.userId);
      if (!seen) {
        seen = new Set();
        this.nonces.set(user.userId, seen);
      }
      if (seen.has(nonce)) return fail('duplicate');
      seen.add(nonce);
      if (seen.size > 50) seen.delete(seen.values().next().value);
    }

    this.acceptBid(user, amount);
    return { ok: true, state: this.publicState() };
  }

  acceptBid(user, amount) {
    const prevBidder = this.bidder;
    this.currentBid = amount;
    this.bidCount += 1;
    this.bidder = { userId: user.userId, handle: user.handle, color: user.color };
    const remaining = this.endsAt - Date.now();
    if (remaining < ANTI_SNIPE_WINDOW_MS) this.endsAt = Date.now() + ANTI_SNIPE_RESET_MS;
    this.emitChat({
      id: msgId(),
      userId: user.userId,
      handle: user.handle,
      color: user.color,
      text: `bid $${amount.toLocaleString('en-US')}`,
      type: 'bid',
      isHost: !!user.isHost,
      ts: Date.now(),
    });
    this.emitState();
    this.hooks.onBid?.({ room: this, user, amount, prevBidder });
  }

  sendChat(user, text) {
    const clean = String(text ?? '')
      .replace(/[\x00-\x1f\x7f]/g, '')
      .trim()
      .slice(0, 200);
    if (!clean) return;
    this.emitChat({
      id: msgId(),
      userId: user.userId,
      handle: user.handle,
      color: user.color,
      text: clean,
      type: 'msg',
      isHost: !!user.isHost,
      ts: Date.now(),
    });
  }

  /* ---- rival bots (simulation — turn Off from the studio when real bidders join) ---- */

  applyPace() {
    clearInterval(this.timers.bots);
    clearInterval(this.timers.chat);
    const pace = PACES[this.paceName];
    if (!pace) return;

    this.timers.bots = setInterval(() => {
      if (this.status !== 'open') return;
      if (this.bidCount > 0 && this.currentBid >= this.lot.value) return; // market reached
      if (Math.random() > pace.threshold) return;
      const amount = this.nextBid;
      if (amount > this.lot.value * 1.08) return;
      const bot = pick(BOTS);
      if (this.bidder && this.bidder.userId === `bot:${bot.handle}`) return;
      this.acceptBid({ userId: `bot:${bot.handle}`, handle: bot.handle, color: bot.color, isHost: bot.isHost }, amount);
    }, pace.bidEvery);

    this.timers.chat = setInterval(() => {
      const bot = pick(BOTS);
      const joined = Math.random() < 0.12;
      this.emitChat({
        id: msgId(),
        userId: `bot:${bot.handle}`,
        handle: bot.handle,
        color: bot.color,
        text: joined ? 'joined the auction' : bot.isHost ? pick(HOST_MESSAGES) : pick(BOT_MESSAGES),
        type: joined ? 'joined' : 'msg',
        isHost: bot.isHost,
        ts: Date.now(),
      });
    }, pace.chatEvery);
  }

  setPace(name) {
    if (!(name in PACES)) return;
    this.paceName = name;
    this.applyPace();
  }

  setBroadcasting(live) {
    this.broadcasting = live;
    this.io.to(this.channel).emit('broadcast.state', { live });
  }
}
