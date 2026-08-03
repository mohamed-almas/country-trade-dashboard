export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return 'N/A';
  const absValue = Math.abs(value);

  if (absValue >= 1_000_000_000_000) {
    return `${(value / 1_000_000_000_000).toFixed(1)} Tn`;
  }
  if (absValue >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)} Bn`;
  }
  if (absValue >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)} Mn`;
  }
  if (absValue >= 1_000) {
    return `${(value / 1_000).toFixed(1)} K`;
  }
  return value.toFixed(1);
}

export function formatPercentage(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return 'N/A';
  return `${value.toFixed(1)}%`;
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return 'N/A';
  return `$${formatNumber(value)}`;
}

export function formatVolume(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return 'N/A';
  const absValue = Math.abs(value);

  if (absValue >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)} Bn Tons`;
  }
  if (absValue >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)} Mn Tons`;
  }
  if (absValue >= 1_000) {
    return `${(value / 1_000).toFixed(1)} K Tons`;
  }
  return `${value.toFixed(1)} Tons`;
}

export function formatCompactNumber(value: number | null | undefined): string {
  return formatNumber(value);
}
