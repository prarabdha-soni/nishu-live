import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { ChatMessage, Lot, Seller } from '../data/seed';
import { getColor, getHandle, getUid } from '../lib/identity';
import { nextId } from '../lib/format';
import { quickChips, type RoomState } from './engine';
import { RTC_CONFIG } from './socket';
import { liveChannel } from './supabase';
import type { LiveMode, LiveRoom } from './useLiveRoom';

interface HostSnapshot {
  sellerId: string;
  lotIndex: number;
  currentBid: number;
  bidCount: number;
  bidder: { handle: string; color: string; uid: string | null } | null;
  timeLeft: number;
  status: 'open' | 'ended';
  soldPrice: number | null;
  nextBid: number;
  validAmounts: [number, number, number];
  chat: ChatMessage[];
  viewers: number;
  live: boolean;
  hostAt: number;
}

const HOST_GRACE_MS = 3500;

/**
 * Serverless viewer (Vercel + Supabase mode): renders the host device's
 * authoritative broadcasts, sends bids/chat as broadcasts, and receives
 * the host camera over WebRTC. Falls back to the local sim when no host
 * is live on the channel.
 */
export function useSupabaseRoom(seller: Seller, lots: Lot[], enabled: boolean): LiveRoom {
  const [snap, setSnap] = useState<HostSnapshot | null>(null);
  const [hostSeen, setHostSeen] = useState(false);
  const [graceOver, setGraceOver] = useState(false);
  const [won, setWon] = useState<{ lot: Lot; price: number } | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [viewers, setViewers] = useState(0); // live count from channel presence (always accurate)

  const uid = getUid();
  const handle = getHandle();
  const color = getColor();

  const channelRef = useRef<RealtimeChannel | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const watchingRef = useRef(false);
  const snapRef = useRef(snap);
  snapRef.current = snap;
  const wonRef = useRef(won);
  wonRef.current = won;

  // waiting = the seller hasn't started the auction yet (no live host on the channel)
  const isLive = hostSeen && !!snap?.live;

  useEffect(() => {
    if (!enabled) return;
    const channel = liveChannel(seller.id);
    channelRef.current = channel;
    let disposed = false;

    channel.on('broadcast', { event: 'auction.state' }, ({ payload }) => {
      if (disposed || payload?.sellerId !== seller.id) return;
      const s = payload as HostSnapshot;
      const prev = snapRef.current;
      // the moment we win: open → ended with our uid on top
      if (prev && prev.status === 'open' && s.status === 'ended' && s.bidder?.uid === uid && !wonRef.current) {
        setWon({ lot: lots[s.lotIndex] ?? lots[0], price: s.soldPrice ?? s.currentBid });
      }
      setSnap(s);
      setHostSeen(true);
      if (s.live && !watchingRef.current) {
        watchingRef.current = true;
        void channel.send({ type: 'broadcast', event: 'rtc.watch', payload: { from: uid } });
      }
      if (!s.live && watchingRef.current) {
        watchingRef.current = false;
        pcRef.current?.close();
        pcRef.current = null;
        setRemoteStream(null);
      }
    });

    channel.on('broadcast', { event: 'rtc.offer' }, ({ payload }) => {
      if (disposed || payload?.to !== uid) return;
      void (async () => {
        pcRef.current?.close();
        const pc = new RTCPeerConnection(RTC_CONFIG);
        pcRef.current = pc;
        pc.ontrack = (e) => setRemoteStream(e.streams[0] ?? null);
        pc.onicecandidate = (e) => {
          if (e.candidate) {
            void channel.send({ type: 'broadcast', event: 'rtc.ice', payload: { to: payload.from, from: uid, candidate: e.candidate } });
          }
        };
        await pc.setRemoteDescription(payload.sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        void channel.send({ type: 'broadcast', event: 'rtc.answer', payload: { to: payload.from, from: uid, sdp: answer } });
      })();
    });

    channel.on('broadcast', { event: 'rtc.ice' }, ({ payload }) => {
      if (payload?.to !== uid) return;
      pcRef.current?.addIceCandidate(payload.candidate).catch(() => {});
    });

    // count everyone on this channel who's here as a viewer (includes us)
    channel.on('presence', { event: 'sync' }, () => {
      const entries = Object.values(channel.presenceState<{ role: string }>()).flat();
      setViewers(entries.filter((e) => e.role === 'viewer').length);
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') void channel.track({ uid, role: 'viewer' });
    });

    const grace = setTimeout(() => setGraceOver(true), HOST_GRACE_MS);

    return () => {
      disposed = true;
      clearTimeout(grace);
      watchingRef.current = false;
      pcRef.current?.close();
      pcRef.current = null;
      void channel.unsubscribe();
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, seller.id]);

  /* ---- actions (broadcast to the host) ---- */

  const placeBid = useCallback(
    (amount?: number) => {
      const s = snapRef.current;
      // no bidding until the seller is live and the lot is open
      if (!s || !s.live || s.status !== 'open') return;
      const amt = amount ?? s.nextBid;
      if (!s.validAmounts.includes(amt)) return;
      void channelRef.current?.send({
        type: 'broadcast',
        event: 'bid.request',
        payload: { uid, handle, color, amount: amt, nonce: nextId('n') },
      });
      // optimistic: host's authoritative state reconciles within ~1s
      setSnap((prev) =>
        prev ? { ...prev, currentBid: amt, bidCount: prev.bidCount + 1, bidder: { handle, color, uid } } : prev,
      );
    },
    [uid, handle, color],
  );

  const sendChat = useCallback(
    (text: string) => {
      // chatting is allowed while waiting for the seller to start
      const trimmed = text.trim().slice(0, 200);
      if (trimmed) {
        void channelRef.current?.send({ type: 'broadcast', event: 'chat.send', payload: { uid, handle, color, text: trimmed } });
      }
    },
    [uid, handle, color],
  );

  const continueToNext = useCallback(() => {
    setWon(null); // host advances the room on its own
  }, []);

  /* ---- compose ---- */

  return useMemo<LiveRoom>(() => {
    const waiting = !won && !isLive;
    const lotIndex = won
      ? Math.max(0, lots.findIndex((l) => l.id === won.lot.id))
      : snap?.lotIndex ?? 0;
    const lot = won ? won.lot : lots[lotIndex] ?? lots[0];
    const showBidder = !waiting && snap?.bidder;

    const state: RoomState = {
      lots,
      lotIndex,
      currentBid: won ? won.price : snap?.currentBid ?? lot.start,
      bidCount: snap?.bidCount ?? 0,
      bidder: showBidder
        ? { handle: snap!.bidder!.handle, color: snap!.bidder!.color, isYou: snap!.bidder!.uid === uid }
        : null,
      youWin: won ? true : !waiting && snap?.bidder?.uid === uid,
      timeLeft: won ? 0 : snap?.timeLeft ?? 15,
      status: won ? 'won' : waiting ? 'open' : snap?.status === 'ended' ? 'sold' : 'open',
      soldPrice: won ? won.price : snap?.soldPrice ?? null,
      chat: snap?.chat ?? [],
      viewers: Math.max(viewers, snap?.viewers ?? 0),
      bidKey: snap?.bidCount ?? 0,
    };

    const nextBid = snap?.nextBid ?? lot.start;
    const mode: LiveMode = hostSeen ? 'server' : graceOver ? 'sim' : 'connecting';

    return {
      state,
      lot,
      nextBid,
      chips: snap?.validAmounts.length === 3 ? snap.validAmounts : quickChips(nextBid),
      placeBid,
      injectBid: () => false,
      sendChat,
      continueToNext,
      mode,
      remoteStream,
      broadcasting: !!snap?.live,
      waiting,
    };
  }, [isLive, hostSeen, graceOver, snap, won, lots, uid, viewers, remoteStream, placeBid, sendChat, continueToNext]);
}
