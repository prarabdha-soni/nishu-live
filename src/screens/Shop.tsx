import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { SHOP_CATEGORIES } from '../data/seed';

export function Shop() {
  const [query, setQuery] = useState('');
  const cats = SHOP_CATEGORIES.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="screen shop">
      <h1 className="screen-title">Shop</h1>
      <div className="search-pill">
        <Icon name="search" size={20} />
        <input
          placeholder="Search collections"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search collections"
        />
      </div>

      <div className="cat-list">
        {cats.map((c) => (
          <Link key={c.id} to={c.to} className="cat-card" style={{ background: c.bg }}>
            <div className="cat-info">
              <div className="cat-name">{c.name}</div>
              <div className="cat-count">{c.count} items</div>
            </div>
            <div className="cat-img">
              <img src={c.imageUrl} alt={c.name} loading="lazy" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
