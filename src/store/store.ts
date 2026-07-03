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
  checkoutItem: CheckoutItem | null;
  lastOrder: Order | null;
  application: SellerApplication | null;

  toggleFollow: (sellerId: string) => void;
  isFollowing: (sellerId: string) => boolean;
  setCheckoutItem: (item: CheckoutItem | null) => void;
  placeOrder: (order: Order) => void;
  submitApplication: (app: SellerApplication) => void;
}

// Transient/local UI state. Persistent user data (orders, saved, profile,
// notifications) lives in Supabase — see src/api/supastore.ts.
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      follows: ['jewel_daily'],
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

      setCheckoutItem: (item) => set({ checkoutItem: item }),

      placeOrder: (order) => set({ lastOrder: order, checkoutItem: null }),

      submitApplication: (app) => set({ application: app }),
    }),
    {
      name: 'nishu-store',
      partialize: (s) => ({ follows: s.follows, application: s.application }),
    },
  ),
);
