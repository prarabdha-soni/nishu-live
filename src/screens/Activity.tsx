import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { SELLER_IDS, getSeller } from '../data/seed';
import { compact } from '../lib/format';
import { useLiveSellers } from '../live/useLiveSellers';
import { useNotifications } from '../api/hooks';
import { timeAgo } from '../api/supastore';

const ICON_FOR: Record<string, { icon: string; tint: string }> = {
  order: { icon: 'package_2', tint: 'var(--success)' },
  won: { icon: 'emoji_events', tint: 'var(--success)' },
  saved: { icon: 'favorite', tint: 'var(--accent)' },
  outbid: { icon: 'gavel', tint: 'var(--live)' },
  shipped: { icon: 'local_shipping', tint: 'var(--verified-store)' },
  live: { icon: 'sensors', tint: 'var(--rating)' },
};

export function Activity() {
  const { notifications, loading } = useNotifications();
  const liveMap = useLiveSellers(SELLER_IDS);
  const liveSellers = SELLER_IDS.map(getSeller).filter((s) => liveMap[s.id]?.live);

  return (
    <div className="screen activity">
      <h1 className="screen-title">Activity</h1>

      {liveSellers.length > 0 &&
        liveSellers.map((seller) => (
          <Link key={seller.id} to={`/live/${seller.id}`} className="live-banner">
            <span className="live-ring">
              <img src={seller.avatarUrl} alt="" />
            </span>
            <div className="live-banner-text">
              <div className="live-banner-title">@{seller.handle} is live now</div>
              <div className="live-banner-sub">
                {seller.showTitle} · {compact(liveMap[seller.id]?.viewers ?? 0)} watching
              </div>
            </div>
            <span className="watch-btn">Join</span>
          </Link>
        ))}

      {notifications.length === 0 ? (
        <p className="empty-note">
          {loading ? 'Loading…' : 'No activity yet — save an item or win a lot and it shows up here.'}
        </p>
      ) : (
        <div className="notif-list">
          {notifications.map((n) => {
            const meta = ICON_FOR[n.type] ?? ICON_FOR.order;
            return (
              <div key={n.id} className="notif-row">
                <span className="notif-icon" style={{ color: meta.tint }}>
                  <Icon name={meta.icon} filled size={22} />
                </span>
                <div className="notif-text">
                  <div className="notif-title">{n.title}</div>
                  {n.sub && <div className="notif-sub">{n.sub}</div>}
                </div>
                <span className="notif-time">{timeAgo(n.createdAt)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
