import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Sun, Moon, Menu, X, TrendingUp } from 'lucide-react';
import { useTheme } from '../lib/ThemeContext';
import { useMetric } from '../lib/MetricContext';

const NAV_LINKS = [
  { path: '/', label: 'Global' },
  { path: '/region', label: 'Region' },
  { path: '/country', label: 'Country' },
  { path: '/commodity', label: 'Commodity' },
  { path: '/bilateral', label: 'Bilateral' },
  { path: '/dollar-per-ton', label: '$/Ton' },
  { path: '/news', label: 'News' },
  { path: '/references', label: 'References' },
];

export function Nav() {
  const { theme, toggleTheme } = useTheme();
  const { metric, setMetric } = useMetric();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 border-b"
      style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-3">
          <TrendingUp size={20} style={{ color: 'var(--accent)' }} />
          <span className="font-outfit font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
            TradeVision
          </span>
        </div>

        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              end={link.path === '/'}
              className={({ isActive }) =>
                `px-3 py-1.5 text-xs font-dm-sans font-medium transition-colors ${
                  isActive ? 'text-[var(--accent)]' : ''
                }`
              }
              style={({ isActive }) => ({
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                backgroundColor: isActive ? 'var(--bg-tertiary)' : 'transparent',
              })}
            >
              {link.label}
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-1 p-0.5 border"
            style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)' }}
          >
            <button
              onClick={() => setMetric('value')}
              className="px-3 py-1 text-xs font-dm-sans font-medium transition-colors"
              style={
                metric === 'value'
                  ? { backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }
                  : { backgroundColor: 'transparent', color: 'var(--text-secondary)' }
              }
            >
              Value
            </button>
            <button
              onClick={() => setMetric('volume')}
              className="px-3 py-1 text-xs font-dm-sans font-medium transition-colors"
              style={
                metric === 'volume'
                  ? { backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }
                  : { backgroundColor: 'transparent', color: 'var(--text-secondary)' }
              }
            >
              Volume
            </button>
          </div>

          <button
            onClick={toggleTheme}
            className="p-2 transition-colors"
            style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-elevated)' }}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <button
            className="md:hidden p-2"
            style={{ color: 'var(--text-secondary)' }}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div
          className="md:hidden border-t"
          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
        >
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              end={link.path === '/'}
              onClick={() => setMobileOpen(false)}
              className="block px-4 py-3 text-sm font-dm-sans border-b"
              style={({ isActive }) => ({
                color: isActive ? 'var(--accent)' : 'var(--text-primary)',
                borderColor: 'var(--border)',
                backgroundColor: isActive ? 'var(--bg-tertiary)' : 'transparent',
              })}
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      )}
    </nav>
  );
}
