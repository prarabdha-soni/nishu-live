// Server-side seed lots (mirrors src/data/seed.ts). In production these come from Postgres.

export const JEWELLERY_LOTS = [
  { id: 'lot-signet', name: 'Sterling Silver Signet Ring', material: 'darksilver', start: 5, value: 120, metal: '925 Sterling', stone: 'Black Onyx', size: 'US 9', imageUrl: '/assets/products/ring.jpg' },
  { id: 'lot-moonstone', name: 'Moonstone Halo Pendant', material: 'pearl', start: 10, value: 185, metal: '925 Sterling', stone: 'Moonstone', size: '18" chain', imageUrl: '/assets/products/pendant.jpg' },
  { id: 'lot-amethyst', name: 'Amethyst Drop Earrings', material: 'amethyst', start: 8, value: 95, metal: '925 Sterling', stone: 'Amethyst', size: '1.4"', imageUrl: '/assets/products/earrings.jpg' },
  { id: 'lot-cuff', name: 'Oxidised Silver Cuff', material: 'silver', start: 12, value: 160, metal: '925 Sterling', stone: 'None', size: 'Adjustable', imageUrl: '/assets/products/cuff.jpg' },
  { id: 'lot-topaz', name: 'Blue Topaz Cocktail Ring', material: 'sapphire', start: 10, value: 210, metal: '925 Sterling', stone: 'Blue Topaz', size: 'US 7', imageUrl: '/assets/products/cocktail.jpg' },
  { id: 'lot-garnet', name: 'Garnet Charm Necklace', material: 'ruby', start: 6, value: 130, metal: '925 Sterling', stone: 'Garnet', size: '16" chain', imageUrl: '/assets/products/necklace.jpg' },
];

export const SAREE_LOTS = [
  { id: 'lot-banarasi', name: 'Banarasi Silk Saree', material: 'ruby', start: 15, value: 220, metal: 'Pure silk', stone: 'Zari border', size: '6.3 m', imageUrl: '/assets/sellers/saree.jpg' },
  { id: 'lot-kanjeevaram', name: 'Kanjeevaram Festive Saree', material: 'gold', start: 20, value: 260, metal: 'Silk blend', stone: 'Temple border', size: '6.3 m', imageUrl: '/assets/seller-saree.png' },
  { id: 'lot-chiffon', name: 'Pastel Chiffon Saree', material: 'pearl', start: 8, value: 110, metal: 'Chiffon', stone: 'Sequin work', size: '5.5 m', imageUrl: '/assets/sellers/saree.jpg' },
  { id: 'lot-organza', name: 'Organza Floral Saree', material: 'amethyst', start: 10, value: 140, metal: 'Organza', stone: 'Floral print', size: '5.5 m', imageUrl: '/assets/seller-saree.png' },
];

export const KURTI_LOTS = [
  { id: 'lot-anarkali', name: 'Anarkali Embroidered Kurti', material: 'emerald', start: 8, value: 95, metal: 'Rayon', stone: 'Thread work', size: 'M', imageUrl: '/assets/sellers/kurti.jpg' },
  { id: 'lot-chikankari', name: 'Chikankari Cotton Kurti', material: 'pearl', start: 6, value: 80, metal: 'Cotton', stone: 'Chikankari', size: 'L', imageUrl: '/assets/seller-kurti.png' },
  { id: 'lot-block', name: 'Block Print A-line Kurti', material: 'sapphire', start: 5, value: 70, metal: 'Cotton', stone: 'Block print', size: 'S', imageUrl: '/assets/sellers/kurti.jpg' },
  { id: 'lot-festive', name: 'Festive Silk Kurti Set', material: 'gold', start: 12, value: 150, metal: 'Art silk', stone: 'Gota patti', size: 'M', imageUrl: '/assets/seller-kurti.png' },
];

export const ROOMS = [
  { id: 'nishusilver', lots: JEWELLERY_LOTS },
  { id: 'jewelrysparkle', lots: JEWELLERY_LOTS },
  { id: 'sareestyle', lots: SAREE_LOTS },
  { id: 'kurticollection', lots: KURTI_LOTS },
];

export const BOTS = [
  { handle: 'silverfox_ny', color: '#2a6fdb' },
  { handle: 'mira.jewels', color: '#c71e50' },
  { handle: 'the_curator', color: '#7b45c2', isHost: true },
  { handle: 'oxide_ollie', color: '#159c66' },
  { handle: 'pearl.diver', color: '#c9a227' },
  { handle: 'garnet_gal', color: '#e0537a' },
  { handle: 'stackqueen', color: '#3a7bd5' },
  { handle: 'noor.j', color: '#8a5a3b' },
];

export const BOT_MESSAGES = [
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

export const HOST_MESSAGES = [
  'Every lot starts low — happy bidding! 🎉',
  'This one is hallmarked, promise.',
  'Winner pays exactly the last bid, free shipping.',
  'Going once soon — don’t sleep on it!',
];
