import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { ProductImage } from '../components/ProductImage';
import { CURRENT_USER, type Material } from '../data/seed';
import { arrivingDate, money, orderNumber } from '../lib/format';
import { getHandle } from '../lib/identity';
import { announceOrder } from '../live/supabase';
import { useAppStore } from '../store/store';

export function Checkout() {
  const navigate = useNavigate();
  const item = useAppStore((s) => s.checkoutItem);
  const placeOrder = useAppStore((s) => s.placeOrder);

  if (!item) {
    return (
      <div className="screen checkout">
        <FlowHeader title="Checkout" onBack={() => navigate(-1)} />
        <p className="empty-note">Nothing to check out yet — win a lot or buy an item first.</p>
      </div>
    );
  }

  const submit = () => {
    const id = orderNumber();
    placeOrder({
      id,
      item,
      arriving: arrivingDate(),
      placedAt: Date.now(),
    });
    // dummy payment: tell the live host their sale went through
    if (item.won) {
      announceOrder(item.sellerId, { orderNo: id, handle: getHandle(), title: item.title, price: item.price });
    }
    navigate('/confirm');
  };

  return (
    <div className="screen checkout">
      <FlowHeader title="Checkout" onBack={() => navigate(-1)} />

      {item.won && (
        <div className="won-banner">
          <Icon name="emoji_events" filled size={20} />
          You won this lot at auction!
        </div>
      )}

      <div className="co-card item-card">
        <ProductImage
          src={item.imageUrl}
          alt={item.title}
          material={item.material as Material}
          className="co-thumb"
        />
        <div className="co-item-text">
          <div className="co-item-name">{item.title}</div>
          <div className="co-item-sub">@{item.sellerHandle}</div>
        </div>
        <div className="co-item-price">{money(item.price)}</div>
      </div>

      <h3 className="sub-title">Deliver to</h3>
      <div className="co-card">
        <Icon name="home_pin" size={22} className="muted" />
        <div className="co-item-text">
          <div className="co-item-name">{CURRENT_USER.name}</div>
          <div className="co-item-sub">
            {CURRENT_USER.address.line1}, {CURRENT_USER.address.city} {CURRENT_USER.address.state}{' '}
            {CURRENT_USER.address.zip}
          </div>
        </div>
        <button className="edit-link">Edit</button>
      </div>

      <h3 className="sub-title">Payment</h3>
      <div className="co-card">
        <Icon name="credit_card" size={22} className="muted" />
        <div className="co-item-text">
          <div className="co-item-name">{CURRENT_USER.card}</div>
          <div className="co-item-sub">Test mode — dummy payment, no real charge</div>
        </div>
        <button className="edit-link">Edit</button>
      </div>

      <h3 className="sub-title">Summary</h3>
      <div className="co-summary">
        <SummaryRow label={item.won ? 'Winning bid' : 'Item price'} value={money(item.price)} />
        <SummaryRow label="Shipping" value="Free — insured" success />
        <SummaryRow label="Buyer protection" value="Included" success />
        <div className="summary-total">
          <span>Total</span>
          <span>{money(item.price)}</span>
        </div>
      </div>

      <div className="sticky-bar">
        <button className="btn-primary wide" onClick={submit}>
          Place order · {money(item.price)}
        </button>
      </div>
    </div>
  );
}

function FlowHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className="flow-header">
      <button className="icon-btn" aria-label="Back" onClick={onBack}>
        <Icon name="arrow_back" />
      </button>
      <h1>{title}</h1>
    </header>
  );
}

function SummaryRow({ label, value, success }: { label: string; value: string; success?: boolean }) {
  return (
    <div className="summary-row">
      <span>{label}</span>
      <span className={success ? 'success-text' : ''}>{value}</span>
    </div>
  );
}
