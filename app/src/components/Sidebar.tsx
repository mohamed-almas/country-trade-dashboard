import { NavLink } from 'react-router-dom';
import {
  Globe, Map, Flag, Package, ArrowLeftRight, DollarSign, Newspaper, BookOpen,
  Sun, Moon, TrendingUp,
} from 'lucide-react';
import { useTheme } from '../lib/ThemeContext';
import { useMetric } from '../lib/MetricContext';

const NAV_ITEMS = [
  { path: '/', label: 'Global', icon: Globe },
  { path: '/region', label: 'Region', icon: Map },
  { path: '/country', label: 'Country', icon: Flag },
  { path: '/commodity', label: 'Commodity', icon: Package },
  { path: '/bilateral', label: 'Bilateral', icon: ArrowLeftRight },
  { path: '/dollar-per-ton', label: '$/Ton', icon: DollarSign },
  { path: '/news', label: 'News', icon: Newspaper },
  { path: '/references', label: 'References', icon: BookOpen },
];

export function Sidebar() {
  const { theme, toggleTheme } = useTheme();
  const { metric, setMetric } = useMetric();

  return (
    <aside
      className="w-56 flex-shrink-0 h-screen sticky top-0 flex flex-col border-r"
      style={{ backgroundColor: 'var(--sidebar-bg)', borderColor: 'var(--sidebar-border)' }}
    >
      <div className="flex items-center gap-2.5 px-5 pt-6 pb-5">
        <div
          className="flex items-center justify-center w-8 h-8 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--sidebar-active-bg), var(--accent-2))', borderRadius: 'var(--radius-sm)' }}
        >
          <TrendingUp size={17} color="#FFFFFF" />
        </div>
        <span className="font-outfit font-bold text-[15px] tracking-tight" style={{ color: '#FFFFFF' }}>
          TradeVision
        </span>
      </div>

      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className="flex items-center gap-2.5 px-3 py-2 text-[13px] font-dm-sans font-medium transition-colors"
            style={({ isActive }) => ({
              backgroundColor: isActive ? 'var(--sidebar-active-bg)' : 'transparent',
              color: isActive ? 'var(--sidebar-active-text)' : 'var(--sidebar-text)',
              borderRadius: 'var(--radius-sm)',
            })}
          >
            <item.icon size={15} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-5 pt-3 space-y-3 border-t" style={{ borderColor: 'var(--sidebar-border)' }}>
        <div
          className="flex items-center gap-1 p-0.5"
          style={{ backgroundColor: 'var(--sidebar-bg-elevated)', borderRadius: 'var(--radius-sm)' }}
        >
          <button
            onClick={() => setMetric('value')}
            className="flex-1 py-1.5 text-[11px] font-dm-sans font-semibold transition-colors"
            style={{
              borderRadius: 'calc(var(--radius-sm) - 3px)',
              backgroundColor: metric === 'value' ? 'var(--sidebar-active-bg)' : 'transparent',
              color: metric === 'value' ? 'var(--sidebar-active-text)' : 'var(--sidebar-text-muted)',
            }}
          >
            Value
          </button>
          <button
            onClick={() => setMetric('volume')}
            className="flex-1 py-1.5 text-[11px] font-dm-sans font-semibold transition-colors"
            style={{
              borderRadius: 'calc(var(--radius-sm) - 3px)',
              backgroundColor: metric === 'volume' ? 'var(--sidebar-active-bg)' : 'transparent',
              color: metric === 'volume' ? 'var(--sidebar-active-text)' : 'var(--sidebar-text-muted)',
            }}
          >
            Volume
          </button>
        </div>

        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-center gap-2 py-2 text-[12px] font-dm-sans font-medium transition-colors"
          style={{ backgroundColor: 'var(--sidebar-bg-elevated)', color: 'var(--sidebar-text)', borderRadius: 'var(--radius-sm)' }}
        >
          {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
      </div>
    </aside>
  );
}
