import type { ChatMessage, Lot } from '../data/seed';
import { nextId } from '../lib/format';

/* ---- bid increments (§7) ---- */

export function inc(bid: number): number {
  if (bid < 50) return 5;
  if (bid < 150) return 10;
  if (bid < 400) return 20;
  return 50;
}

export function nextBidOf(state: Pick<RoomState, 'bidCount' | 'currentBid'>, lot: Lot): number {
  return state.bidCount === 0 ? lot.start : state.currentBid + inc(state.currentBid);
}

export function quickChips(nextBid: number): [number, number, number] {
  const i2 = inc(nextBid);
  return [nextBid, nextBid + i2, nextBid + i2 * 3];
}

/* ---- pace presets ---- */

export type PaceName = 'Calm' | 'Lively' | 'Frenzy';

export interface Pace {
  chatEvery: number;
  bidEvery: number;
  threshold: number;
}

export const PACES: Record<PaceName, Pace> = {
  Calm: { chatEvery: 2600, bidEvery: 3200, threshold: 0.5 },
  Lively: { chatEvery: 1800, bidEvery: 1900, threshold: 0.68 },
  Frenzy: { chatEvery: 1100, bidEvery: 1100, threshold: 0.82 },
};

export const LOT_SECONDS = 15;
const ANTI_SNIPE_WINDOW = 6;
const ANTI_SNIPE_RESET = 8;

/* ---- room state ---- */

export type LotStatus = 'open' | 'sold' | 'won';

export interface Bidder {
  handle: string;
  color: string;
  isHost?: boolean;
  isYou?: boolean;
  uid?: string; // stable per-device id — how remote winners are identified
}

export interface RoomState {
  lots: Lot[];
  lotIndex: number;
  currentBid: number; // equals lot.start until the first bid lands
  bidCount: number;
  bidder: Bidder | null;
  youWin: boolean;
  timeLeft: number;
  status: LotStatus;
  soldPrice: number | null;
  chat: ChatMessage[];
  viewers: number;
  bidKey: number; // bump to re-trigger the bidPop animation
}

export type RoomAction =
  | { type: 'tick' }
  | { type: 'bid'; by: Bidder; amount: number }
  | { type: 'chat'; msg: ChatMessage }
  | { type: 'viewers'; count: number }
  | { type: 'nextLot' };

const CHAT_CAP = 40;

export function lotOf(state: RoomState): Lot {
  return state.lots[state.lotIndex];
}

export function initRoom(lots: Lot[], viewers: number, seedChat: ChatMessage[]): RoomState {
  return {
    lots,
    lotIndex: 0,
    currentBid: lots[0].start,
    bidCount: 0,
    bidder: null,
    youWin: false,
    timeLeft: LOT_SECONDS,
    status: 'open',
    soldPrice: null,
    chat: seedChat,
    viewers,
    bidKey: 0,
  };
}

function pushChat(chat: ChatMessage[], msg: ChatMessage): ChatMessage[] {
  const next = [...chat, msg];
  return next.length > CHAT_CAP ? next.slice(next.length - CHAT_CAP) : next;
}

export function roomReducer(state: RoomState, action: RoomAction): RoomState {
  switch (action.type) {
    case 'tick': {
      if (state.status !== 'open') return state;
      const timeLeft = state.timeLeft - 1;
      if (timeLeft > 0) return { ...state, timeLeft };
      // lot ends — won only if the top bidder is the current user
      return {
        ...state,
        timeLeft: 0,
        status: state.youWin ? 'won' : 'sold',
        soldPrice: state.bidCount > 0 ? state.currentBid : null,
      };
    }

    case 'bid': {
      if (state.status !== 'open') return state;
      // anti-snipe: any accepted bid inside the window resets the clock
      const timeLeft = state.timeLeft < ANTI_SNIPE_WINDOW ? ANTI_SNIPE_RESET : state.timeLeft;
      const line: ChatMessage = {
        id: nextId('bid'),
        userId: action.by.isYou ? 'you' : action.by.handle,
        handle: action.by.handle,
        color: action.by.color,
        text: `bid ₹${action.amount.toLocaleString('en-IN')}`,
        type: 'bid',
        isHost: action.by.isHost,
        ts: Date.now(),
      };
      return {
        ...state,
        currentBid: action.amount,
        bidCount: state.bidCount + 1,
        bidder: action.by,
        youWin: !!action.by.isYou,
        timeLeft,
        bidKey: state.bidKey + 1,
        chat: pushChat(state.chat, line),
      };
    }

    case 'chat':
      return { ...state, chat: pushChat(state.chat, action.msg) };

    case 'viewers':
      return { ...state, viewers: action.count };

    case 'nextLot': {
      const lotIndex = (state.lotIndex + 1) % state.lots.length;
      const lot = state.lots[lotIndex];
      return {
        ...state,
        lotIndex,
        currentBid: lot.start,
        bidCount: 0,
        bidder: null,
        youWin: false,
        timeLeft: LOT_SECONDS,
        status: 'open',
        soldPrice: null,
      };
    }
  }
}
