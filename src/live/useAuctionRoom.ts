import { useEffect, useMemo, useReducer, useRef } from 'react';
import type { ChatMessage, Lot, Seller } from '../data/seed';
import { BOTS, BOT_MESSAGES, CURRENT_USER, HOST_MESSAGES } from '../data/seed';
import { nextId } from '../lib/format';
import {
  initRoom,
  lotOf,
  nextBidOf,
  PACES,
  quickChips,
  roomReducer,
  type Bidder,
  type PaceName,
  type RoomState,
} from './engine';

const YOU: Bidder = { handle: CURRENT_USER.handle, color: '#ff2d6f', isYou: true };

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function seedChat(seller: Seller): ChatMessage[] {
  const host = BOTS.find((b) => b.isHost)!;
  return [
    {
      id: nextId('c'),
      userId: host.handle,
      handle: seller.handle,
      color: '#7b45c2',
      text: `Welcome to ${seller.showTitle}! Every lot starts low. 🎉`,
      type: 'msg',
      isHost: true,
      ts: Date.now(),
    },
    {
      id: nextId('c'),
      userId: 'pearl.diver',
      handle: 'pearl.diver',
      color: '#c9a227',
      text: 'joined the auction',
      type: 'joined',
      ts: Date.now(),
    },
    {
      id: nextId('c'),
      userId: 'mira.jewels',
      handle: 'mira.jewels',
      color: '#c71e50',
      text: 'been waiting for this all day',
      type: 'msg',
      ts: Date.now(),
    },
  ];
}

export interface AuctionRoom {
  state: RoomState;
  lot: Lot;
  nextBid: number;
  chips: [number, number, number];
  placeBid: (amount?: number) => void;
  /** Host mode: feed a remote viewer's bid into the authoritative engine. */
  injectBid: (by: Bidder, amount: number) => boolean;
  sendChat: (text: string, as?: Bidder) => void;
  continueToNext: () => void;
}

/**
 * The auction engine, run locally. Three uses:
 *  - offline/demo fallback for the Live screen
 *  - authoritative engine on the HOST device in serverless (Supabase) mode
 *  - idle (enabled=false) when a server-authoritative room is connected
 */
export function useAuctionRoom(
  seller: Seller,
  lots: Lot[],
  pace: PaceName = 'Lively',
  enabled = true,
  botsEnabled = true,
): AuctionRoom {
  const [state, dispatch] = useReducer(
    roomReducer,
    null,
    () => initRoom(lots, seller.liveViewers ?? 500, seedChat(seller)),
  );

  // interval callbacks read the latest state through a ref
  const stateRef = useRef(state);
  stateRef.current = state;

  const { chatEvery, bidEvery, threshold } = PACES[pace];

  // server clock (simulated): 1s tick
  useEffect(() => {
    if (!enabled) return;
    const t = setInterval(() => dispatch({ type: 'tick' }), 1000);
    return () => clearInterval(t);
  }, [enabled]);

  // rival bidding (simulation only — delete when real bidders exist)
  useEffect(() => {
    if (!enabled || !botsEnabled) return;
    const t = setInterval(() => {
      const s = stateRef.current;
      if (s.status !== 'open') return;
      const lot = lotOf(s);
      if (s.bidCount > 0 && s.currentBid >= lot.value) return; // market reached
      if (Math.random() > threshold) return;
      const amount = nextBidOf(s, lot);
      if (amount > lot.value * 1.08) return;
      const bot = pick(BOTS);
      if (s.bidder && !s.bidder.isYou && s.bidder.handle === bot.handle) return;
      dispatch({ type: 'bid', by: { handle: bot.handle, color: bot.color, isHost: bot.isHost }, amount });
    }, bidEvery);
    return () => clearInterval(t);
  }, [bidEvery, threshold, enabled, botsEnabled]);

  // ambient chat
  useEffect(() => {
    if (!enabled || !botsEnabled) return;
    const t = setInterval(() => {
      const bot = pick(BOTS);
      const joined = Math.random() < 0.12;
      const msg: ChatMessage = {
        id: nextId('c'),
        userId: bot.handle,
        handle: bot.handle,
        color: bot.color,
        text: joined ? 'joined the auction' : bot.isHost ? pick(HOST_MESSAGES) : pick(BOT_MESSAGES),
        type: joined ? 'joined' : 'msg',
        isHost: bot.isHost,
        ts: Date.now(),
      };
      dispatch({ type: 'chat', msg });
    }, chatEvery);
    return () => clearInterval(t);
  }, [chatEvery, enabled, botsEnabled]);

  // viewer count drift (sim ambience only)
  useEffect(() => {
    if (!enabled || !botsEnabled) return;
    const base = seller.liveViewers ?? 500;
    const t = setInterval(() => {
      const s = stateRef.current;
      const drift = Math.round((Math.random() - 0.45) * 14);
      dispatch({ type: 'viewers', count: Math.max(Math.round(base * 0.8), s.viewers + drift) });
    }, 2400);
    return () => clearInterval(t);
  }, [seller.liveViewers, enabled, botsEnabled]);

  // sold (not won by you) → auto-advance to the next lot
  useEffect(() => {
    if (!enabled || state.status !== 'sold') return;
    const t = setTimeout(() => dispatch({ type: 'nextLot' }), 2600);
    return () => clearTimeout(t);
  }, [state.status, state.lotIndex, enabled]);

  const lot = lotOf(state);
  const nextBid = nextBidOf(state, lot);
  const chips = useMemo(() => quickChips(nextBid), [nextBid]);

  return {
    state,
    lot,
    nextBid,
    chips,
    placeBid: (amount?: number) => {
      const s = stateRef.current;
      if (!enabled || s.status !== 'open') return;
      const legal = quickChips(nextBidOf(s, lotOf(s)));
      const amt = amount ?? legal[0];
      if (!legal.includes(amt)) return;
      dispatch({ type: 'bid', by: YOU, amount: amt });
    },
    injectBid: (by: Bidder, amount: number) => {
      const s = stateRef.current;
      if (!enabled || s.status !== 'open') return false;
      const legal = quickChips(nextBidOf(s, lotOf(s)));
      if (!legal.includes(amount)) return false;
      dispatch({ type: 'bid', by, amount });
      return true;
    },
    sendChat: (text: string, as?: Bidder) => {
      const trimmed = text.trim().slice(0, 200);
      if (!trimmed) return;
      dispatch({
        type: 'chat',
        msg: {
          id: nextId('c'),
          userId: as?.uid ?? 'you',
          handle: as?.handle ?? CURRENT_USER.handle,
          color: as?.color ?? '#ff2d6f',
          text: trimmed,
          type: 'msg',
          isHost: as?.isHost,
          ts: Date.now(),
        },
      });
    },
    continueToNext: () => dispatch({ type: 'nextLot' }),
  };
}
