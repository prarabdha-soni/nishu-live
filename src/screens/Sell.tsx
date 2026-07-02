import { useState } from 'react';
import { Icon } from '../components/Icon';
import type { SellerApplication } from '../data/seed';
import { useAppStore } from '../store/store';

const CATEGORIES = ['Jewellery', 'Saree', 'Kurti', 'Lehenga', 'Accessories'];
const FREQUENCIES = ['Daily', 'Weekly', 'Monthly'] as const;

export function Sell() {
  const application = useAppStore((s) => s.application);
  const submitApplication = useAppStore((s) => s.submitApplication);

  const [shop, setShop] = useState('');
  const [category, setCategory] = useState('Jewellery');
  const [about, setAbout] = useState('');
  const [frequency, setFrequency] = useState<SellerApplication['frequency']>('Weekly');
  const [contact, setContact] = useState('');

  const canSubmit = shop.trim().length > 0 && contact.trim().length > 0;

  if (application) {
    return (
      <div className="screen sell">
        <div className="received">
          <div className="received-check">
            <Icon name="check_circle" filled size={56} className="success" />
          </div>
          <h1 className="screen-title centered">Application received</h1>
          <p className="received-copy">
            Thanks, <strong>{application.shop}</strong>! We review every seller and will reach you at{' '}
            <strong>{application.contact}</strong> within 24 hours.
          </p>
          <div className="received-card">
            <Row label="Category" value={application.category} />
            <Row label="Goes live" value={application.frequency} />
            {application.about && <Row label="About" value={application.about} />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen sell">
      <h1 className="screen-title">Become a seller</h1>
      <p className="screen-sub">Go live, auction your pieces, get paid. We review every seller.</p>

      <form
        className="sell-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!canSubmit) return;
          submitApplication({ shop: shop.trim(), category, about: about.trim(), frequency, contact: contact.trim() });
        }}
      >
        <label className="field">
          <span className="label">Shop or brand name *</span>
          <input value={shop} onChange={(e) => setShop(e.target.value)} placeholder="e.g. Nishu Silver Jewellery" />
        </label>

        <div className="field">
          <span className="label">What do you sell?</span>
          <div className="chip-row">
            {CATEGORIES.map((c) => (
              <button
                type="button"
                key={c}
                className={`select-chip ${category === c ? 'active' : ''}`}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <label className="field">
          <span className="label">About your shop</span>
          <textarea
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            placeholder="What makes your pieces special?"
            rows={3}
          />
        </label>

        <div className="field">
          <span className="label">How often will you go live?</span>
          <div className="chip-row">
            {FREQUENCIES.map((f) => (
              <button
                type="button"
                key={f}
                className={`select-chip ${frequency === f ? 'active' : ''}`}
                onClick={() => setFrequency(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <label className="field">
          <span className="label">Where should we notify you? *</span>
          <input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Email or phone"
            inputMode="email"
          />
        </label>

        <button type="submit" className="btn-primary wide" disabled={!canSubmit}>
          Submit application
        </button>
      </form>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="received-row">
      <span className="label">{label}</span>
      <span>{value}</span>
    </div>
  );
}
