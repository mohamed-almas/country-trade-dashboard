import { Link, useLocation } from 'react-router-dom';
import { BarChart3, Globe, TrendingUp, Package, Activity, Sun, Moon } from 'lucide-react';
import { YEARS } from '../lib/utils';
import { useTheme } from '../lib/ThemeContext';

interface SidebarProps {
  selectedYear: number | 'all';
  onYearChange: (year: number | 'all') => void;
  metricType: 'value' | 'volume';
  onMetricTypeChange: (type: 'value' | 'volume') => void;
}

export function Sidebar({ selectedYear, onYearChange, metricType, onMetricTypeChange }: SidebarProps) {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { path: '/', label: 'Overview', icon: BarChart3 },
    { path: '/country', label: 'Country Profile', icon: Globe },
    { path: '/bilateral', label: 'Bilateral Explorer', icon: TrendingUp },
    { path: '/commodity', label: 'Commodity Analysis', icon: Package },
    { path: '/trends', label: 'Trade Trends', icon: Activity },
  ];

  return (
    <div
      className="w-60 h-screen flex flex-col border-r"
      style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
    >
      <div className="p-6 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-outfit font-semibold" style={{ color: 'var(--accent)' }}>
              Global Trade Intelligence
            </h1>
            <p className="text-[10px] font-dm-sans leading-tight mt-1" style={{ color: 'var(--text-muted)' }}>
              [All Countries · 2020–2024 · ADPG Commodities]
            </p>
          </div>
          <button
            onClick={toggleTheme}
            className="ml-2 mt-0.5 flex-shrink-0 p-1.5 transition-colors"
            style={{
              color: 'var(--text-secondary)',
              backgroundColor: 'var(--bg-elevated)',
            }}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </div>

      <nav className="py-4 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex items-center gap-3 px-6 py-3 text-sm font-dm-sans transition-colors border-l-2"
              style={{
                backgroundColor: isActive ? 'var(--bg-tertiary)' : 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                borderLeftColor: isActive ? 'var(--accent)' : 'transparent',
              }}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-6 border-t space-y-6" style={{ borderColor: 'var(--border)' }}>
        <div>
          <div className="text-xs mb-2 font-dm-sans font-semibold" style={{ color: 'var(--text-secondary)' }}>
            Year
          </div>
          <div className="flex flex-wrap gap-2">
            {YEARS.map((year) => (
              <button
                key={year}
                onClick={() => onYearChange(year)}
                className="px-3 py-1 text-xs font-dm-sans transition-colors"
                style={
                  selectedYear === year
                    ? { backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }
                    : { backgroundColor: 'var(--input-bg)', color: 'var(--text-secondary)' }
                }
              >
                {year}
              </button>
            ))}
            <button
              onClick={() => onYearChange('all')}
              className="px-3 py-1 text-xs font-dm-sans transition-colors"
              style={
                selectedYear === 'all'
                  ? { backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }
                  : { backgroundColor: 'var(--input-bg)', color: 'var(--text-secondary)' }
              }
            >
              All
            </button>
          </div>
        </div>

        <div>
          <div className="text-xs mb-2 font-dm-sans font-semibold" style={{ color: 'var(--text-secondary)' }}>
            Metric
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onMetricTypeChange('value')}
              className="flex-1 px-3 py-1 text-xs font-dm-sans transition-colors"
              style={
                metricType === 'value'
                  ? { backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }
                  : { backgroundColor: 'var(--input-bg)', color: 'var(--text-secondary)' }
              }
            >
              Value
            </button>
            <button
              onClick={() => onMetricTypeChange('volume')}
              className="flex-1 px-3 py-1 text-xs font-dm-sans transition-colors"
              style={
                metricType === 'volume'
                  ? { backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }
                  : { backgroundColor: 'var(--input-bg)', color: 'var(--text-secondary)' }
              }
            >
              Volume
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
