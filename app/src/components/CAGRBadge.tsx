interface CAGRBadgeProps {
  cagr: number | null;
}

export function CAGRBadge({ cagr }: CAGRBadgeProps) {
  if (cagr === null) {
    return (
      <span
        className="px-2 py-0.5 text-xs font-dm-mono"
        style={{ backgroundColor: 'var(--neutral-badge-bg)', color: 'var(--text-secondary)' }}
      >
        N/A
      </span>
    );
  }

  const isHigh = cagr >= 3;
  const isMedium = cagr >= 0 && cagr < 3;
  const isLow = cagr < 0;

  const style = isHigh
    ? { backgroundColor: 'var(--positive-bg)', color: 'var(--positive-text)' }
    : isMedium
    ? { backgroundColor: 'var(--medium-badge-bg)', color: 'var(--medium-badge-text)' }
    : isLow
    ? { backgroundColor: 'var(--negative-bg)', color: 'var(--negative-text)' }
    : { backgroundColor: 'var(--neutral-badge-bg)', color: 'var(--text-secondary)' };

  return (
    <span className="px-2 py-0.5 text-xs font-dm-mono" style={style}>
      {cagr > 0 ? '+' : ''}{cagr.toFixed(1)}%
    </span>
  );
}
