import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { FLAGSHIP_SELLER_ID, HOME_SELLER_IDS, getSeller, type Seller } from '../data/seed';
import { compact } from '../lib/format';
import { useLiveStatus } from '../live/useLiveStatus';
import { useAppStore } from '../store/store';

export function Home() {
  const [pill, setPill] = useState<'foryou' | 'followed'>('foryou');
  const [query, setQuery] = useState('');
  const follows = useAppStore((s) => s.follows);

  const sellers = HOME_SELLER_IDS.map(getSeller).filter((s) => {
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

      <MyShopCard />

      <h2 className="section-title">Top Sellers</h2>

      <div className="seller-list">
        {sellers.map((s) => (
          <SellerCard key={s.id} seller={s} />
        ))}
        {sellers.length === 0 && (
          <p className="empty-note">
            {pill === 'followed'
              ? 'No followed hosts here yet — follow a seller from their live room.'
              : 'No sellers match that search.'}
          </p>
        )}
      </div>
    </div>
  );
}

/** The admin/owner card: shows your own shop, flips LIVE when you go live from /studio. */
function MyShopCard() {
  const seller = getSeller(FLAGSHIP_SELLER_ID);
  const { status, viewers } = useLiveStatus(seller.id);

  if (status === 'offline') {
    return (
      <div className="myshop-card offline">
        <img src={seller.avatarUrl} alt="" className="myshop-avatar" />
        <div className="myshop-info">
          <div className="myshop-name">
            {seller.name}
            <span className="you-chip">Your shop</span>
          </div>
          <div className="myshop-sub">Offline — start streaming from the studio</div>
        </div>
        <Link to="/studio" className="golive-btn">
          <Icon name="videocam" filled size={16} />
          Go live
        </Link>
      </div>
    );
  }

  const isLive = status === 'live';
  return (
    <Link to={`/live/${seller.id}`} className={`myshop-card ${isLive ? 'live' : 'ready'}`}>
      <span className={isLive ? 'live-ring' : 'ready-ring'}>
        <img src={seller.avatarUrl} alt="" />
      </span>
      <div className="myshop-info">
        <div className="myshop-name">
          {seller.name}
          <span className="you-chip">Your shop</span>
        </div>
        <div className="myshop-sub">
          {isLive ? `${seller.showTitle} · streaming now` : 'Studio connected · starting soon…'}
        </div>
      </div>
      {isLive ? (
        <span className="live-badge">
          <span className="live-dot" aria-hidden="true" />
          LIVE{viewers > 0 ? ` · ${compact(viewers)}` : ''}
        </span>
      ) : (
        <span className="soon-badge">Soon</span>
      )}
    </Link>
  );
}

function SellerCard({ seller }: { seller: Seller }) {
  return (
    <Link to={`/live/${seller.id}`} className="seller-card" style={{ background: seller.cardBg }}>
      <div className="seller-card-info">
        <div className="seller-card-handle">
          @{seller.handle}
          {seller.verified && <Icon name="verified" filled size={16} className="verified" />}
        </div>
        <div className="seller-card-cat">
          {seller.category}
          <span className="seller-card-rating">
            <Icon name="star" filled size={12} className="star" />
            {seller.rating}
          </span>
        </div>
        <span className="live-badge">
          <span className="live-dot" aria-hidden="true" />
          Live · {compact(seller.liveViewers ?? 0)}
        </span>
      </div>
      <div className="seller-card-img">
        <img src={seller.cardImageUrl} alt={seller.name} loading="lazy" />
      </div>
    </Link>
  );
}
