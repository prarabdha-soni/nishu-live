import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { money } from '../lib/format';
import { useAppStore } from '../store/store';

export function Confirm() {
  const order = useAppStore((s) => s.lastOrder);

  return (
    <div className="screen confirm">
      <div className="confirm-check">
        <Icon name="check_circle" filled size={72} className="success" />
      </div>
      <h1 className="screen-title centered">Order confirmed</h1>
      <p className="screen-sub centered">We'll keep you posted in Activity.</p>

      {order && (
        <div className="order-card">
          <div className="order-num">#{order.id}</div>
          <div className="order-item">
            <span>{order.item.title}</span>
            <span className="order-price">{money(order.item.price)}</span>
          </div>
          <div className="order-arriving">
            <Icon name="local_shipping" size={18} className="success" />
            Arriving {order.arriving} · free insured shipping
          </div>
          <div className="order-arriving">
            <Icon name="paid" size={18} className="success" />
            Dummy payment received — test mode, no real charge
          </div>
        </div>
      )}

      <div className="confirm-actions">
        <Link
          to={order ? `/live/${order.item.sellerId}` : '/live/jewel_daily'}
          className="btn-primary wide center-text"
        >
          Back to auction
        </Link>
        <Link to="/activity" className="btn-secondary wide center-text">
          View in Activity
        </Link>
      </div>
    </div>
  );
}
