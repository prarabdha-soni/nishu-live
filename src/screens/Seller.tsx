import { Link, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { ProductImage } from '../components/ProductImage';
import { LISTINGS, getSeller } from '../data/seed';
import { compact, money } from '../lib/format';
import { useAppStore } from '../store/store';

export function Seller() {
  const { id = 'jewel_daily' } = useParams();
  const navigate = useNavigate();
  const seller = getSeller(id);
  const isFollowing = useAppStore((s) => s.follows.includes(seller.id));
  const toggleFollow = useAppStore((s) => s.toggleFollow);

  return (
    <div className="screen seller">
      <div className="seller-cover">
        <img src={seller.coverUrl} alt="" />
        <button className="glass-btn back" aria-label="Back" onClick={() => navigate(-1)}>
          <Icon name="arrow_back" />
        </button>
      </div>

      <div className="seller-head">
        <img src={seller.avatarUrl} alt={seller.name} className="seller-avatar" />
        <button
          className={`follow-btn ${isFollowing ? 'following' : ''}`}
          onClick={() => toggleFollow(seller.id)}
        >
          {isFollowing ? 'Following' : 'Follow'}
        </button>
      </div>

      <div className="seller-info">
        <h1 className="seller-name">
          {seller.name}
          {seller.verified && <Icon name="verified" filled size={18} className="verified store" />}
        </h1>
        <div className="seller-handle">@{seller.handle}</div>
        <div className="seller-stats">
          <span>
            <Icon name="star" filled size={14} className="star" /> {seller.rating}
          </span>
          <span className="dot">·</span>
          <span>
            <strong>{compact(seller.followers)}</strong> followers
          </span>
          <span className="dot">·</span>
          <span>
            <strong>{compact(seller.sales)}</strong> sales
          </span>
        </div>
        <p className="seller-bio">{seller.bio}</p>

        <Link to={`/live/${seller.id}`} className="live-banner">
          <span className="live-ring">
            <img src={seller.avatarUrl} alt="" />
          </span>
          <div className="live-banner-text">
            <div className="live-banner-title">{seller.showTitle} — live</div>
            <div className="live-banner-sub">{compact(seller.liveViewers ?? 0)} watching now</div>
          </div>
          <span className="watch-btn">Watch</span>
        </Link>

        <h3 className="sub-title">Listings</h3>
        <div className="listing-grid">
          {LISTINGS.map((l) => (
            <Link key={l.id} to={`/product/${l.id}`} className="listing-card">
              <ProductImage src={l.imageUrl} alt={l.name} material={l.material} className="listing-img" />
              <div className="listing-name">{l.name}</div>
              <div className="listing-price">{money(l.price)}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
