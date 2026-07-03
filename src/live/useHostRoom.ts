import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Lot, Seller } from '../data/seed';
import { getUid } from '../lib/identity';
import { quickChips, type Bidder, type PaceName } from './engine';
import { boostSdp, RTC_CONFIG } from './socket';
import { liveChannel, persistBid } from './supabase';
import { useAuctionRoom, type AuctionRoom } from './useAuctionRoom';

export type HostPace = PaceName | 'Off';

export interface OrderAnnounce {
  orderNo: string;
  handle: string;
  title: string;
  price: number;
  ts: number;
}

export interface HostRoom {
  room: AuctionRoom;
  channelReady: boolean;
  viewers: number;
  live: boolean;
  bidding: boolean;
  /** true if another device/tab is already hosting this same room */
  hostConflict: boolean;
  ordersReceived: OrderAnnounce[];
  goLive: (stream: MediaStream) => void;
  endLive: () => void;
  startBidding: () => void;
  pauseBidding: () => void;
  nextLot: () => void;
}

/**
 * Serverless host (Vercel + Supabase mode): THIS device owns the auction.
 * The engine runs locally; state/chat fan out over a Supabase Realtime
 * channel; viewer bids come in as broadcasts and are validated here;
 * the camera goes out over WebRTC using the channel for signaling.
 */
export function useHostRoom(seller: Seller, lots: Lot[], pace: HostPace, enabled: boolean): HostRoom {
  const botsEnabled = pace !== 'Off';

  const [channelReady, setChannelReady] = useState(false);
  const [viewers, setViewers] = useState(0);
  const [live, setLive] = useState(false);
  const [bidding, setBidding] = useState(false);
  const [hostConflict, setHostConflict] = useState(false);
  const [ordersReceived, setOrdersReceived] = useState<OrderAnnounce[]>([]);

  // "Go live" only turns the camera on. The auction clock stays paused until the
  // seller taps "Start bidding" — viewers see an "awaiting bids" message until then.
  const room = useAuctionRoom(seller, lots, botsEnabled ? pace : 'Lively', enabled && bidding, botsEnabled);

  const uid = getUid();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const liveRef = useRef(false);
  liveRef.current = live;
  const biddingRef = useRef(false);
  biddingRef.current = bidding;
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const noncesRef = useRef<Set<string>>(new Set());
  const roomRef = useRef(room);
  roomRef.current = room;
  const viewersRef = useRef(0);

  // Send the current authoritative state to the room. Reads refs so it's safe
  // to call from intervals and event handlers without stale closures.
  const broadcast = useCallback(() => {
    const ch = channelRef.current;
    if (!ch) return;
    const s = roomRef.current.state;
    const nextBid = roomRef.current.nextBid;
    void ch.send({
      type: 'broadcast',
      event: 'auction.state',
      payload: {
        sellerId: seller.id,
        lotIndex: s.lotIndex,
        currentBid: s.currentBid,
        bidCount: s.bidCount,
        bidder: s.bidder ? { handle: s.bidder.handle, color: s.bidder.color, uid: s.bidder.uid ?? null } : null,
        timeLeft: s.timeLeft,
        status: s.status === 'open' ? 'open' : 'ended',
        soldPrice: s.soldPrice,
        nextBid,
        validAmounts: quickChips(nextBid),
        chat: s.chat.slice(-30),
        viewers: viewersRef.current,
        live: liveRef.current,
        bidding: biddingRef.current,
        hostAt: Date.now(),
      },
    });
  }, [seller.id]);

  /* ---- channel lifecycle ---- */

  useEffect(() => {
    if (!enabled) return;
    const channel = liveChannel(seller.id);
    channelRef.current = channel;

    channel.on('broadcast', { event: 'bid.request' }, ({ payload }) => {
      const { uid: from, handle, color, amount, nonce } = payload ?? {};
      if (!from || typeof amount !== 'number' || !nonce) return;
      if (noncesRef.current.has(nonce)) return;
      noncesRef.current.add(nonce);
      if (noncesRef.current.size > 300) noncesRef.current.clear();
      const by: Bidder = { handle: String(handle ?? 'guest').slice(0, 24), color: color ?? '#2a6fdb', uid: from };
      const accepted = roomRef.current.injectBid(by, amount);
      if (accepted) persistBid(seller.id, roomRef.current.lot.id, by.handle, amount);
    });

    channel.on('broadcast', { event: 'chat.send' }, ({ payload }) => {
      const { uid: from, handle, color, text } = payload ?? {};
      if (!from || !text) return;
      roomRef.current.sendChat(String(text), { handle: String(handle ?? 'guest').slice(0, 24), color: color ?? '#2a6fdb', uid: from });
    });

    channel.on('broadcast', { event: 'order.placed' }, ({ payload }) => {
      const { orderNo, handle, title, price } = payload ?? {};
      if (!orderNo) return;
      setOrdersReceived((prev) => [{ orderNo, handle, title, price, ts: Date.now() }, ...prev].slice(0, 20));
    });

    // WebRTC signaling: viewer asks to watch → we offer; answers/ICE come back addressed to us
    channel.on('broadcast', { event: 'rtc.watch' }, ({ payload }) => {
      const from = payload?.from;
      if (from && liveRef.current && streamRef.current) void offerTo(from);
    });
    channel.on('broadcast', { event: 'rtc.answer' }, ({ payload }) => {
      if (payload?.to !== uid) return;
      peersRef.current.get(payload.from)?.setRemoteDescription(payload.sdp).catch(() => {});
    });
    channel.on('broadcast', { event: 'rtc.ice' }, ({ payload }) => {
      if (payload?.to !== uid) return;
      peersRef.current.get(payload.from)?.addIceCandidate(payload.candidate).catch(() => {});
    });

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<{ uid: string; role: string }>();
      const entries = Object.values(state).flat();
      const count = entries.filter((e) => e.role === 'viewer').length;
      viewersRef.current = count;
      setViewers(count);
      // warn if a second device/tab is hosting the same room (causes chaos)
      setHostConflict(entries.some((e) => e.role === 'host' && e.uid !== uid));
      // a newly joined viewer needs the current state (incl. live status) right away
      broadcast();
      // close peer connections for viewers that left
      const present = new Set(entries.map((e) => e.uid));
      for (const [peerUid, pc] of peersRef.current) {
        if (!present.has(peerUid)) {
          pc.close();
          peersRef.current.delete(peerUid);
        }
      }
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setChannelReady(true);
        void channel.track({ uid, role: 'host' });
      }
    });

    const offerTo = async (viewerUid: string) => {
      peersRef.current.get(viewerUid)?.close();
      const pc = new RTCPeerConnection(RTC_CONFIG);
      peersRef.current.set(viewerUid, pc);
      const stream = streamRef.current!;
      for (const track of stream.getTracks()) {
        if (track.kind === 'video') track.contentHint = 'detail'; // favour sharpness for products
        const sender = pc.addTrack(track, stream);
        const params = sender.getParameters();
        if (!params.encodings || params.encodings.length === 0) params.encodings = [{}];
        if (track.kind === 'video') {
          // mesh sends one copy per viewer, so cap per-viewer bitrate and let it
          // adapt down (resolution + framerate) under congestion to stay smooth.
          params.degradationPreference = 'balanced';
          params.encodings[0].maxBitrate = 1_800_000; // ~1.8 Mbps 720p
          params.encodings[0].maxFramerate = 30;
        } else {
          params.encodings[0].maxBitrate = 128_000; // rich stereo Opus (cheap per viewer)
        }
        void sender.setParameters(params).catch(() => {});
      }
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          void channel.send({ type: 'broadcast', event: 'rtc.ice', payload: { to: viewerUid, from: uid, candidate: e.candidate } });
        }
      };
      const offer = await pc.createOffer();
      await pc.setLocalDescription({ type: offer.type, sdp: boostSdp(offer.sdp ?? '') });
      void channel.send({ type: 'broadcast', event: 'rtc.offer', payload: { to: viewerUid, from: uid, sdp: pc.localDescription } });
    };

    return () => {
      setChannelReady(false);
      for (const pc of peersRef.current.values()) pc.close();
      peersRef.current.clear();
      void channel.unsubscribe();
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, seller.id]);

  /* ---- fan out authoritative state on every engine change ---- */

  useEffect(() => {
    if (!enabled || !channelReady) return;
    broadcast();
  }, [enabled, channelReady, room.state, room.nextBid, live, bidding, broadcast]);

  // heartbeat: keep idle/late viewers converged on the current state + live flag
  useEffect(() => {
    if (!enabled || !channelReady) return;
    const t = setInterval(broadcast, 2500);
    return () => clearInterval(t);
  }, [enabled, channelReady, broadcast]);

  // auto-pause the moment a lot ends — the seller must tap Resume to run the next one
  const prevStatusRef = useRef(room.state.status);
  useEffect(() => {
    const prev = prevStatusRef.current;
    const cur = room.state.status;
    prevStatusRef.current = cur;
    if (bidding && prev === 'open' && cur !== 'open') setBidding(false);
  }, [room.state.status, bidding]);

  /* ---- controls ---- */

  const goLive = useCallback((stream: MediaStream) => {
    streamRef.current = stream;
    setLive(true);
  }, []);

  const endLive = useCallback(() => {
    setLive(false);
    setBidding(false); // ending the stream stops the auction too
    streamRef.current = null;
    for (const pc of peersRef.current.values()) pc.close();
    peersRef.current.clear();
  }, []);

  const startBidding = useCallback(() => {
    // if the current lot already sold, advance to the next one before resuming
    if (roomRef.current.state.status !== 'open') roomRef.current.continueToNext();
    setBidding(true);
  }, []);
  const pauseBidding = useCallback(() => setBidding(false), []);

  return {
    room,
    channelReady,
    viewers,
    live,
    bidding,
    hostConflict,
    ordersReceived,
    goLive,
    endLive,
    startBidding,
    pauseBidding,
    nextLot: room.continueToNext,
  };
}
