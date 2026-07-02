import { useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { ProductImage } from '../components/ProductImage';
import { SHOP_PRODUCTS, type ShopProduct } from '../data/seed';
import { rupees } from '../lib/format';

const FILTERS = ['All', 'Jewellery', 'Saree', 'Kurti', 'Watch', 'Bags'] as const;
type Filter = (typeof FILTERS)[number];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function Shop() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('All');

  // shuffle once per mount for a fresh "picked for you" feel
  const shuffled = useMemo(() => shuffle(SHOP_PRODUCTS), []);

  const products = shuffled.filter((p) => {
    if (filter !== 'All' && p.category !== filter) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
  });

  return (
    <div className="screen shop">
      <h1 className="screen-title">Shop</h1>
      <div className="search-pill">
        <Icon name="search" size={20} />
        <input
          placeholder="Search products"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search products"
        />
      </div>

      <div className="chip-row shop-filters">
        {FILTERS.map((f) => (
          <button
            key={f}
            className={`select-chip ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="product-grid">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
        {products.length === 0 && <p className="empty-note">No products match that search.</p>}
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: ShopProduct }) {
  return (
    <div className="product-card">
      <ProductImage src={product.imageUrl} alt={product.name} material={product.material} className="product-img" />
      <div className="product-body">
        <div className="product-cat">{product.category}</div>
        <div className="product-name">{product.name}</div>
        <div className="product-price-row">
          <span className="product-price">{rupees(product.price)}</span>
          <button className="add-btn" aria-label={`Add ${product.name}`}>
            <Icon name="add" size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
