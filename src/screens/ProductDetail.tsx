import { Link, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { ProductImage } from '../components/ProductImage';
import { FLAGSHIP_SELLER_ID, LISTINGS, getSeller } from '../data/seed';
import { money } from '../lib/format';
import { addNotification } from '../api/supastore';
import { useSaved } from '../api/hooks';
import { useAppStore } from '../store/store';

export function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const listing = LISTINGS.find((l) => l.id === id) ?? LISTINGS[0];
  const seller = getSeller(FLAGSHIP_SELLER_ID);

  const { toggle, isSaved } = useSaved();
  const saved = isSaved(listing.id);
  const setCheckoutItem = useAppStore((s) => s.setCheckoutItem);

  const onToggleSave = () => {
    const willSave = !saved;
    toggle({ productId: listing.id, name: listing.name, price: listing.price, imageUrl: listing.imageUrl ?? null });
    if (willSave) void addNotification({ type: 'saved', title: 'Saved to your list', sub: listing.name });
  };

  const buyNow = () => {
    setCheckoutItem({
      title: listing.name,
      price: listing.price,
      imageUrl: listing.imageUrl,
      material: listing.material,
      won: false,
      sellerHandle: seller.handle,
      sellerId: seller.id,
    });
    navigate('/checkout');
  };

  return (
    <div className="screen detail">
      <div className="detail-hero">
        <ProductImage src={listing.imageUrl} alt={listing.name} material={listing.material} className="detail-img" />
        <button className="glass-btn on-light back" aria-label="Back" onClick={() => navigate(-1)}>
          <Icon name="arrow_back" />
        </button>
        <div className="detail-hero-actions">
          <button className="glass-btn on-light" aria-label="Share">
            <Icon name="ios_share" />
          </button>
          <button
            className={`glass-btn on-light ${saved ? 'saved' : ''}`}
            aria-label={saved ? 'Remove from saved' : 'Save'}
            onClick={onToggleSave}
          >
            <Icon name="favorite" filled={saved} />
          </button>
        </div>
      </div>

      <div className="detail-body">
        <Link to={`/seller/${seller.id}`} className="detail-seller-row">
          <img src={seller.avatarUrl} alt="" className="chip-avatar" />
          <div className="chip-text">
            <div className="chip-handle">
              {seller.name}
              {seller.verified && <Icon name="verified" filled size={14} className="verified store" />}
            </div>
            <div className="chip-meta">
              <Icon name="star" filled size={12} className="star" /> {seller.rating} · @{seller.handle}
            </div>
          </div>
          <Icon name="chevron_right" className="muted" />
        </Link>

        <h1 className="detail-title">{listing.name}</h1>

        <div className="detail-price-row">
          <div>
            <div className="label">Buy now</div>
            <div className="detail-price">{money(listing.price)}</div>
          </div>
          <Link to={`/live/${seller.id}`} className="bid-live-note">
            or bid live <strong>from ₹100</strong>
          </Link>
        </div>

        <div className="spec-grid">
          <Spec label="Metal" value={listing.metal} />
          <Spec label="Stone" value={listing.stone} />
          <Spec label="Size" value={listing.size} />
          <Spec label="Hallmark" value="925 stamped" />
        </div>

        <h3 className="sub-title">Details</h3>
        <p className="detail-copy">
          Handcrafted by {seller.name} in solid 925 sterling silver. Each piece is polished, hallmarked and
          quality-checked before it ships. Stones are natural and may vary slightly — that's the charm.
        </p>

        <div className="ship-card">
          <Icon name="local_shipping" filled size={22} className="success" />
          <div>
            <div className="ship-title">Free insured shipping</div>
            <div className="ship-sub">Ships in under a day · tracked · buyer protection included</div>
          </div>
        </div>
      </div>

      <div className="sticky-bar">
        <Link to={`/live/${seller.id}`} className="btn-secondary">
          Bid live
        </Link>
        <button className="btn-primary" onClick={buyNow}>
          Buy · {money(listing.price)}
        </button>
      </div>
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="spec-cell">
      <div className="label">{label}</div>
      <div className="spec-value">{value}</div>
    </div>
  );
}
