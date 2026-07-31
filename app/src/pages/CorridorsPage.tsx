import { useMemo, useState } from 'react';
import { useMetric } from '../lib/MetricContext';
import { PageShell, Card, SectionTitle } from '../components/PageShell';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { useTopCorridors } from '../hooks/useTradeData';
import { formatCurrency, formatVolume, formatPercentage } from '../utils/formatters';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

type SortField = 'rank' | 'exporter' | 'importer' | 'exporter_region' | 'importer_region' | 'value' | 'volume' | 'yoy';
type SortDirection = 'asc' | 'desc';

export function CorridorsPage() {
  const { metric } = useMetric();
  const [sortField, setSortField] = useState<SortField>('value');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const { data: corridors, isLoading, error } = useTopCorridors(2024, 20);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedCorridors = useMemo(() => {
    if (!corridors) return [];

    const sorted = [...corridors].sort((a: any, b: any) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'exporter':
          aValue = a.exporter || '';
          bValue = b.exporter || '';
          break;
        case 'importer':
          aValue = a.importer || '';
          bValue = b.importer || '';
          break;
        case 'exporter_region':
          aValue = a.exporter_region || '';
          bValue = b.exporter_region || '';
          break;
        case 'importer_region':
          aValue = a.importer_region || '';
          bValue = b.importer_region || '';
          break;
        case 'value':
          aValue = a.total_value || 0;
          bValue = b.total_value || 0;
          break;
        case 'volume':
          aValue = a.total_volume || 0;
          bValue = b.total_volume || 0;
          break;
        case 'yoy':
          aValue = a.yoy_pct || 0;
          bValue = b.yoy_pct || 0;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return sorted;
  }, [corridors, sortField, sortDirection]);

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={(error as Error).message} />;

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={12} style={{ opacity: 0.3 }} />;
    return sortDirection === 'asc'
      ? <ArrowUp size={12} />
      : <ArrowDown size={12} />;
  };

  return (
    <PageShell>
      <SectionTitle
        title="Top Trade Corridors"
        subtitle={`Top 20 bilateral corridors for 2024`}
      />

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th className="text-left py-3 px-3 font-outfit font-semibold" style={{ color: 'var(--text-primary)' }}>
                  <button
                    onClick={() => handleSort('rank')}
                    className="flex items-center gap-2 hover:opacity-80"
                  >
                    Rank
                  </button>
                </th>
                <th className="text-left py-3 px-3 font-outfit font-semibold" style={{ color: 'var(--text-primary)' }}>
                  <button
                    onClick={() => handleSort('exporter')}
                    className="flex items-center gap-2 hover:opacity-80"
                  >
                    Exporter <SortIcon field="exporter" />
                  </button>
                </th>
                <th className="text-left py-3 px-3 font-outfit font-semibold" style={{ color: 'var(--text-primary)' }}>
                  <button
                    onClick={() => handleSort('exporter_region')}
                    className="flex items-center gap-2 hover:opacity-80"
                  >
                    Exp. Region <SortIcon field="exporter_region" />
                  </button>
                </th>
                <th className="text-left py-3 px-3 font-outfit font-semibold" style={{ color: 'var(--text-primary)' }}>
                  <button
                    onClick={() => handleSort('importer')}
                    className="flex items-center gap-2 hover:opacity-80"
                  >
                    Importer <SortIcon field="importer" />
                  </button>
                </th>
                <th className="text-left py-3 px-3 font-outfit font-semibold" style={{ color: 'var(--text-primary)' }}>
                  <button
                    onClick={() => handleSort('importer_region')}
                    className="flex items-center gap-2 hover:opacity-80"
                  >
                    Imp. Region <SortIcon field="importer_region" />
                  </button>
                </th>
                <th className="text-right py-3 px-3 font-outfit font-semibold" style={{ color: 'var(--text-primary)' }}>
                  <button
                    onClick={() => handleSort('value')}
                    className="flex items-center gap-2 hover:opacity-80 ml-auto"
                  >
                    Value <SortIcon field="value" />
                  </button>
                </th>
                <th className="text-right py-3 px-3 font-outfit font-semibold" style={{ color: 'var(--text-primary)' }}>
                  <button
                    onClick={() => handleSort('volume')}
                    className="flex items-center gap-2 hover:opacity-80 ml-auto"
                  >
                    Volume <SortIcon field="volume" />
                  </button>
                </th>
                <th className="text-right py-3 px-3 font-outfit font-semibold" style={{ color: 'var(--text-primary)' }}>
                  <button
                    onClick={() => handleSort('yoy')}
                    className="flex items-center gap-2 hover:opacity-80 ml-auto"
                  >
                    YoY % <SortIcon field="yoy" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedCorridors.map((corridor: any, index: number) => {
                const value = corridor.total_value || 0;
                const volume = corridor.total_volume || 0;
                const yoyPct = corridor.yoy_pct;

                return (
                  <tr
                    key={`${corridor.exporter}-${corridor.importer}`}
                    style={{ borderBottom: '1px solid var(--border)' }}
                    className="hover:bg-opacity-50"
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-elevated)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td className="py-3 px-3 font-dm-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                      {index + 1}
                    </td>
                    <td className="py-3 px-3 font-dm-sans" style={{ color: 'var(--text-primary)' }}>
                      {corridor.exporter}
                    </td>
                    <td className="py-3 px-3 font-dm-sans text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {corridor.exporter_region}
                    </td>
                    <td className="py-3 px-3 font-dm-sans" style={{ color: 'var(--text-primary)' }}>
                      {corridor.importer}
                    </td>
                    <td className="py-3 px-3 font-dm-sans text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {corridor.importer_region}
                    </td>
                    <td className="py-3 px-3 text-right font-dm-mono" style={{ color: 'var(--text-primary)' }}>
                      {formatCurrency(value)}
                    </td>
                    <td className="py-3 px-3 text-right font-dm-mono" style={{ color: 'var(--text-primary)' }}>
                      {formatVolume(volume)}
                    </td>
                    <td className="py-3 px-3 text-right font-dm-mono" style={{
                      color: yoyPct > 0 ? '#10B981' : yoyPct < 0 ? '#EF4444' : 'var(--text-secondary)'
                    }}>
                      {formatPercentage(yoyPct)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </PageShell>
  );
}
