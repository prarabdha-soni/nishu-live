import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { ProductImage } from '../components/ProductImage';
import { getLotsForSeller, getSeller, type ChatMessage } from '../data/seed';
import { clock, compact, money } from '../lib/format';
import { useLiveRoom } from '../live/useLiveRoom';
import { useAppStore } from '../store/store';

export function Live() {
  const { sellerId = 'jewel_daily' } = useParams();
  const seller = getSeller(sellerId);
  const lots = getLotsForSeller(seller.id);
  const room = useLiveRoom(seller, lots);
  const navigate = useNavigate();

  const isFollowing = useAppStore((s) => s.follows.includes(seller.id));
  const toggleFollow = useAppStore((s) => s.toggleFollow);
  const setCheckoutItem = useAppStore((s) => s.setCheckoutItem);

  const [rulesOpen, setRulesOpen] = useState(false);
  const [chatText, setChatText] = useState('');

  const { state, lot, nextBid, chips } = room;
  const ended = state.status !== 'open';
  const waiting = room.waiting;
  const bidsLocked = ended || waiting;
  const statusLine =
    state.status === 'open' && state.timeLeft <= 3
      ? 'Going twice…'
      : state.status === 'open' && state.timeLeft <= 6
        ? 'Going once…'
        : null;

  const payNow = () => {
    setCheckoutItem({
      title: lot.name,
      price: state.soldPrice ?? state.currentBid,
      imageUrl: lot.imageUrl,
      material: lot.material,
      won: true,
      sellerHandle: seller.handle,
      sellerId: seller.id,
    });
    navigate('/checkout');
  };

  return (
    <div className="live-screen">
      <LiveVideo stream={room.remoteStream} poster={seller.posterUrl} />
      <div className="live-scrim" aria-hidden="true" />

      {waiting && (
        <div className="waiting-banner">
          <span className="waiting-pulse" aria-hidden="true" />
          <div className="waiting-text">
            <div className="waiting-title">Awaiting bids</div>
            <div className="waiting-sub">Waiting for @{seller.handle} to start the auction…</div>
          </div>
        </div>
      )}

      {/* top bar */}
      <div className="live-top">
        <div className="live-seller-chip">
          <img src={seller.avatarUrl} alt="" className="chip-avatar" />
          <div className="chip-text">
            <div className="chip-handle">
              @{seller.handle}
              {seller.verified && <Icon name="verified" filled size={14} className="verified" />}
            </div>
            <div className="chip-meta">
              <Icon name="star" filled size={12} className="star" /> {seller.rating} · ships &lt;1d
            </div>
          </div>
          <button
            className={`chip-follow ${isFollowing ? 'following' : ''}`}
            onClick={() => toggleFollow(seller.id)}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </button>
        </div>
        <div className="live-top-right">
          <button className="glass-btn" aria-label="Close live" onClick={() => navigate('/')}>
            <Icon name="keyboard_arrow_down" size={24} />
          </button>
        </div>
      </div>

      <div className="live-status-row">
        {room.broadcasting && (
          <span className="live-badge">
            <span className="live-dot" aria-hidden="true" /> Live
          </span>
        )}
        <span className="watchers-pill" aria-live="polite">
          <Icon name="visibility" filled size={15} />
          {compact(state.viewers)} watching
        </span>
      </div>

      <button className="rules-trigger" onClick={() => setRulesOpen((v) => !v)}>
        <Icon name="info" size={14} /> Auction rules
      </button>
      {!waiting && room.mode !== 'server' && (
        <span className="live-mode-pill">{room.mode === 'sim' ? 'demo · offline sim' : 'connecting…'}</span>
      )}
      {room.remoteStream && <span className="live-mode-pill">seller cam · live</span>}
      {rulesOpen && (
        <div className="rules-pop" role="dialog" aria-label="Auction rules">
          <h4>How bidding works</h4>
          <p>Every lot starts low and runs a 15-second clock. Tap a chip to bid the next amount.</p>
          <p>Any bid in the final 6 seconds resets the clock to 8 — no sniping.</p>
          <p>Top bidder when the clock hits zero wins and pays exactly that bid. Shipping is free and insured.</p>
          <button className="rules-close" onClick={() => setRulesOpen(false)}>
            Got it
          </button>
        </div>
      )}

      {/* right action rail */}
      <div className="live-rail">
        <button className="glass-btn" aria-label="More options">
          <Icon name="more_horiz" />
        </button>
        <button className="glass-btn" aria-label="Share">
          <Icon name="ios_share" />
        </button>
        <button className="glass-btn" aria-label="Report">
          <Icon name="flag" />
        </button>
        <button className="glass-btn" aria-label="Seller shop" onClick={() => navigate(`/seller/${seller.id}`)}>
          <Icon name="storefront" />
        </button>
      </div>

      <ChatStack chat={state.chat} />

      <form
        className="live-composer"
        onSubmit={(e) => {
          e.preventDefault();
          room.sendChat(chatText);
          setChatText('');
        }}
      >
        <input
          value={chatText}
          onChange={(e) => setChatText(e.target.value)}
          placeholder="Say something…"
          aria-label="Chat message"
          maxLength={200}
        />
        <button type="submit" className="composer-send" aria-label="Send message">
          <Icon name="send" filled size={18} />
        </button>
      </form>

      {/* auction panel */}
      <div className="auction-panel">
        <div className="panel-lot">
          <ProductImage src={lot.imageUrl} alt={lot.name} material={lot.material} className="panel-thumb" />
          <div className="panel-lot-text">
            <div className="panel-lot-name">{lot.name}</div>
            <div className="panel-lot-sub">
              Lot {state.lotIndex + 1} of {state.lots.length} · {lot.metal}
            </div>
          </div>
          {waiting ? (
            <div className="panel-timer soon">
              <Icon name="hourglass_empty" size={16} />
              Soon
            </div>
          ) : (
            <div className={`panel-timer ${state.timeLeft <= 3 ? 'red' : state.timeLeft <= 6 ? 'amber' : ''}`}>
              <Icon name="timer" size={16} />
              {clock(state.timeLeft)}
            </div>
          )}
        </div>

        <div className="panel-bid-row" aria-live="polite">
          <div>
            <div className="panel-bid-label">{state.bidCount === 0 ? 'Opening bid' : 'Current bid'}</div>
            <div className="panel-bid" key={state.bidKey}>
              {money(state.currentBid)}
            </div>
          </div>
          <div className="panel-bidder">
            {waiting ? (
              <span>waiting to start</span>
            ) : statusLine ? (
              <span className={`going ${state.timeLeft <= 3 ? 'red' : 'amber'}`}>{statusLine}</span>
            ) : state.bidder ? (
              <span>
                {state.youWin ? 'you are winning' : `@${state.bidder.handle}`}
              </span>
            ) : (
              <span>no bids yet</span>
            )}
          </div>
        </div>

        <div className="quick-chips">
          {chips.map((amt, i) => (
            <button
              key={`${i}-${amt}`}
              className={`chip-bid ${i === 0 ? 'primary' : ''}`}
              disabled={bidsLocked}
              onClick={() => room.placeBid(amt)}
            >
              {money(amt)}
            </button>
          ))}
        </div>

        <button
          className={`bid-main ${state.youWin ? 'winning' : ''}`}
          disabled={bidsLocked}
          onClick={() => room.placeBid()}
        >
          {waiting
            ? 'Awaiting bids…'
            : state.youWin
              ? `You're winning · re-bid ${money(nextBid)}`
              : `Place bid · ${money(nextBid)}`}
        </button>
      </div>

      {/* SOLD / WON overlay */}
      {ended && (
        <div className={`sold-overlay ${state.status}`}>
          <div className="sold-card">
            <div className={`sold-badge ${state.status}`}>
              {state.status === 'won' ? (
                <>
                  <Icon name="check_circle" filled size={44} />
                  YOU WON!
                </>
              ) : (
                'SOLD'
              )}
            </div>
            <div className="sold-lot">{lot.name}</div>
            {state.soldPrice != null && (
              <div className="sold-price">
                {money(state.soldPrice)}
                {state.status === 'sold' && state.bidder && ` · @${state.bidder.handle}`}
              </div>
            )}
            {state.status === 'won' ? (
              <>
                <button className="bid-main pay-now" onClick={payNow}>
                  Pay now · {money(state.soldPrice ?? state.currentBid)}
                </button>
                <button className="keep-watching" onClick={room.continueToNext}>
                  Keep watching
                </button>
              </>
            ) : (
              <div className="sold-next">Next lot coming up…</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Real seller camera + audio over WebRTC. Before the stream arrives, shows a
 * still poster (or dark canvas) — no fake/looping video. */
function LiveVideo({ stream, poster }: { stream: MediaStream | null; poster: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  // A real seller stream carries audio, but browsers only autoplay muted —
  // so we start muted and offer a tap-to-unmute.
  const [showUnmute, setShowUnmute] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (stream) {
      el.srcObject = stream;
      el.muted = true; // guarantee autoplay
      el.play().catch(() => {});
      setShowUnmute(stream.getAudioTracks().length > 0);
    } else {
      el.srcObject = null;
      setShowUnmute(false);
    }
  }, [stream]);

  const enableSound = () => {
    const el = ref.current;
    if (!el) return;
    el.muted = false;
    el.volume = 1;
    setShowUnmute(false);
    el.play().catch(() => {});
  };

  if (!stream) {
    // no live camera yet → static poster over the dark canvas
    return poster ? (
      <img className="live-video" src={poster} alt="" />
    ) : (
      <div className="live-video live-video-blank" />
    );
  }

  // NOTE: no `muted` attribute in JSX on purpose — React would reset the muted
  // property on every re-render and silently re-mute after "Tap for sound".
  // Muting is controlled imperatively via the ref (muted for autoplay, then off).
  return (
    <>
      <video ref={ref} className="live-video" autoPlay playsInline />
      {showUnmute && (
        <button className="unmute-chip" onClick={enableSound}>
          <Icon name="volume_up" filled size={16} /> Tap for sound
        </button>
      )}
    </>
  );
}

function ChatStack({ chat }: { chat: ChatMessage[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.length]);

  return (
    <div className="chat-stack" ref={ref}>
      {chat.map((m) => (
        <div key={m.id} className={`chat-line ${m.type}`}>
          <span className="chat-handle" style={{ color: m.type === 'bid' ? undefined : m.color }}>
            {m.handle}
            {m.isHost && <span className="host-badge">HOST</span>}
          </span>{' '}
          <span className="chat-text">{m.text}</span>
        </div>
      ))}
    </div>
  );
}
