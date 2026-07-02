import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { SELLER_IDS, getSeller, type Seller } from '../data/seed';
import { compact, rupees } from '../lib/format';
import { useLiveSellers } from '../live/useLiveSellers';
import { useAppStore } from '../store/store';

export function Home() {
  const [pill, setPill] = useState<'foryou' | 'followed'>('foryou');
  const [query, setQuery] = useState('');
  const follows = useAppStore((s) => s.follows);
  const liveMap = useLiveSellers(SELLER_IDS);

  const liveSellers = SELLER_IDS.map(getSeller)
    .filter((s) => liveMap[s.id]?.live)
    .filter((s) => {
      if (pill === 'followed' && !follows.includes(s.id)) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return s.handle.includes(q) || s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q);
    });

  return (
    <div className="screen home">
      <header className="home-brand">
        <div className="brand-word">
          Nishu<span className="brand-dot">.</span>
        </div>
        <div className="home-brand-actions">
          <button className="icon-btn" aria-label="Messages">
            <Icon name="chat_bubble" size={20} />
          </button>
          <button className="icon-btn" aria-label="Notifications">
            <Icon name="notifications" size={20} />
          </button>
          <button className="icon-btn" aria-label="Rewards">
            <Icon name="redeem" size={20} />
          </button>
        </div>
      </header>

      <div className="home-search-row">
        <div className="search-pill">
          <Icon name="search" size={20} />
          <input
            placeholder="Search Nishu"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search Nishu"
          />
        </div>
      </div>

      <div className="home-pills">
        <button
          className={`pill pill-gold ${pill === 'foryou' ? 'active' : ''}`}
          onClick={() => setPill('foryou')}
        >
          For You
        </button>
        <button
          className={`pill pill-blush ${pill === 'followed' ? 'active' : ''}`}
          onClick={() => setPill('followed')}
        >
          <Icon name="favorite" filled size={16} />
          Followed Hosts
        </button>
      </div>

      <h2 className="section-title">Live now</h2>

      {liveSellers.length === 0 ? (
        <EmptyLive following={pill === 'followed'} />
      ) : (
        <div className="live-grid">
          {liveSellers.map((s) => (
            <LiveThumb key={s.id} seller={s} viewers={liveMap[s.id]?.viewers ?? 0} />
          ))}
        </div>
      )}
    </div>
  );
}

function LiveThumb({ seller, viewers }: { seller: Seller; viewers: number }) {
  return (
    <Link to={`/live/${seller.id}`} className="live-thumb">
      <div className="live-thumb-img">
        <img
          src={seller.thumbnailUrl}
          alt={`${seller.handle} live`}
          loading="lazy"
          onError={(e) => {
            const t = e.currentTarget;
            if (!t.dataset.fallback) {
              t.dataset.fallback = '1';
              t.src = seller.cardImageUrl;
            }
          }}
        />
      </div>
      <div className="live-thumb-cap">
        <span className="live-badge">
          <span className="live-dot" aria-hidden="true" />
          LIVE{viewers > 0 ? ` · ${compact(viewers)}` : ''}
        </span>
        <div className="live-thumb-handle">
          @{seller.handle}
          {seller.verified && <Icon name="verified" filled size={14} className="verified" />}
        </div>
        <div className="live-thumb-product">
          {seller.pinnedName} · <strong>{rupees(seller.pinnedPrice)}</strong>
        </div>
      </div>
    </Link>
  );
}

function EmptyLive({ following }: { following: boolean }) {
  return (
    <div className="live-empty">
      <span className="live-empty-icon">
        <Icon name="sensors_off" size={32} />
      </span>
      <div className="live-empty-title">No live auctions right now</div>
      <div className="live-empty-sub">
        {following
          ? 'None of your followed hosts are live yet.'
          : 'Nothing streaming at the moment — check back soon.'}
      </div>
      <Link to="/studio" className="btn-secondary live-empty-cta">
        <Icon name="videocam" size={18} /> Go live in the studio
      </Link>
    </div>
  );
}
