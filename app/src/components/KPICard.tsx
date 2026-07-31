import { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
  label?: string;
  title?: string;
  value: string | number;
  sub?: string;
  delta?: number | null;
  trend?: number | null;
  icon?: ReactNode;
  accent?: boolean;
}

export function KPICard({ label, title, value, sub, delta, trend, icon, accent }: KPICardProps) {
  const displayLabel = label ?? title ?? '';
  const displayDelta = delta ?? trend ?? null;
  const isPositive = displayDelta != null && displayDelta > 0;
  const isNegative = displayDelta != null && displayDelta < 0;

  return (
    <div
      className="border p-5 flex flex-col gap-2"
      style={{ backgroundColor: 'var(--bg-secondary)', borderColor: accent ? 'var(--accent)' : 'var(--border)' }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-dm-sans font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          {displayLabel}
        </span>
        {icon && <span style={{ color: 'var(--accent)' }}>{icon}</span>}
      </div>
      <div className="text-2xl font-dm-mono font-semibold" style={{ color: accent ? 'var(--accent)' : 'var(--text-primary)' }}>
        {value}
      </div>
      {(sub || displayDelta != null) && (
        <div className="flex items-center gap-2">
          {displayDelta != null && (
            <span
              className="flex items-center gap-1 text-xs font-dm-sans px-1.5 py-0.5"
              style={
                isPositive
                  ? { backgroundColor: 'var(--positive-bg)', color: 'var(--positive-text)' }
                  : isNegative
                  ? { backgroundColor: 'var(--negative-bg)', color: 'var(--negative-text)' }
                  : { backgroundColor: 'var(--neutral-badge-bg)', color: 'var(--text-secondary)' }
              }
            >
              {isPositive && <TrendingUp size={10} />}
              {isNegative && <TrendingDown size={10} />}
              {displayDelta > 0 ? '+' : ''}{displayDelta.toFixed(1)}%
            </span>
          )}
          {sub && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</span>}
        </div>
      )}
    </div>
  );
}
