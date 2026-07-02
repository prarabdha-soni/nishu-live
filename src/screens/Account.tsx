import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { CURRENT_USER } from '../data/seed';
import { useAppStore } from '../store/store';

const ROWS = [
  { icon: 'emoji_events', label: 'Won lots' },
  { icon: 'package_2', label: 'Orders' },
  { icon: 'favorite', label: 'Saved' },
  { icon: 'credit_card', label: 'Payment methods' },
  { icon: 'home_pin', label: 'Addresses' },
  { icon: 'settings', label: 'Settings' },
  { icon: 'help', label: 'Help & support' },
];

export function Account() {
  const savedCount = useAppStore((s) => s.saved.length);

  return (
    <div className="screen account">
      <div className="account-head">
        <img src={CURRENT_USER.avatarUrl} alt="" className="account-avatar" />
        <div>
          <h1 className="account-name">{CURRENT_USER.name}</h1>
          <div className="account-handle">@{CURRENT_USER.handle}</div>
        </div>
      </div>

      <div className="stat-tiles">
        <StatTile value={CURRENT_USER.wonLots} label="Won lots" />
        <StatTile value={CURRENT_USER.orders} label="Orders" />
        <StatTile value={CURRENT_USER.saved + savedCount} label="Saved" />
      </div>

      <div className="settings-list">
        <Link to="/studio" className="settings-row">
          <span className="settings-icon">
            <Icon name="videocam" size={20} />
          </span>
          <span className="settings-label">Seller studio</span>
          <Icon name="chevron_right" size={20} className="muted" />
        </Link>
        {ROWS.map((r) => (
          <button key={r.label} className="settings-row">
            <span className="settings-icon">
              <Icon name={r.icon} size={20} />
            </span>
            <span className="settings-label">{r.label}</span>
            <Icon name="chevron_right" size={20} className="muted" />
          </button>
        ))}
      </div>

      <Link to="/sell" className="btn-primary wide center-text">
        Become a seller
      </Link>
    </div>
  );
}

function StatTile({ value, label }: { value: number; label: string }) {
  return (
    <div className="stat-tile">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
