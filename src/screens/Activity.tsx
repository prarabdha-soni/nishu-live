import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { FLAGSHIP_SELLER_ID, NOTIFICATIONS, getSeller } from '../data/seed';

const ICON_TINT: Record<string, string> = {
  outbid: 'var(--live)',
  won: 'var(--success)',
  shipped: 'var(--verified-store)',
  pricedrop: 'var(--accent)',
  newlots: 'var(--rating)',
};

export function Activity() {
  const seller = getSeller(FLAGSHIP_SELLER_ID);

  return (
    <div className="screen activity">
      <h1 className="screen-title">Activity</h1>

      <Link to={`/live/${seller.id}`} className="live-banner">
        <span className="live-ring">
          <img src={seller.avatarUrl} alt="" />
        </span>
        <div className="live-banner-text">
          <div className="live-banner-title">@{seller.handle} is live now</div>
          <div className="live-banner-sub">{seller.showTitle} · every lot starts low</div>
        </div>
        <span className="watch-btn">Join</span>
      </Link>

      <div className="notif-list">
        {NOTIFICATIONS.map((n) => (
          <div key={n.id} className="notif-row">
            <span className="notif-icon" style={{ color: ICON_TINT[n.type] }}>
              <Icon name={n.icon} filled size={22} />
            </span>
            <div className="notif-text">
              <div className="notif-title">{n.title}</div>
              <div className="notif-sub">{n.sub}</div>
            </div>
            <span className="notif-time">{n.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
