import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Package, ShoppingCart, TrendingUp,
  Users, LogOut, Store,
} from 'lucide-react';

const nav = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/inventory', icon: Package,         label: 'Inventory' },
  { to: '/orders',    icon: ShoppingCart,    label: 'Orders' },
  { to: '/finance',   icon: TrendingUp,      label: 'Finance' },
  { to: '/employees', icon: Users,           label: 'Employees' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };
  const initials = user?.ownerName?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2) || 'SH';

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon"><Store size={18} color="#fff" /></div>
        <div className="sidebar-brand-text">
          <h2>{user?.shopName || 'My Shop'}</h2>
          <span>Management Portal</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Main Menu</div>
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-card">
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            <p>{user?.ownerName}</p>
            <span>{user?.email}</span>
          </div>
          <button className="logout-btn" title="Logout" onClick={handleLogout}>
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
