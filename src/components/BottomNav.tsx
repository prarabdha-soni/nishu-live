import { NavLink, useNavigate } from 'react-router-dom';
import { Icon } from './Icon';

const TABS = [
  { to: '/', icon: 'home', label: 'Home' },
  { to: '/shop', icon: 'storefront', label: 'Shop' },
  { to: '/activity', icon: 'notifications', label: 'Activity' },
  { to: '/account', icon: 'person', label: 'Account' },
];

export function BottomNav() {
  const navigate = useNavigate();
  return (
    <nav className="bottom-nav" aria-label="Main">
      {TABS.slice(0, 2).map((t) => (
        <Tab key={t.to} {...t} />
      ))}
      <button className="nav-sell" aria-label="Sell" onClick={() => navigate('/sell')}>
        <Icon name="add" size={28} />
      </button>
      {TABS.slice(2).map((t) => (
        <Tab key={t.to} {...t} />
      ))}
    </nav>
  );
}

function Tab({ to, icon, label }: { to: string; icon: string; label: string }) {
  return (
    <NavLink to={to} className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`} end={to === '/'}>
      {({ isActive }) => (
        <>
          <Icon name={icon} filled={isActive} size={24} />
          <span>{label}</span>
        </>
      )}
    </NavLink>
  );
}
