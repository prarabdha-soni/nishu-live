export type Material =
  | 'silver'
  | 'darksilver'
  | 'pearl'
  | 'amethyst'
  | 'sapphire'
  | 'emerald'
  | 'ruby'
  | 'gold';

export interface Lot {
  id: string;
  name: string;
  material: Material;
  start: number; // opening bid
  value: number; // ~market settle price (rival bots stop here)
  metal: string;
  stone: string;
  size: string;
  imageUrl?: string;
}

export interface Listing {
  id: string;
  name: string;
  material: Material;
  metal: string;
  stone: string;
  size: string;
  price: number;
  imageUrl?: string;
}

export type ProductType = 'jewellery' | 'saree' | 'kurti' | 'watch' | 'bags';

export interface Seller {
  id: string;
  handle: string;
  name: string;
  verified: boolean;
  rating: number;
  followers: number;
  sales: number;
  bio: string;
  category: string;
  productType: ProductType;
  liveViewers?: number;
  avatarUrl: string;
  coverUrl: string;
  cardImageUrl: string;
  cardBg: string;
  showTitle: string;
  /** Home live-thumbnail shown while this seller is broadcasting. */
  thumbnailUrl: string;
  /** The pinned/featured product on the live screen. */
  pinnedName: string;
  pinnedPrice: number; // ₹
}

export interface ChatMessage {
  id: string;
  userId: string;
  handle: string;
  color: string;
  text: string;
  type: 'msg' | 'joined' | 'bid';
  isHost?: boolean;
  ts: number;
}

export interface SellerApplication {
  shop: string;
  category: string;
  about: string;
  frequency: 'Daily' | 'Weekly' | 'Monthly';
  contact: string;
}

export interface Notification {
  id: string;
  type: 'outbid' | 'won' | 'shipped' | 'pricedrop' | 'newlots';
  icon: string;
  title: string;
  sub: string;
  time: string;
}

/* ---------------- lots ---------------- */

export const JEWELLERY_LOTS: Lot[] = [
  {
    id: 'lot-signet',
    name: 'Sterling Silver Signet Ring',
    material: 'darksilver',
    start: 100,
    value: 960,
    metal: '925 Sterling',
    stone: 'Black Onyx',
    size: 'US 9',
    imageUrl: '/assets/products/ring.jpg',
  },
  {
    id: 'lot-moonstone',
    name: 'Moonstone Halo Pendant',
    material: 'pearl',
    start: 100,
    value: 1480,
    metal: '925 Sterling',
    stone: 'Moonstone',
    size: '18" chain',
    imageUrl: '/assets/products/pendant.jpg',
  },
  {
    id: 'lot-amethyst',
    name: 'Amethyst Drop Earrings',
    material: 'amethyst',
    start: 100,
    value: 760,
    metal: '925 Sterling',
    stone: 'Amethyst',
    size: '1.4"',
    imageUrl: '/assets/products/earrings.jpg',
  },
  {
    id: 'lot-cuff',
    name: 'Oxidised Silver Cuff',
    material: 'silver',
    start: 100,
    value: 1280,
    metal: '925 Sterling',
    stone: 'None',
    size: 'Adjustable',
    imageUrl: '/assets/products/cuff.jpg',
  },
  {
    id: 'lot-topaz',
    name: 'Blue Topaz Cocktail Ring',
    material: 'sapphire',
    start: 100,
    value: 1680,
    metal: '925 Sterling',
    stone: 'Blue Topaz',
    size: 'US 7',
    imageUrl: '/assets/products/cocktail.jpg',
  },
  {
    id: 'lot-garnet',
    name: 'Garnet Charm Necklace',
    material: 'ruby',
    start: 100,
    value: 1040,
    metal: '925 Sterling',
    stone: 'Garnet',
    size: '16" chain',
    imageUrl: '/assets/products/necklace.jpg',
  },
];

const SAREE_LOTS: Lot[] = [
  {
    id: 'lot-banarasi',
    name: 'Banarasi Silk Saree',
    material: 'ruby',
    start: 100,
    value: 1760,
    metal: 'Pure silk',
    stone: 'Zari border',
    size: '6.3 m',
    imageUrl: '/assets/sellers/saree.jpg',
  },
  {
    id: 'lot-kanjeevaram',
    name: 'Kanjeevaram Festive Saree',
    material: 'gold',
    start: 100,
    value: 2080,
    metal: 'Silk blend',
    stone: 'Temple border',
    size: '6.3 m',
    imageUrl: '/assets/seller-saree.png',
  },
  {
    id: 'lot-chiffon',
    name: 'Pastel Chiffon Saree',
    material: 'pearl',
    start: 100,
    value: 880,
    metal: 'Chiffon',
    stone: 'Sequin work',
    size: '5.5 m',
    imageUrl: '/assets/sellers/saree.jpg',
  },
  {
    id: 'lot-organza',
    name: 'Organza Floral Saree',
    material: 'amethyst',
    start: 100,
    value: 1120,
    metal: 'Organza',
    stone: 'Floral print',
    size: '5.5 m',
    imageUrl: '/assets/seller-saree.png',
  },
];

const KURTI_LOTS: Lot[] = [
  {
    id: 'lot-anarkali',
    name: 'Anarkali Embroidered Kurti',
    material: 'emerald',
    start: 100,
    value: 760,
    metal: 'Rayon',
    stone: 'Thread work',
    size: 'M',
    imageUrl: '/assets/sellers/kurti.jpg',
  },
  {
    id: 'lot-chikankari',
    name: 'Chikankari Cotton Kurti',
    material: 'pearl',
    start: 100,
    value: 640,
    metal: 'Cotton',
    stone: 'Chikankari',
    size: 'L',
    imageUrl: '/assets/seller-kurti.png',
  },
  {
    id: 'lot-block',
    name: 'Block Print A-line Kurti',
    material: 'sapphire',
    start: 100,
    value: 560,
    metal: 'Cotton',
    stone: 'Block print',
    size: 'S',
    imageUrl: '/assets/sellers/kurti.jpg',
  },
  {
    id: 'lot-festive',
    name: 'Festive Silk Kurti Set',
    material: 'gold',
    start: 100,
    value: 1200,
    metal: 'Art silk',
    stone: 'Gota patti',
    size: 'M',
    imageUrl: '/assets/seller-kurti.png',
  },
];

const WATCH_LOTS: Lot[] = [
  { id: 'lot-fossil', name: 'Fossil Grant Chronograph Watch', material: 'sapphire', start: 100, value: 1920, metal: 'Stainless steel', stone: 'Blue dial', size: '44 mm' },
  { id: 'lot-titan', name: 'Titan Neo Analog Watch', material: 'darksilver', start: 100, value: 1200, metal: 'Stainless steel', stone: 'White dial', size: '40 mm' },
  { id: 'lot-casio', name: 'Casio Edifice Steel Watch', material: 'silver', start: 100, value: 2080, metal: 'Stainless steel', stone: 'Black dial', size: '43 mm' },
  { id: 'lot-dw', name: 'Daniel Wellington Classic', material: 'gold', start: 100, value: 1600, metal: 'Rose gold', stone: 'Cream dial', size: '40 mm' },
];

const BAGS_LOTS: Lot[] = [
  { id: 'lot-mk-tote', name: 'Michael Kors Jet Set Tote Bag', material: 'pearl', start: 100, value: 2080, metal: 'Signature PVC', stone: 'Gold hardware', size: 'Medium' },
  { id: 'lot-coach-sling', name: 'Coach Quilted Sling Bag', material: 'ruby', start: 100, value: 1760, metal: 'Leather', stone: 'Chain strap', size: 'Small' },
  { id: 'lot-crossbody', name: 'Leather Crossbody Bag', material: 'darksilver', start: 100, value: 1120, metal: 'Genuine leather', stone: 'Silver hardware', size: 'Compact' },
  { id: 'lot-structured', name: 'Structured Handbag', material: 'amethyst', start: 100, value: 1440, metal: 'Vegan leather', stone: 'Top handle', size: 'Medium' },
];

/* ---------------- listings (buy-now, mirror the lots) ---------------- */

export const LISTINGS: Listing[] = [
  { id: 'ls-signet', name: 'Sterling Silver Signet Ring', material: 'darksilver', metal: '925 Sterling', stone: 'Black Onyx', size: 'US 9', price: 1499, imageUrl: '/assets/products/ring.jpg' },
  { id: 'ls-moonstone', name: 'Moonstone Halo Pendant', material: 'pearl', metal: '925 Sterling', stone: 'Moonstone', size: '18" chain', price: 2499, imageUrl: '/assets/products/pendant.jpg' },
  { id: 'ls-amethyst', name: 'Amethyst Drop Earrings', material: 'amethyst', metal: '925 Sterling', stone: 'Amethyst', size: '1.4"', price: 1299, imageUrl: '/assets/products/earrings.jpg' },
  { id: 'ls-cuff', name: 'Oxidised Silver Cuff', material: 'silver', metal: '925 Sterling', stone: 'None', size: 'Adjustable', price: 1799, imageUrl: '/assets/products/cuff.jpg' },
  { id: 'ls-topaz', name: 'Blue Topaz Cocktail Ring', material: 'sapphire', metal: '925 Sterling', stone: 'Blue Topaz', size: 'US 7', price: 2999, imageUrl: '/assets/products/cocktail.jpg' },
  { id: 'ls-garnet', name: 'Garnet Charm Necklace', material: 'ruby', metal: '925 Sterling', stone: 'Garnet', size: '16" chain', price: 1599, imageUrl: '/assets/products/necklace.jpg' },
];

/* ---------------- sellers ---------------- */

// One seller per product type. Each maps to a Studio "go live" section and a
// Home live-thumbnail (public/assets/thumbnails/<productType>.jpg).
export const SELLERS: Seller[] = [
  {
    id: 'jewel_daily',
    handle: 'jewel_daily',
    name: 'Jewel Daily',
    verified: true,
    rating: 4.9,
    followers: 12400,
    sales: 8200,
    bio: 'Traditional & temple jewellery, live every evening. Every lot starts low.',
    category: 'Jewellery',
    productType: 'jewellery',
    liveViewers: 184,
    avatarUrl: '/assets/sellers/jewellery.jpg',
    coverUrl: '/assets/posters/jewellery.jpg',
    cardImageUrl: '/assets/sellers/jewellery.jpg',
    cardBg: 'var(--pastel-cream)',
    showTitle: 'Jewellery Auction',
    thumbnailUrl: '/assets/seller/jewellery.png',
    pinnedName: 'Premium Traditional Gold Necklace Set',
    pinnedPrice: 2499,
  },
  {
    id: 'shree_sarees',
    handle: 'shree_sarees',
    name: 'Shree Sarees',
    verified: true,
    rating: 4.9,
    followers: 15200,
    sales: 9800,
    bio: 'Handloom silks to breezy chiffons — draped live so you see the real fall.',
    category: 'Sarees',
    productType: 'saree',
    liveViewers: 256,
    avatarUrl: '/assets/sellers/saree.jpg',
    coverUrl: '/assets/posters/saree.jpg',
    cardImageUrl: '/assets/sellers/saree.jpg',
    cardBg: 'var(--pastel-lavender)',
    showTitle: 'Silk Saree Showcase',
    thumbnailUrl: '/assets/seller/saree.png',
    pinnedName: 'Banarasi Silk Saree',
    pinnedPrice: 1299,
  },
  {
    id: 'kurti_fashion_station',
    handle: 'kurti_fashion_station',
    name: 'Kurti Fashion Station',
    verified: true,
    rating: 4.9,
    followers: 6900,
    sales: 4200,
    bio: 'Everyday cottons and festive sets, tried on live before you bid.',
    category: 'Kurtis',
    productType: 'kurti',
    liveViewers: 192,
    avatarUrl: '/assets/sellers/kurti.jpg',
    coverUrl: '/assets/posters/kurti.jpg',
    cardImageUrl: '/assets/sellers/kurti.jpg',
    cardBg: 'var(--pastel-peach)',
    showTitle: 'Kurti Try-On Live',
    thumbnailUrl: '/assets/seller/kurti.png',
    pinnedName: 'Lavender Embroidered Cotton Kurti',
    pinnedPrice: 899,
  },
  {
    id: 'watch_warehouse',
    handle: 'watch_warehouse',
    name: 'Watch Warehouse',
    verified: true,
    rating: 4.9,
    followers: 9300,
    sales: 6100,
    bio: 'Branded watches at live-auction prices. Authenticity guaranteed.',
    category: 'Watches',
    productType: 'watch',
    liveViewers: 312,
    avatarUrl: '/assets/sellers/accessories.jpg',
    coverUrl: '/assets/posters/jewellery.jpg',
    cardImageUrl: '/assets/sellers/accessories.jpg',
    cardBg: 'var(--pastel-mint)',
    showTitle: 'Watch Auction',
    thumbnailUrl: '/assets/seller/watch.png',
    pinnedName: 'Fossil Grant Chronograph Watch',
    pinnedPrice: 2499,
  },
  {
    id: 'bags_by_riya',
    handle: 'bags_by_riya',
    name: 'Bags by Riya',
    verified: true,
    rating: 4.9,
    followers: 11200,
    sales: 7400,
    bio: 'Designer bags & purses, live daily. Good bags, good mood.',
    category: 'Bags & Purses',
    productType: 'bags',
    liveViewers: 278,
    avatarUrl: '/assets/sellers/lehenga.jpg',
    coverUrl: '/assets/posters/saree.jpg',
    cardImageUrl: '/assets/sellers/lehenga.jpg',
    cardBg: 'var(--pastel-rose)',
    showTitle: 'Bags & Purses Live',
    thumbnailUrl: '/assets/seller/bags.png',
    pinnedName: 'Michael Kors Jet Set Tote Bag',
    pinnedPrice: 2599,
  },
];

// All five seller ids, in the order they appear as Studio "go live" sections.
export const SELLER_IDS = SELLERS.map((s) => s.id);

// Default room the Studio opens on (jewellery); also used by Activity.
export const FLAGSHIP_SELLER_ID = 'jewel_daily';

export function getSeller(id: string): Seller {
  return SELLERS.find((s) => s.id === id) ?? SELLERS[0];
}

export function getLotsForSeller(sellerId: string): Lot[] {
  switch (getSeller(sellerId).productType) {
    case 'saree':
      return SAREE_LOTS;
    case 'kurti':
      return KURTI_LOTS;
    case 'watch':
      return WATCH_LOTS;
    case 'bags':
      return BAGS_LOTS;
    default:
      return JEWELLERY_LOTS;
  }
}

/* ---------------- shop categories ---------------- */

export interface ShopCategory {
  id: string;
  name: string;
  count: number;
  imageUrl: string;
  bg: string;
  to: string;
}

export const SHOP_CATEGORIES: ShopCategory[] = [
  { id: 'saree', name: 'Saree', count: 120, imageUrl: '/assets/sellers/saree.jpg', bg: 'var(--pastel-lavender)', to: '/live/sareestyle' },
  { id: 'kurti', name: 'Kurti', count: 150, imageUrl: '/assets/sellers/kurti.jpg', bg: 'var(--pastel-peach)', to: '/live/kurticollection' },
  { id: 'jewellery', name: 'Jewellery', count: 200, imageUrl: '/assets/sellers/jewellery.jpg', bg: 'var(--pastel-cream)', to: '/seller/nishusilver' },
  { id: 'accessories', name: 'Accessories', count: 140, imageUrl: '/assets/sellers/accessories.jpg', bg: 'var(--pastel-mint)', to: '/shop' },
];

/* ---------------- shop products (buy-now, prices in ₹, keyed by type) ---------------- */

export type ShopCategoryName = 'Jewellery' | 'Saree' | 'Kurti' | 'Watch' | 'Bags';

export interface ShopProduct {
  id: string;
  name: string;
  category: ShopCategoryName;
  price: number; // whole rupees
  imageUrl: string;
  material: Material;
}

// One item per product type — images at /assets/shop/<type>.png (swatch fallback until added).
export const SHOP_PRODUCTS: ShopProduct[] = [
  { id: 'sp-bag', name: 'Lavender Textured Handbag', category: 'Bags', price: 1999, imageUrl: '/assets/shop/bags.png', material: 'amethyst' },
  { id: 'sp-earrings', name: 'Pearl Bow Stud Earrings', category: 'Jewellery', price: 1999, imageUrl: '/assets/shop/jewellery.png', material: 'gold' },
  { id: 'sp-saree', name: 'Blush Organza Saree', category: 'Saree', price: 1999, imageUrl: '/assets/shop/saree.png', material: 'pearl' },
  { id: 'sp-watch', name: 'Fastrack Minimal Steel Watch', category: 'Watch', price: 1999, imageUrl: '/assets/shop/watch.png', material: 'silver' },
  { id: 'sp-kurti', name: 'Sky Blue Embroidered Kurti Set', category: 'Kurti', price: 1999, imageUrl: '/assets/shop/kurti.png', material: 'sapphire' },
];

/* ---------------- chat bots ---------------- */

export interface Bot {
  handle: string;
  color: string;
  isHost?: boolean;
}

export const BOTS: Bot[] = [
  { handle: 'silverfox_ny', color: '#2a6fdb' },
  { handle: 'mira.jewels', color: '#c71e50' },
  { handle: 'the_curator', color: '#7b45c2', isHost: true },
  { handle: 'oxide_ollie', color: '#159c66' },
  { handle: 'pearl.diver', color: '#c9a227' },
  { handle: 'garnet_gal', color: '#e0537a' },
  { handle: 'stackqueen', color: '#3a7bd5' },
  { handle: 'noor.j', color: '#8a5a3b' },
];

export const BOT_MESSAGES: string[] = [
  'that stone is gorgeous',
  'shipping to the west coast?',
  'wore mine all week, love it',
  'the oxidised finish is perfect',
  'is this hallmarked?',
  'going cheap right now',
  'my third win this month',
  'can you show the back?',
  'love the detailing on this one',
  'how heavy is it?',
  'this would go with everything',
  'the light on that piece!',
];

export const HOST_MESSAGES: string[] = [
  'Every lot starts low — happy bidding! 🎉',
  'This one is hallmarked 925, promise.',
  'Winner pays exactly the last bid, free shipping.',
  'Going once soon — don’t sleep on it!',
];

/* ---------------- current user ---------------- */

export const CURRENT_USER = {
  id: 'you',
  handle: 'avasharma',
  name: 'Ava Sharma',
  avatarUrl: '/assets/avatars/ava.jpg',
  wonLots: 3,
  orders: 38,
  saved: 64,
  address: {
    line1: '214 Larkspur Lane Apt 5',
    city: 'Brooklyn',
    state: 'NY',
    zip: '11215',
  },
  card: 'Visa ···· 4242',
};

/* ---------------- activity feed ---------------- */

export const NOTIFICATIONS: Notification[] = [
  {
    id: 'n1',
    type: 'outbid',
    icon: 'gavel',
    title: 'You were outbid',
    sub: 'Moonstone Halo Pendant — bid is now ₹950',
    time: '2m',
  },
  {
    id: 'n2',
    type: 'won',
    icon: 'emoji_events',
    title: 'You won a lot!',
    sub: 'Sterling Silver Signet Ring · ₹850 — pay to confirm',
    time: '1h',
  },
  {
    id: 'n3',
    type: 'shipped',
    icon: 'local_shipping',
    title: 'Order shipped',
    sub: 'Amethyst Drop Earrings · arriving Fri',
    time: '3h',
  },
  {
    id: 'n4',
    type: 'pricedrop',
    icon: 'trending_down',
    title: 'Price drop on a saved item',
    sub: 'Oxidised Silver Cuff · now ₹1,400',
    time: '1d',
  },
  {
    id: 'n5',
    type: 'newlots',
    icon: 'new_releases',
    title: 'nishusilver added 6 lots',
    sub: 'Silver Auction Night — tonight 8pm',
    time: '1d',
  },
];
