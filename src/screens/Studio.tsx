import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { getSeller, type ChatMessage, type Lot } from '../data/seed';
import { clock as clockFmt, money } from '../lib/format';
import { getSocket, RTC_CONFIG } from '../live/socket';
import { supabaseEnabled } from '../live/supabase';
import { StudioServerless } from './StudioServerless';

const PACE_OPTIONS = ['Off', 'Calm', 'Lively', 'Frenzy'] as const;

interface StudioState {
  lots: Lot[];
  lotIndex: number;
  currentBid: number;
  bidCount: number;
  bidder: { userId: string; handle: string } | null;
  status: 'open' | 'ended';
  endsAt: number;
  viewers: number;
  pace: string;
  chat: ChatMessage[];
}

/**
 * Seller studio (host console): claim the room with the host key, preview your
 * camera, go live over WebRTC, and run the auction — skip lots, set bot pace.
 */
export function Studio() {
  // Vercel/serverless deployment: the studio tab itself hosts the auction over Supabase.
  if (supabaseEnabled) return <StudioServerless />;
  return <StudioSocket />;
}

function StudioSocket() {
  const roomId = 'nishusilver';
  const seller = getSeller(roomId);

  const [connected, setConnected] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [key, setKey] = useState('nishu-live');
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [camReady, setCamReady] = useState(false);
  const [state, setState] = useState<StudioState | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);

  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const offsetRef = useRef(0);
  const liveRef = useRef(false);
  liveRef.current = live;

  /* ---- socket + host claim ---- */

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => setConnected(true);
    const onDisconnect = () => {
      setConnected(false);
      setClaimed(false);
      setLive(false);
    };

    const onState = (s: StudioState & { roomId: string; serverNow: number }) => {
      if (s.roomId !== roomId) return;
      offsetRef.current = s.serverNow - Date.now();
      setState((prev) => ({ ...(prev ?? ({} as StudioState)), ...s, chat: prev?.chat ?? [] }));
    };

    const onChat = (msg: ChatMessage) => {
      setState((prev) => (prev ? { ...prev, chat: [...prev.chat.slice(-20), msg] } : prev));
    };

    const onViewers = ({ count }: { count: number }) => {
      setState((prev) => (prev ? { ...prev, viewers: count } : prev));
    };

    // a viewer wants the stream → open a peer connection and send an offer
    const onViewer = async ({ viewerId }: { viewerId: string }) => {
      if (!liveRef.current || !streamRef.current) return;
      peersRef.current.get(viewerId)?.close();
      const pc = new RTCPeerConnection(RTC_CONFIG);
      peersRef.current.set(viewerId, pc);
      for (const track of streamRef.current.getTracks()) pc.addTrack(track, streamRef.current);
      pc.onicecandidate = (e) => {
        if (e.candidate) socket.emit('rtc.ice', { to: viewerId, candidate: e.candidate });
      };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('rtc.offer', { to: viewerId, sdp: offer });
    };

    const onAnswer = ({ from, sdp }: { from: string; sdp: RTCSessionDescriptionInit }) => {
      peersRef.current.get(from)?.setRemoteDescription(sdp).catch(() => {});
    };

    const onIce = ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
      peersRef.current.get(from)?.addIceCandidate(candidate).catch(() => {});
    };

    const onViewerLeft = ({ viewerId }: { viewerId: string }) => {
      peersRef.current.get(viewerId)?.close();
      peersRef.current.delete(viewerId);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('auction.state', onState);
    socket.on('chat.msg', onChat);
    socket.on('viewers.count', onViewers);
    socket.on('rtc.viewer', onViewer);
    socket.on('rtc.answer', onAnswer);
    socket.on('rtc.ice', onIce);
    socket.on('rtc.viewer-left', onViewerLeft);
    if (socket.connected) setConnected(true);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('auction.state', onState);
      socket.off('chat.msg', onChat);
      socket.off('viewers.count', onViewers);
      socket.off('rtc.viewer', onViewer);
      socket.off('rtc.answer', onAnswer);
      socket.off('rtc.ice', onIce);
      socket.off('rtc.viewer-left', onViewerLeft);
      for (const pc of peersRef.current.values()) pc.close();
      peersRef.current.clear();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [roomId]);

  // host clock display
  useEffect(() => {
    const t = setInterval(() => {
      setState((prev) => {
        if (prev) setTimeLeft(Math.max(0, Math.ceil((prev.endsAt - (Date.now() + offsetRef.current)) / 1000)));
        return prev;
      });
    }, 250);
    return () => clearInterval(t);
  }, []);

  const claim = () => {
    setError(null);
    getSocket().emit(
      'host.claim',
      { roomId, key, handle: seller.handle },
      (res: { ok: boolean; reason?: string; snapshot?: StudioState & { serverNow: number } }) => {
        if (!res?.ok) {
          setError(res?.reason === 'bad-key' ? 'Wrong host key.' : 'Could not claim the room.');
          return;
        }
        if (res.snapshot) {
          offsetRef.current = res.snapshot.serverNow - Date.now();
          setState({ ...res.snapshot, chat: res.snapshot.chat ?? [] });
        }
        setClaimed(true);
      },
    );
  };

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 720 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setCamReady(true);
    } catch {
      setError('Camera blocked. Allow camera access (use localhost or https) and try again.');
    }
  }, []);

  const goLive = () => {
    if (!streamRef.current) return;
    getSocket().emit('host.golive', { roomId });
    setLive(true);
  };

  const endLive = () => {
    getSocket().emit('host.endlive', { roomId });
    setLive(false);
    for (const pc of peersRef.current.values()) pc.close();
    peersRef.current.clear();
  };

  const lot = state?.lots?.[state.lotIndex];

  return (
    <div className="screen studio">
      <h1 className="screen-title">Seller studio</h1>
      <p className="screen-sub">
        Test your own live sell — camera in, real bids from any device on your network.{' '}
        <span className={`conn-pill ${connected ? 'on' : ''}`}>
          {connected ? 'server connected' : 'server offline — run: npm run server'}
        </span>
      </p>

      {!claimed ? (
        <>
          <div className="studio-key">
            <input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Host key"
              aria-label="Host key"
            />
            <button className="btn-primary" onClick={claim} disabled={!connected}>
              Claim room
            </button>
          </div>
          {error && <p className="empty-note">{error}</p>}
          <p className="screen-sub" style={{ marginTop: 14 }}>
            Default key is <strong>nishu-live</strong> (set HOST_KEY on the server to change it). You'll host
            @{seller.handle}'s room.
          </p>
        </>
      ) : (
        <>
          <div className="studio-preview">
            <video ref={videoRef} autoPlay muted playsInline />
            {live && (
              <span className="live-badge">
                <span className="live-dot" /> LIVE
              </span>
            )}
            {!camReady && (
              <div className="studio-off">
                <Icon name="videocam_off" size={34} />
                Camera is off
              </div>
            )}
          </div>

          <div className="studio-controls">
            {!camReady ? (
              <button className="btn-primary" onClick={startCamera}>
                <Icon name="videocam" size={20} /> Start camera
              </button>
            ) : !live ? (
              <button className="btn-primary" onClick={goLive}>
                <Icon name="sensors" size={20} /> Go live
              </button>
            ) : (
              <button className="btn-danger" onClick={endLive}>
                <Icon name="stop_circle" size={20} /> End stream
              </button>
            )}
            <button className="btn-secondary" onClick={() => getSocket().emit('host.nextLot', { roomId })}>
              <Icon name="skip_next" size={20} /> Next lot
            </button>
          </div>
          {error && <p className="empty-note">{error}</p>}

          {state && lot && (
            <div className="studio-state">
              <div className="studio-state-row">
                <span>Current lot</span>
                <strong>
                  {lot.name} ({state.lotIndex + 1}/{state.lots.length})
                </strong>
              </div>
              <div className="studio-state-row">
                <span>{state.bidCount === 0 ? 'Opening bid' : 'Current bid'}</span>
                <strong>
                  {money(state.currentBid)}
                  {state.bidder ? ` · @${state.bidder.handle}` : ''}
                </strong>
              </div>
              <div className="studio-state-row">
                <span>Clock</span>
                <strong>{state.status === 'open' ? clockFmt(timeLeft) : 'ended'}</strong>
              </div>
              <div className="studio-state-row">
                <span>Watching</span>
                <strong>{state.viewers}</strong>
              </div>
            </div>
          )}

          <h3 className="sub-title">Rival bots</h3>
          <div className="chip-row">
            {PACE_OPTIONS.map((p) => (
              <button
                key={p}
                className={`select-chip ${state?.pace === p ? 'active' : ''}`}
                onClick={() => {
                  getSocket().emit('host.pace', { roomId, pace: p });
                  setState((prev) => (prev ? { ...prev, pace: p } : prev));
                }}
              >
                {p}
              </button>
            ))}
          </div>
          <p className="screen-sub" style={{ marginTop: 10 }}>
            Set to <strong>Off</strong> to test with only real bidders. Open the app on another device or tab
            and join your live room to bid.
          </p>
        </>
      )}
    </div>
  );
}
