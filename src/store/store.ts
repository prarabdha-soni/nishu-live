import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SellerApplication } from '../data/seed';

export interface CheckoutItem {
  title: string;
  price: number;
  imageUrl?: string;
  material: string;
  won: boolean; // true when the item came from winning an auction lot
  sellerHandle: string;
  sellerId: string;
}

export interface Order {
  id: string;
  item: CheckoutItem;
  arriving: string;
  placedAt: number;
}

interface AppState {
  follows: string[]; // seller ids
  saved: string[]; // listing ids
  checkoutItem: CheckoutItem | null;
  lastOrder: Order | null;
  application: SellerApplication | null;

  toggleFollow: (sellerId: string) => void;
  isFollowing: (sellerId: string) => boolean;
  toggleSaved: (listingId: string) => void;
  setCheckoutItem: (item: CheckoutItem | null) => void;
  placeOrder: (order: Order) => void;
  submitApplication: (app: SellerApplication) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      follows: ['nishusilver'],
      saved: [],
      checkoutItem: null,
      lastOrder: null,
      application: null,

      toggleFollow: (sellerId) =>
        set((s) => ({
          follows: s.follows.includes(sellerId)
            ? s.follows.filter((id) => id !== sellerId)
            : [...s.follows, sellerId],
        })),

      isFollowing: (sellerId) => get().follows.includes(sellerId),

      toggleSaved: (listingId) =>
        set((s) => ({
          saved: s.saved.includes(listingId)
            ? s.saved.filter((id) => id !== listingId)
            : [...s.saved, listingId],
        })),

      setCheckoutItem: (item) => set({ checkoutItem: item }),

      placeOrder: (order) => set({ lastOrder: order, checkoutItem: null }),

      submitApplication: (app) => set({ application: app }),
    }),
    {
      name: 'nishu-store',
      partialize: (s) => ({ follows: s.follows, saved: s.saved, application: s.application }),
    },
  ),
);
