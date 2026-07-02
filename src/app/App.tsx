import { Suspense, lazy, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { BottomNav } from '../components/BottomNav';
import { ReloadPrompt } from '../pwa/ReloadPrompt';
import { Home } from '../screens/Home';

const Live = lazy(() => import('../screens/Live').then((m) => ({ default: m.Live })));
const ProductDetail = lazy(() => import('../screens/ProductDetail').then((m) => ({ default: m.ProductDetail })));
const Seller = lazy(() => import('../screens/Seller').then((m) => ({ default: m.Seller })));
const Shop = lazy(() => import('../screens/Shop').then((m) => ({ default: m.Shop })));
const Sell = lazy(() => import('../screens/Sell').then((m) => ({ default: m.Sell })));
const Activity = lazy(() => import('../screens/Activity').then((m) => ({ default: m.Activity })));
const Account = lazy(() => import('../screens/Account').then((m) => ({ default: m.Account })));
const Checkout = lazy(() => import('../screens/Checkout').then((m) => ({ default: m.Checkout })));
const Confirm = lazy(() => import('../screens/Confirm').then((m) => ({ default: m.Confirm })));
const Studio = lazy(() => import('../screens/Studio').then((m) => ({ default: m.Studio })));

// nav shows on browse screens, hides on immersive/flow screens (live, detail, checkout, confirm)
const NAV_HIDDEN = [/^\/live\//, /^\/product\//, /^\/checkout/, /^\/confirm/];

export function App() {
  const { pathname } = useLocation();
  const showNav = !NAV_HIDDEN.some((re) => re.test(pathname));

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className={`app ${showNav ? 'with-nav' : ''}`}>
      <Suspense fallback={<div className="route-loading" />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/live/:sellerId" element={<Live />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/seller/:id" element={<Seller />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/sell" element={<Sell />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/account" element={<Account />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/confirm" element={<Confirm />} />
          <Route path="/studio" element={<Studio />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </Suspense>
      {showNav && <BottomNav />}
      <ReloadPrompt />
    </div>
  );
}
