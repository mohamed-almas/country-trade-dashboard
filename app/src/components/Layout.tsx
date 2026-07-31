import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
  selectedYear: number | 'all';
  onYearChange: (year: number | 'all') => void;
  metricType: 'value' | 'volume';
  onMetricTypeChange: (type: 'value' | 'volume') => void;
}

export function Layout({
  children,
  title,
  subtitle,
  selectedYear,
  onYearChange,
  metricType,
  onMetricTypeChange,
}: LayoutProps) {
  return (
    <div className="flex h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Sidebar
        selectedYear={selectedYear}
        onYearChange={onYearChange}
        metricType={metricType}
        onMetricTypeChange={onMetricTypeChange}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header
          className="h-14 flex items-center px-8 border-b"
          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
        >
          <div>
            <h2
              className="text-lg font-outfit font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              {title}
            </h2>
            <p className="text-xs font-dm-sans" style={{ color: 'var(--text-secondary)' }}>
              {subtitle}
            </p>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
