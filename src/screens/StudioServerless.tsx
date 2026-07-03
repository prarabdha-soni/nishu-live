import { useEffect, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { SELLERS, getLotsForSeller, getSeller } from '../data/seed';
import { clock as clockFmt, money, rupees } from '../lib/format';
import { useHostRoom, type HostPace } from '../live/useHostRoom';

const PACE_OPTIONS: HostPace[] = ['Off', 'Calm', 'Lively', 'Frenzy'];

/**
 * Serverless seller studio (Vercel + Supabase mode): this tab IS the auction
 * server. Pick a section, go live, and bids from every watcher are validated
 * here; dummy orders land in the list below. Whichever section you go live in
 * is the one that appears on Home.
 */
export function StudioServerless() {
  const [sellerId, setSellerId] = useState(SELLERS[0].id);
  const seller = getSeller(sellerId);
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
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: { echoCancellation: true, noiseSuppression: true },
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

      {host.hostConflict && (
        <div className="host-conflict">
          <Icon name="warning" filled size={18} />
          Another device or tab is already hosting this room. Close it — running two studios for the same
          seller makes the auction jump around.
        </div>
      )}

      <h3 className="sub-title" style={{ marginTop: 4 }}>
        Go live as
      </h3>
      <div className="chip-row studio-sections">
        {SELLERS.map((s) => (
          <button
            key={s.id}
            className={`select-chip ${sellerId === s.id ? 'active' : ''}`}
            disabled={host.live || host.bidding}
            onClick={() => setSellerId(s.id)}
          >
            {s.category}
          </button>
        ))}
      </div>
      <p className="screen-sub" style={{ margin: '8px 0 14px' }}>
        @{seller.handle} · pinned: <strong>{seller.pinnedName}</strong> · {rupees(seller.pinnedPrice)}
        {host.live && ' · switch sections after ending the stream'}
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

      {/* Bidding is a separate step from going live — viewers see "awaiting bids"
          until this is pressed. */}
      {!host.bidding ? (
        <button className="btn-primary wide start-bid-btn" onClick={host.startBidding}>
          <Icon name={state.status !== 'open' ? 'play_circle' : 'gavel'} size={20} />
          {state.status !== 'open' ? ' Resume bidding' : ' Start bidding'}
        </button>
      ) : (
        <button className="btn-secondary wide start-bid-btn" onClick={host.pauseBidding}>
          <Icon name="pause_circle" size={20} /> Pause bidding
        </button>
      )}
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
            {host.bidding
              ? state.status === 'open'
                ? clockFmt(state.timeLeft)
                : 'ended'
              : state.status !== 'open'
                ? 'sold'
                : 'paused'}
          </strong>
        </div>
        <div className="studio-state-row">
          <span>Watching</span>
          <strong>{host.viewers}</strong>
        </div>
      </div>
      {!host.bidding &&
        (state.status !== 'open' ? (
          <p className="screen-sub" style={{ marginTop: 10 }}>
            <strong>{lot.name}</strong> sold. Tap <strong>Resume bidding</strong> to run the next lot.
          </p>
        ) : (
          <p className="screen-sub" style={{ marginTop: 10 }}>
            Bidding is paused — viewers see “awaiting bids”. Tap <strong>Start bidding</strong> to open the
            auction{host.live ? '.' : ' (you can go live first).'}
          </p>
        ))}

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
