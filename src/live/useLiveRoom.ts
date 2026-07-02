import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChatMessage, Lot, Seller } from '../data/seed';
import { nextId } from '../lib/format';
import { quickChips, type RoomState } from './engine';
import { getSocket, RTC_CONFIG } from './socket';
import { supabaseEnabled } from './supabase';
import { useSupabaseRoom } from './useSupabaseRoom';
import { useAuctionRoom, type AuctionRoom } from './useAuctionRoom';

export type LiveMode = 'connecting' | 'server' | 'sim';

interface ServerRoom {
  lots: Lot[];
  lotIndex: number;
  currentBid: number;
  bidCount: number;
  bidder: { userId: string; handle: string; color: string } | null;
  nextBid: number;
  validAmounts: number[];
  status: 'open' | 'ended';
  soldPrice: number | null;
  endsAt: number;
  chat: ChatMessage[];
  viewers: number;
  broadcasting: boolean;
}

interface WonLot {
  lot: Lot;
  price: number;
}

export interface LiveRoom extends AuctionRoom {
  mode: LiveMode;
  remoteStream: MediaStream | null;
  broadcasting: boolean;
}

const CHAT_CAP = 40;
const CONNECT_GRACE_MS = 2500;

/**
 * Transport precedence:
 *  1. Supabase Realtime (serverless / Vercel) — the /studio host device owns the auction
 *  2. Socket.IO auction server (local dev / self-hosted)
 *  3. Local simulation ("demo · offline sim")
 */
export function useLiveRoom(seller: Seller, lots: Lot[]): LiveRoom {
  const supa = useSupabaseRoom(seller, lots, supabaseEnabled);
  const sock = useSocketRoom(seller, lots, !supabaseEnabled);
  return supabaseEnabled ? supa : sock;
}

function useSocketRoom(seller: Seller, lots: Lot[], enabled: boolean): LiveRoom {
  const [mode, setMode] = useState<LiveMode>('connecting');
  const [srv, setSrv] = useState<ServerRoom | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const [bidKey, setBidKey] = useState(0);
  const [won, setWon] = useState<WonLot | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const myIdRef = useRef<string | null>(null);
  const clockOffsetRef = useRef(0); // serverNow - clientNow
  const srvRef = useRef(srv);
  srvRef.current = srv;
  const wonRef = useRef(won);
  wonRef.current = won;
  const pcRef = useRef<RTCPeerConnection | null>(null);

  const sim = useAuctionRoom(seller, lots, 'Lively', enabled && mode === 'sim');

  /* ---- socket lifecycle ---- */

  useEffect(() => {
    if (!enabled) return;
    const socket = getSocket();
    const roomId = seller.id;
    let disposed = false;

    const applyState = (s: Partial<ServerRoom> & { serverNow?: number }) => {
      if (s.serverNow) clockOffsetRef.current = s.serverNow - Date.now();
      setSrv((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...s };
        if (s.currentBid != null && s.currentBid !== prev.currentBid) setBidKey((k) => k + 1);
        return next;
      });
    };

    const join = () => {
      socket.emit('join', { roomId }, (res: { ok: boolean; snapshot?: ServerRoom & { serverNow: number } }) => {
        if (disposed || !res?.ok || !res.snapshot) return;
        clockOffsetRef.current = res.snapshot.serverNow - Date.now();
        setSrv({ ...res.snapshot, chat: res.snapshot.chat ?? [] });
        setMode('server');
        if (res.snapshot.broadcasting) socket.emit('rtc.watch', { roomId });
      });
    };

    const onHello = (h: { userId: string }) => {
      myIdRef.current = h.userId;
    };

    const onState = (s: ServerRoom & { roomId: string; serverNow: number }) => {
      if (s.roomId !== roomId) return;
      // detect the moment we win: status flips to ended with us on top
      const prev = srvRef.current;
      if (
        prev &&
        prev.status === 'open' &&
        s.status === 'ended' &&
        s.bidder?.userId === myIdRef.current &&
        !wonRef.current
      ) {
        setWon({ lot: prev.lots[s.lotIndex] ?? prev.lots[prev.lotIndex], price: s.soldPrice ?? s.currentBid });
      }
      applyState(s);
    };

    const onChat = (msg: ChatMessage) => {
      setSrv((prev) => {
        if (!prev) return prev;
        const chat = [...prev.chat, msg];
        return { ...prev, chat: chat.length > CHAT_CAP ? chat.slice(chat.length - CHAT_CAP) : chat };
      });
    };

    const onViewers = ({ count }: { count: number }) => {
      setSrv((prev) => (prev ? { ...prev, viewers: count } : prev));
    };

    const onBroadcast = ({ live }: { live: boolean }) => {
      setSrv((prev) => (prev ? { ...prev, broadcasting: live } : prev));
      if (live) {
        socket.emit('rtc.watch', { roomId });
      } else {
        pcRef.current?.close();
        pcRef.current = null;
        setRemoteStream(null);
      }
    };

    const onOffer = async ({ from, sdp }: { from: string; sdp: RTCSessionDescriptionInit }) => {
      pcRef.current?.close();
      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;
      pc.ontrack = (e) => setRemoteStream(e.streams[0] ?? null);
      pc.onicecandidate = (e) => {
        if (e.candidate) socket.emit('rtc.ice', { to: from, candidate: e.candidate });
      };
      await pc.setRemoteDescription(sdp);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('rtc.answer', { to: from, sdp: answer });
    };

    const onIce = ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      pcRef.current?.addIceCandidate(candidate).catch(() => {});
    };

    socket.on('hello', onHello);
    socket.on('auction.state', onState);
    socket.on('chat.msg', onChat);
    socket.on('viewers.count', onViewers);
    socket.on('broadcast.state', onBroadcast);
    socket.on('rtc.offer', onOffer);
    socket.on('rtc.ice', onIce);
    socket.on('connect', join);

    if (socket.connected) join();
    const grace = setTimeout(() => {
      if (!disposed && !srvRef.current) setMode('sim');
    }, CONNECT_GRACE_MS);

    return () => {
      disposed = true;
      clearTimeout(grace);
      socket.emit('leave', { roomId });
      socket.off('hello', onHello);
      socket.off('auction.state', onState);
      socket.off('chat.msg', onChat);
      socket.off('viewers.count', onViewers);
      socket.off('broadcast.state', onBroadcast);
      socket.off('rtc.offer', onOffer);
      socket.off('rtc.ice', onIce);
      socket.off('connect', join);
      pcRef.current?.close();
      pcRef.current = null;
    };
  }, [seller.id, enabled]);

  // late reconnect wins over sim fallback: srv arriving flips mode back to server
  useEffect(() => {
    if (srv && mode !== 'server') setMode('server');
  }, [srv, mode]);

  /* ---- derived clock (resynced from server timestamps) ---- */

  useEffect(() => {
    if (!enabled || mode !== 'server') return;
    const t = setInterval(() => {
      const s = srvRef.current;
      if (!s) return;
      const serverNow = Date.now() + clockOffsetRef.current;
      setTimeLeft(Math.max(0, Math.ceil((s.endsAt - serverNow) / 1000)));
    }, 250);
    return () => clearInterval(t);
  }, [mode]);

  /* ---- actions ---- */

  const placeBid = useCallback(
    (amount?: number) => {
      if (mode !== 'server') {
        sim.placeBid(amount);
        return;
      }
      const s = srvRef.current;
      if (!s || s.status !== 'open') return;
      const amt = amount ?? s.nextBid;
      if (!s.validAmounts.includes(amt)) return;
      getSocket().emit(
        'bid.place',
        { roomId: seller.id, amount: amt, nonce: nextId('n') },
        (res: { ok: boolean; state?: Partial<ServerRoom> & { serverNow: number } }) => {
          // authoritative state reconciles the optimistic update either way
          if (res?.state) {
            if (res.state.serverNow) clockOffsetRef.current = res.state.serverNow - Date.now();
            setSrv((prev) => (prev ? { ...prev, ...res.state } : prev));
          }
        },
      );
      // optimistic: show your bid immediately, server confirms within ~250ms
      setBidKey((k) => k + 1);
      setSrv((prev) =>
        prev
          ? {
              ...prev,
              currentBid: amt,
              bidCount: prev.bidCount + 1,
              bidder: { userId: myIdRef.current ?? 'me', handle: 'you', color: '#ff2d6f' },
            }
          : prev,
      );
    },
    [mode, seller.id, sim],
  );

  const sendChat = useCallback(
    (text: string) => {
      if (mode !== 'server') {
        sim.sendChat(text);
        return;
      }
      const trimmed = text.trim().slice(0, 200);
      if (trimmed) getSocket().emit('chat.send', { roomId: seller.id, text: trimmed });
    },
    [mode, seller.id, sim],
  );

  const continueToNext = useCallback(() => {
    if (mode !== 'server') {
      sim.continueToNext();
      return;
    }
    setWon(null);
    getSocket().emit('room.sync', { roomId: seller.id }, (res: { ok: boolean; snapshot?: ServerRoom & { serverNow: number } }) => {
      if (res?.ok && res.snapshot) {
        clockOffsetRef.current = res.snapshot.serverNow - Date.now();
        setSrv({ ...res.snapshot, chat: res.snapshot.chat ?? [] });
      }
    });
  }, [mode, seller.id, sim]);

  /* ---- compose the room interface ---- */

  return useMemo<LiveRoom>(() => {
    if (mode !== 'server' || !srv) {
      return { ...sim, mode, remoteStream: null, broadcasting: false };
    }

    const myId = myIdRef.current;
    const youWin = srv.bidder?.userId === myId;
    const lot = won ? won.lot : srv.lots[srv.lotIndex];
    const state: RoomState = {
      lots: srv.lots,
      lotIndex: won ? Math.max(0, srv.lots.findIndex((l) => l.id === won.lot.id)) : srv.lotIndex,
      currentBid: won ? won.price : srv.currentBid,
      bidCount: srv.bidCount,
      bidder: srv.bidder
        ? { handle: srv.bidder.handle, color: srv.bidder.color, isYou: srv.bidder.userId === myId }
        : null,
      youWin: won ? true : youWin,
      timeLeft: won ? 0 : timeLeft,
      status: won ? 'won' : srv.status === 'ended' ? 'sold' : 'open',
      soldPrice: won ? won.price : srv.soldPrice,
      chat: srv.chat,
      viewers: srv.viewers,
      bidKey,
    };

    const nextBid = srv.nextBid;
    return {
      state,
      lot,
      nextBid,
      chips: (srv.validAmounts.length === 3
        ? (srv.validAmounts as [number, number, number])
        : quickChips(nextBid)),
      placeBid,
      injectBid: () => false,
      sendChat,
      continueToNext,
      mode,
      remoteStream,
      broadcasting: srv.broadcasting,
    };
  }, [mode, srv, sim, timeLeft, bidKey, won, remoteStream, placeBid, sendChat, continueToNext]);
}
