import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { ProductImage } from '../components/ProductImage';
import { CURRENT_USER } from '../data/seed';
import { rupees } from '../lib/format';
import { useOrders, useProfile, useSaved } from '../api/hooks';
import { timeAgo } from '../api/supastore';

type Tab = 'orders' | 'saved';

export function Account() {
  const { profile, save } = useProfile({ name: CURRENT_USER.name, handle: CURRENT_USER.handle });
  const { orders } = useOrders();
  const { saved, toggle } = useSaved();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [tab, setTab] = useState<Tab>('orders');

  const wonCount = orders.filter((o) => o.kind === 'won').length;

  const startEdit = () => {
    setName(profile.name);
    setEditing(true);
  };
  const commit = () => {
    const trimmed = name.trim();
    if (trimmed) void save({ ...profile, name: trimmed });
    setEditing(false);
  };

  return (
    <div className="screen account">
      <div className="account-head">
        <img src={CURRENT_USER.avatarUrl} alt="" className="account-avatar" />
        <div className="account-head-text">
          {editing ? (
            <input
              className="account-name-input"
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => e.key === 'Enter' && commit()}
              aria-label="Your name"
            />
          ) : (
            <h1 className="account-name">{profile.name}</h1>
          )}
          <div className="account-handle">@{profile.handle}</div>
        </div>
        <button className="edit-link" onClick={editing ? commit : startEdit}>
          {editing ? 'Save' : 'Edit'}
        </button>
      </div>

      <div className="stat-tiles">
        <StatTile value={wonCount} label="Won lots" />
        <StatTile value={orders.length} label="Orders" />
        <StatTile value={saved.length} label="Saved" />
      </div>

      <div className="acct-tabs">
        <button className={`acct-tab ${tab === 'orders' ? 'active' : ''}`} onClick={() => setTab('orders')}>
          Orders
        </button>
        <button className={`acct-tab ${tab === 'saved' ? 'active' : ''}`} onClick={() => setTab('saved')}>
          Saved
        </button>
      </div>

      {tab === 'orders' ? (
        orders.length === 0 ? (
          <p className="empty-note">No orders yet — win a lot or buy something to see it here.</p>
        ) : (
          <div className="acct-list">
            {orders.map((o) => (
              <div key={o.id} className="acct-row">
                <ProductImage src={o.imageUrl ?? undefined} alt={o.title} material="gold" className="acct-thumb" />
                <div className="acct-row-text">
                  <div className="acct-row-title">{o.title}</div>
                  <div className="acct-row-sub">
                    {o.kind === 'won' ? 'Won at auction' : 'Bought'} · {timeAgo(o.createdAt)} ago
                  </div>
                </div>
                <div className="acct-row-price">{rupees(o.amount)}</div>
              </div>
            ))}
          </div>
        )
      ) : saved.length === 0 ? (
        <p className="empty-note">Nothing saved yet — tap the heart on a product to save it.</p>
      ) : (
        <div className="acct-list">
          {saved.map((s) => (
            <div key={s.productId} className="acct-row">
              <ProductImage src={s.imageUrl ?? undefined} alt={s.name} material="amethyst" className="acct-thumb" />
              <div className="acct-row-text">
                <div className="acct-row-title">{s.name}</div>
                <div className="acct-row-sub">{rupees(s.price)}</div>
              </div>
              <button
                className="glass-btn on-light saved acct-unsave"
                aria-label="Remove from saved"
                onClick={() => toggle(s)}
              >
                <Icon name="favorite" filled size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="settings-list">
        <Link to="/studio" className="settings-row">
          <span className="settings-icon">
            <Icon name="videocam" size={20} />
          </span>
          <span className="settings-label">Seller studio</span>
          <Icon name="chevron_right" size={20} className="muted" />
        </Link>
        <button className="settings-row">
          <span className="settings-icon">
            <Icon name="credit_card" size={20} />
          </span>
          <span className="settings-label">Payment methods</span>
          <Icon name="chevron_right" size={20} className="muted" />
        </button>
        <button className="settings-row">
          <span className="settings-icon">
            <Icon name="help" size={20} />
          </span>
          <span className="settings-label">Help &amp; support</span>
          <Icon name="chevron_right" size={20} className="muted" />
        </button>
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
