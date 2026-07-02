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
  liveViewers?: number;
  avatarUrl: string;
  coverUrl: string;
  videoUrl: string;
  posterUrl: string;
  cardImageUrl: string;
  cardBg: string;
  showTitle: string;
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
    start: 5,
    value: 120,
    metal: '925 Sterling',
    stone: 'Black Onyx',
    size: 'US 9',
    imageUrl: '/assets/products/ring.jpg',
  },
  {
    id: 'lot-moonstone',
    name: 'Moonstone Halo Pendant',
    material: 'pearl',
    start: 10,
    value: 185,
    metal: '925 Sterling',
    stone: 'Moonstone',
    size: '18" chain',
    imageUrl: '/assets/products/pendant.jpg',
  },
  {
    id: 'lot-amethyst',
    name: 'Amethyst Drop Earrings',
    material: 'amethyst',
    start: 8,
    value: 95,
    metal: '925 Sterling',
    stone: 'Amethyst',
    size: '1.4"',
    imageUrl: '/assets/products/earrings.jpg',
  },
  {
    id: 'lot-cuff',
    name: 'Oxidised Silver Cuff',
    material: 'silver',
    start: 12,
    value: 160,
    metal: '925 Sterling',
    stone: 'None',
    size: 'Adjustable',
    imageUrl: '/assets/products/cuff.jpg',
  },
  {
    id: 'lot-topaz',
    name: 'Blue Topaz Cocktail Ring',
    material: 'sapphire',
    start: 10,
    value: 210,
    metal: '925 Sterling',
    stone: 'Blue Topaz',
    size: 'US 7',
    imageUrl: '/assets/products/cocktail.jpg',
  },
  {
    id: 'lot-garnet',
    name: 'Garnet Charm Necklace',
    material: 'ruby',
    start: 6,
    value: 130,
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
    start: 15,
    value: 220,
    metal: 'Pure silk',
    stone: 'Zari border',
    size: '6.3 m',
    imageUrl: '/assets/sellers/saree.jpg',
  },
  {
    id: 'lot-kanjeevaram',
    name: 'Kanjeevaram Festive Saree',
    material: 'gold',
    start: 20,
    value: 260,
    metal: 'Silk blend',
    stone: 'Temple border',
    size: '6.3 m',
    imageUrl: '/assets/seller-saree.png',
  },
  {
    id: 'lot-chiffon',
    name: 'Pastel Chiffon Saree',
    material: 'pearl',
    start: 8,
    value: 110,
    metal: 'Chiffon',
    stone: 'Sequin work',
    size: '5.5 m',
    imageUrl: '/assets/sellers/saree.jpg',
  },
  {
    id: 'lot-organza',
    name: 'Organza Floral Saree',
    material: 'amethyst',
    start: 10,
    value: 140,
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
    start: 8,
    value: 95,
    metal: 'Rayon',
    stone: 'Thread work',
    size: 'M',
    imageUrl: '/assets/sellers/kurti.jpg',
  },
  {
    id: 'lot-chikankari',
    name: 'Chikankari Cotton Kurti',
    material: 'pearl',
    start: 6,
    value: 80,
    metal: 'Cotton',
    stone: 'Chikankari',
    size: 'L',
    imageUrl: '/assets/seller-kurti.png',
  },
  {
    id: 'lot-block',
    name: 'Block Print A-line Kurti',
    material: 'sapphire',
    start: 5,
    value: 70,
    metal: 'Cotton',
    stone: 'Block print',
    size: 'S',
    imageUrl: '/assets/sellers/kurti.jpg',
  },
  {
    id: 'lot-festive',
    name: 'Festive Silk Kurti Set',
    material: 'gold',
    start: 12,
    value: 150,
    metal: 'Art silk',
    stone: 'Gota patti',
    size: 'M',
    imageUrl: '/assets/seller-kurti.png',
  },
];

/* ---------------- listings (buy-now, mirror the lots) ---------------- */

export const LISTINGS: Listing[] = [
  { id: 'ls-signet', name: 'Sterling Silver Signet Ring', material: 'darksilver', metal: '925 Sterling', stone: 'Black Onyx', size: 'US 9', price: 135, imageUrl: '/assets/products/ring.jpg' },
  { id: 'ls-moonstone', name: 'Moonstone Halo Pendant', material: 'pearl', metal: '925 Sterling', stone: 'Moonstone', size: '18" chain', price: 210, imageUrl: '/assets/products/pendant.jpg' },
  { id: 'ls-amethyst', name: 'Amethyst Drop Earrings', material: 'amethyst', metal: '925 Sterling', stone: 'Amethyst', size: '1.4"', price: 110, imageUrl: '/assets/products/earrings.jpg' },
  { id: 'ls-cuff', name: 'Oxidised Silver Cuff', material: 'silver', metal: '925 Sterling', stone: 'None', size: 'Adjustable', price: 175, imageUrl: '/assets/products/cuff.jpg' },
  { id: 'ls-topaz', name: 'Blue Topaz Cocktail Ring', material: 'sapphire', metal: '925 Sterling', stone: 'Blue Topaz', size: 'US 7', price: 240, imageUrl: '/assets/products/cocktail.jpg' },
  { id: 'ls-garnet', name: 'Garnet Charm Necklace', material: 'ruby', metal: '925 Sterling', stone: 'Garnet', size: '16" chain', price: 150, imageUrl: '/assets/products/necklace.jpg' },
];

/* ---------------- sellers ---------------- */

export const SELLERS: Seller[] = [
  {
    id: 'nishusilver',
    handle: 'nishusilver',
    name: 'Nishu Silver Jewellery',
    verified: true,
    rating: 4.9,
    followers: 12400,
    sales: 8200,
    bio: 'Handcrafted 925 sterling silver & natural gemstones. Live auctions every evening — every lot starts low, every piece hallmarked.',
    category: 'Jewellery',
    liveViewers: 1200,
    avatarUrl: '/assets/avatars/nishu.jpg',
    coverUrl: '/assets/posters/jewellery.jpg',
    videoUrl: '/videos/jewellery.mp4',
    posterUrl: '/assets/posters/jewellery.jpg',
    cardImageUrl: '/assets/sellers/jewellery.jpg',
    cardBg: 'var(--pastel-cream)',
    showTitle: 'Silver Auction Night',
  },
  {
    id: 'jewelrysparkle',
    handle: 'jewelrysparkle',
    name: 'Jewelry Sparkle',
    verified: true,
    rating: 4.8,
    followers: 8600,
    sales: 5100,
    bio: 'Gemstones that catch the light. Nightly silver & stone drops, all hallmarked.',
    category: 'Jewellery',
    liveViewers: 842,
    avatarUrl: '/assets/sellers/jewellery.jpg',
    coverUrl: '/assets/posters/jewellery.jpg',
    videoUrl: '/videos/jewellery.mp4',
    posterUrl: '/assets/posters/jewellery.jpg',
    cardImageUrl: '/assets/sellers/jewellery.jpg',
    cardBg: 'var(--pastel-cream)',
    showTitle: 'Gemstone Sparkle Live',
  },
  {
    id: 'sareestyle',
    handle: 'sareestyle',
    name: 'Saree Style Studio',
    verified: true,
    rating: 4.7,
    followers: 15200,
    sales: 9800,
    bio: 'Handloom silks to breezy chiffons — draped live so you see the real fall.',
    category: 'Sarees',
    liveViewers: 1500,
    avatarUrl: '/assets/sellers/saree.jpg',
    coverUrl: '/assets/posters/saree.jpg',
    videoUrl: '/videos/saree.mp4',
    posterUrl: '/assets/posters/saree.jpg',
    cardImageUrl: '/assets/sellers/saree.jpg',
    cardBg: 'var(--pastel-lavender)',
    showTitle: 'Silk Saree Showcase',
  },
  {
    id: 'kurticollection',
    handle: 'kurticollection',
    name: 'Kurti Collection Co.',
    verified: false,
    rating: 4.6,
    followers: 6900,
    sales: 4200,
    bio: 'Everyday cottons and festive sets, tried on live before you bid.',
    category: 'Kurtis',
    liveViewers: 620,
    avatarUrl: '/assets/sellers/kurti.jpg',
    coverUrl: '/assets/posters/kurti.jpg',
    videoUrl: '/videos/kurti.mp4',
    posterUrl: '/assets/posters/kurti.jpg',
    cardImageUrl: '/assets/sellers/kurti.jpg',
    cardBg: 'var(--pastel-peach)',
    showTitle: 'Kurti Try-On Live',
  },
];

export const HOME_SELLER_IDS = ['jewelrysparkle', 'sareestyle', 'kurticollection'];

export const FLAGSHIP_SELLER_ID = 'nishusilver';

export function getSeller(id: string): Seller {
  return SELLERS.find((s) => s.id === id) ?? SELLERS[0];
}

export function getLotsForSeller(sellerId: string): Lot[] {
  const seller = getSeller(sellerId);
  if (seller.category === 'Sarees') return SAREE_LOTS;
  if (seller.category === 'Kurtis') return KURTI_LOTS;
  return JEWELLERY_LOTS;
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

export interface ShopProduct {
  id: string;
  name: string;
  category: 'Saree' | 'Kurti' | 'Jewellery' | 'Accessories';
  price: number; // whole rupees
  imageUrl: string;
  material: Material;
}

// Price bands per type keep values believable: sarees > jewellery > kurtis > accessories.
export const SHOP_PRODUCTS: ShopProduct[] = [
  // Sarees
  { id: 'sp-banarasi', name: 'Banarasi Silk Saree', category: 'Saree', price: 4999, imageUrl: '/assets/sellers/saree.jpg', material: 'ruby' },
  { id: 'sp-kanjeevaram', name: 'Kanjeevaram Zari Saree', category: 'Saree', price: 6499, imageUrl: '/assets/seller-saree.png', material: 'gold' },
  { id: 'sp-chiffon', name: 'Pastel Chiffon Saree', category: 'Saree', price: 1899, imageUrl: '/assets/sellers/saree.jpg', material: 'pearl' },
  { id: 'sp-organza', name: 'Organza Floral Saree', category: 'Saree', price: 2799, imageUrl: '/assets/seller-saree.png', material: 'amethyst' },
  // Kurtis
  { id: 'sp-anarkali', name: 'Anarkali Embroidered Kurti', category: 'Kurti', price: 1299, imageUrl: '/assets/sellers/kurti.jpg', material: 'emerald' },
  { id: 'sp-chikankari', name: 'Chikankari Cotton Kurti', category: 'Kurti', price: 999, imageUrl: '/assets/seller-kurti.png', material: 'pearl' },
  { id: 'sp-blockprint', name: 'Block Print A-line Kurti', category: 'Kurti', price: 799, imageUrl: '/assets/sellers/kurti.jpg', material: 'sapphire' },
  { id: 'sp-festivekurti', name: 'Festive Silk Kurti Set', category: 'Kurti', price: 1999, imageUrl: '/assets/seller-kurti.png', material: 'gold' },
  // Jewellery
  { id: 'sp-signet', name: 'Sterling Silver Signet Ring', category: 'Jewellery', price: 2499, imageUrl: '/assets/products/ring.jpg', material: 'darksilver' },
  { id: 'sp-moonstone', name: 'Moonstone Halo Pendant', category: 'Jewellery', price: 3299, imageUrl: '/assets/products/pendant.jpg', material: 'pearl' },
  { id: 'sp-amethyst', name: 'Amethyst Drop Earrings', category: 'Jewellery', price: 1799, imageUrl: '/assets/products/earrings.jpg', material: 'amethyst' },
  { id: 'sp-cuff', name: 'Oxidised Silver Cuff', category: 'Jewellery', price: 2199, imageUrl: '/assets/products/cuff.jpg', material: 'silver' },
  { id: 'sp-topaz', name: 'Blue Topaz Cocktail Ring', category: 'Jewellery', price: 3999, imageUrl: '/assets/products/cocktail.jpg', material: 'sapphire' },
  { id: 'sp-garnet', name: 'Garnet Charm Necklace', category: 'Jewellery', price: 2799, imageUrl: '/assets/products/necklace.jpg', material: 'ruby' },
  // Accessories
  { id: 'sp-potli', name: 'Embroidered Potli Bag', category: 'Accessories', price: 699, imageUrl: '/assets/sellers/accessories.jpg', material: 'gold' },
  { id: 'sp-juttis', name: 'Handcrafted Juttis', category: 'Accessories', price: 1199, imageUrl: '/assets/shop-accessories.png', material: 'ruby' },
  { id: 'sp-hairset', name: 'Kundan Hair Accessory Set', category: 'Accessories', price: 499, imageUrl: '/assets/sellers/accessories.jpg', material: 'gold' },
  { id: 'sp-clutch', name: 'Silk Embroidered Clutch', category: 'Accessories', price: 899, imageUrl: '/assets/shop-accessories.png', material: 'amethyst' },
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
    sub: 'Moonstone Halo Pendant — bid is now $95',
    time: '2m',
  },
  {
    id: 'n2',
    type: 'won',
    icon: 'emoji_events',
    title: 'You won a lot!',
    sub: 'Sterling Silver Signet Ring · $85 — pay to confirm',
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
    sub: 'Oxidised Silver Cuff · now $175',
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
