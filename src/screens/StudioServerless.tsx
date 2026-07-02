import { useEffect, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { FLAGSHIP_SELLER_ID, getLotsForSeller, getSeller } from '../data/seed';
import { clock as clockFmt, money } from '../lib/format';
import { useHostRoom, type HostPace } from '../live/useHostRoom';

const PACE_OPTIONS: HostPace[] = ['Off', 'Calm', 'Lively', 'Frenzy'];

/**
 * Serverless seller studio (Vercel + Supabase mode): this tab IS the auction
 * server. Keep it open while you stream — bids from every watcher are
 * validated here and dummy orders land in the list below.
 */
export function StudioServerless() {
  const seller = getSeller(FLAGSHIP_SELLER_ID);
  const lots = getLotsForSeller(seller.id);
  const [pace, setPace] = useState<HostPace>('Off');
  const host = useHostRoom(seller, lots, pace, true);

  const [camReady, setCamReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  const startCamera = async () => {
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
      setError('Camera blocked. Allow camera access (needs localhost or https) and try again.');
    }
  };

  const { state } = host.room;
  const lot = host.room.lot;

  return (
    <div className="screen studio">
      <h1 className="screen-title">Seller studio</h1>
      <p className="screen-sub">
        This tab runs the auction — keep it open while live.{' '}
        <span className={`conn-pill ${host.channelReady ? 'on' : ''}`}>
          {host.channelReady ? 'supabase channel connected' : 'connecting to supabase…'}
        </span>
      </p>

      <div className="studio-preview">
        <video ref={videoRef} autoPlay muted playsInline />
        {host.live && (
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
        ) : !host.live ? (
          <button className="btn-primary" onClick={() => streamRef.current && host.goLive(streamRef.current)}>
            <Icon name="sensors" size={20} /> Go live
          </button>
        ) : (
          <button className="btn-danger" onClick={host.endLive}>
            <Icon name="stop_circle" size={20} /> End stream
          </button>
        )}
        <button className="btn-secondary" onClick={host.nextLot}>
          <Icon name="skip_next" size={20} /> Next lot
        </button>
      </div>
      {error && <p className="empty-note">{error}</p>}

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
          <strong>
            {!host.live ? 'not started' : state.status === 'open' ? clockFmt(state.timeLeft) : 'ended'}
          </strong>
        </div>
        <div className="studio-state-row">
          <span>Watching</span>
          <strong>{host.viewers}</strong>
        </div>
      </div>
      {!host.live && (
        <p className="screen-sub" style={{ marginTop: 10 }}>
          The auction is paused. Bidding starts for everyone the moment you tap <strong>Go live</strong>.
        </p>
      )}

      <h3 className="sub-title">Rival bots</h3>
      <div className="chip-row">
        {PACE_OPTIONS.map((p) => (
          <button key={p} className={`select-chip ${pace === p ? 'active' : ''}`} onClick={() => setPace(p)}>
            {p}
          </button>
        ))}
      </div>
      <p className="screen-sub" style={{ marginTop: 10 }}>
        <strong>Off</strong> = only real bidders. Open the deployed app on your phone, join your live room and
        bid — the winner's dummy order appears below.
      </p>

      <h3 className="sub-title">Orders received (test payments)</h3>
      {host.ordersReceived.length === 0 ? (
        <p className="empty-note">No orders yet — win a lot from another device to see one here.</p>
      ) : (
        <div className="settings-list">
          {host.ordersReceived.map((o) => (
            <div key={o.orderNo} className="settings-row">
              <span className="settings-icon">
                <Icon name="paid" filled size={20} />
              </span>
              <span className="settings-label">
                #{o.orderNo} · {o.title} — @{o.handle}
              </span>
              <span className="success-text">{money(o.price)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
