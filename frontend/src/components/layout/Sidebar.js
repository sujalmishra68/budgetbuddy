import { NavLink } from 'react-router-dom';
import { House, Receipt, Tag, Wallet, ChartPie, User, ArrowsClockwise } from '@phosphor-icons/react';

const navItems = [
  { to: '/', icon: House, label: 'Dashboard' },
  { to: '/expenses', icon: Receipt, label: 'Expenses' },
  { to: '/categories', icon: Tag, label: 'Categories' },
  { to: '/budgets', icon: Wallet, label: 'Budgets' },
  { to: '/recurring', icon: ArrowsClockwise, label: 'Recurring' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export default function Sidebar({ onClose }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <ChartPie weight="duotone" className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="text-xl font-semibold tracking-tight font-[Outfit]" data-testid="sidebar-logo">
          ExpenseIQ
        </span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onClose}
            data-testid={`nav-${label.toLowerCase()}`}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`
            }
          >
            <Icon weight="duotone" className="w-5 h-5 flex-shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="px-3 py-4 border-t border-border">
        <p className="text-xs text-muted-foreground tracking-[0.2em] uppercase font-bold px-3">
          ExpenseIQ v1.0
        </p>
      </div>
    </div>
  );
}
