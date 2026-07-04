import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';

// Category browse (replaces the old product shop). Content mirrors the Whatnot
// reference; styling uses the app's warm/pastel theme.

interface Trend {
  name: string;
  viewers: string;
  icon: string;
}

const TRENDING: Trend[] = [
  { name: 'Needoh', viewers: '985', icon: 'blur_on' },
  { name: 'Coach', viewers: '275', icon: 'shopping_bag' },
  { name: 'Pokémon', viewers: '1.2K', icon: 'auto_awesome' },
  { name: 'Jerseys', viewers: '356', icon: 'checkroom' },
  { name: 'Squishy Toys', viewers: '1.6K', icon: 'bubble_chart' },
  { name: 'PlayStation', viewers: '820', icon: 'sports_esports' },
];

interface Category {
  name: string;
  viewers: number;
  icon: string;
  bg: string;
  to?: string; // live room for categories we have a seller in
}

const BGS = [
  'var(--pastel-cream)',
  'var(--pastel-lavender)',
  'var(--pastel-peach)',
  'var(--pastel-mint)',
  'var(--pastel-rose)',
];

const CATEGORIES: Category[] = [
  { name: 'Jewelry & Watches', viewers: 5700, icon: 'diamond', bg: BGS[0], to: '/live/jewel_daily' },
  { name: 'Bags & Accessories', viewers: 4000, icon: 'shopping_bag', bg: BGS[1], to: '/live/bags_by_riya' },
  { name: 'Trading Card Games', viewers: 20600, icon: 'style', bg: BGS[2] },
  { name: 'Electronics', viewers: 7600, icon: 'headphones', bg: BGS[3] },
  { name: 'Wholesale & Deals', viewers: 3700, icon: 'local_shipping', bg: BGS[4] },
  { name: 'Books & Movies', viewers: 459, icon: 'menu_book', bg: BGS[0] },
  { name: 'Sports Cards', viewers: 12300, icon: 'sports_baseball', bg: BGS[1] },
  { name: 'Toys & Hobbies', viewers: 6800, icon: 'toys', bg: BGS[2] },
  { name: 'Coins & Money', viewers: 940, icon: 'paid', bg: BGS[3] },
];

const TABS = ['Recommended', 'Popular', 'A-Z'] as const;
type Tab = (typeof TABS)[number];

function views(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return (k >= 10 ? Math.round(k) : Math.round(k * 10) / 10) + 'K';
  }
  return String(n);
}

export function Shop() {
  const [tab, setTab] = useState<Tab>('Recommended');
  const [query, setQuery] = useState('');

  const categories = useMemo(() => {
    let list = CATEGORIES.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));
    if (tab === 'Popular') list = [...list].sort((a, b) => b.viewers - a.viewers);
    if (tab === 'A-Z') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [tab, query]);

  return (
    <div className="screen categories">
      <div className="search-pill">
        <Icon name="search" size={20} />
        <input
          placeholder="Search Nishu"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search categories"
        />
      </div>

      {!query && (
        <>
          <div className="cat-section-head">
            <h2 className="section-title">Trending Today</h2>
            <span className="show-all">
              Show All <Icon name="chevron_right" size={16} />
            </span>
          </div>
          <div className="trend-row">
            {TRENDING.map((t) => (
              <div key={t.name} className="trend-card">
                <span className="trend-icon">
                  <Icon name={t.icon} filled size={22} />
                </span>
                <div className="trend-text">
                  <div className="trend-name">{t.name}</div>
                  <div className="viewers-line">
                    <span className="live-dot-red" aria-hidden="true" />
                    {t.viewers} Viewers
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="section-title">Categories</h2>
      <div className="cat-tabs">
        {TABS.map((t) => (
          <button key={t} className={`cat-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      <div className="cat-grid">
        {categories.map((c) => {
          const inner = (
            <>
              <span className="cat-tile-icon">
                <Icon name={c.icon} filled size={30} />
              </span>
              <div className="cat-tile-name">{c.name}</div>
              <div className="viewers-line">
                <span className="live-dot-red" aria-hidden="true" />
                {views(c.viewers)} Viewers
              </div>
            </>
          );
          return c.to ? (
            <Link key={c.name} to={c.to} className="cat-tile" style={{ background: c.bg }}>
              {inner}
            </Link>
          ) : (
            <div key={c.name} className="cat-tile" style={{ background: c.bg }}>
              {inner}
            </div>
          );
        })}
        {categories.length === 0 && <p className="empty-note">No categories match that search.</p>}
      </div>
    </div>
  );
}
