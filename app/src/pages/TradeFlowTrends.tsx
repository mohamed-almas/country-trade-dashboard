import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { formatNumber } from '../lib/utils';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface TradeFlowTrendsProps {
  selectedYear: number | 'all';
  metricType: 'value' | 'volume';
}

interface CommodityL1 {
  adpg_level_1: string;
  l2_commodities: string[];
  expanded: boolean;
}

export function TradeFlowTrends({ selectedYear, metricType }: TradeFlowTrendsProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [corridorData, setCorridorData] = useState<any[]>([]);
  const [commodityList, setCommodityList] = useState<CommodityL1[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(false);

    try {
      const { data: trendsData } = await supabase.rpc('get_trade_trends', { p_limit: 25 });
      setCorridorData(trendsData || []);

      const { data: commodityRes } = await supabase.rpc('get_commodity_list', {});
      const l1Map = new Map<string, Set<string>>();

      (commodityRes || []).forEach((row: any) => {
        if (!l1Map.has(row.adpg_level_1)) {
          l1Map.set(row.adpg_level_1, new Set());
        }
        l1Map.get(row.adpg_level_1)!.add(row.adpg_level_2);
      });

      const commodities = Array.from(l1Map.entries()).map(([l1, l2Set]) => ({
        adpg_level_1: l1,
        l2_commodities: Array.from(l2Set).sort(),
        expanded: false,
      }));

      commodities.sort((a, b) => a.adpg_level_1.localeCompare(b.adpg_level_1));
      setCommodityList(commodities);
    } catch (err) {
      console.error('Error fetching trade trends:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const toggleL1 = (l1: string) => {
    setCommodityList((prev) =>
      prev.map((item) =>
        item.adpg_level_1 === l1 ? { ...item, expanded: !item.expanded } : item
      )
    );
  };

  if (error) return <ErrorState onRetry={fetchData} />;
  if (loading) return <LoadingState height="h-screen" />;

  return (
    <div className="space-y-8">
      <div
        className="border"
        style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
      >
        <div className="p-6 border-b" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-sm font-outfit font-semibold" style={{ color: 'var(--text-primary)' }}>
            Top Trade Corridors (2020-2024)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                <th className="text-left px-4 py-3 text-xs font-dm-sans font-semibold" style={{ color: 'var(--text-secondary)' }}>Rank</th>
                <th className="text-left px-4 py-3 text-xs font-dm-sans font-semibold" style={{ color: 'var(--text-secondary)' }}>Exporter</th>
                <th className="text-left px-4 py-3 text-xs font-dm-sans font-semibold" style={{ color: 'var(--text-secondary)' }}>Importer</th>
                <th className="text-right px-4 py-3 text-xs font-dm-sans font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  {metricType === 'value' ? 'Total Value (2020-2024)' : 'Total Volume (2020-2024)'}
                </th>
                <th className="text-right px-4 py-3 text-xs font-dm-sans font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  {metricType === 'value' ? 'Volume (mT)' : 'Value (USD k)'}
                </th>
                <th className="text-right px-4 py-3 text-xs font-dm-sans font-semibold" style={{ color: 'var(--text-secondary)' }}>Commodities Traded</th>
              </tr>
            </thead>
            <tbody>
              {corridorData.map((corridor, index) => (
                <tr
                  key={`${corridor.exporter}-${corridor.importer}`}
                  style={{
                    backgroundColor: index % 2 === 0 ? 'var(--bg-secondary)' : 'var(--table-row-alt)',
                  }}
                >
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center justify-center w-6 h-6 text-xs font-dm-mono"
                      style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}
                    >
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-dm-sans" style={{ color: 'var(--text-primary)' }}>
                    {corridor.exporter}
                  </td>
                  <td className="px-4 py-3 text-sm font-dm-sans" style={{ color: 'var(--text-primary)' }}>
                    {corridor.importer}
                  </td>
                  <td className="px-4 py-3 text-sm font-dm-mono text-right" style={{ color: 'var(--text-primary)' }}>
                    {formatNumber(metricType === 'value' ? corridor.total_value : corridor.total_volume)}
                  </td>
                  <td className="px-4 py-3 text-sm font-dm-mono text-right" style={{ color: 'var(--text-primary)' }}>
                    {formatNumber(metricType === 'value' ? corridor.total_volume : corridor.total_value)}
                  </td>
                  <td className="px-4 py-3 text-sm font-dm-mono text-right" style={{ color: 'var(--text-primary)' }}>
                    {corridor.commodity_count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div
        className="border"
        style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
      >
        <div className="p-6 border-b" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-sm font-outfit font-semibold" style={{ color: 'var(--text-primary)' }}>
            Commodity Overview
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-6">
            {commodityList.map((commodity) => (
              <div key={commodity.adpg_level_1} className="space-y-2">
                <div
                  className="cursor-pointer p-3 transition-colors"
                  onClick={() => toggleL1(commodity.adpg_level_1)}
                  style={{ backgroundColor: 'transparent' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-elevated)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {commodity.expanded ? (
                        <ChevronDown size={14} style={{ color: 'var(--text-secondary)' }} />
                      ) : (
                        <ChevronRight size={14} style={{ color: 'var(--text-secondary)' }} />
                      )}
                      <span className="text-sm font-dm-sans font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {commodity.adpg_level_1}
                      </span>
                    </div>
                    <span className="text-xs font-dm-mono" style={{ color: 'var(--text-secondary)' }}>
                      {commodity.l2_commodities.length} commodities
                    </span>
                  </div>
                </div>
                {commodity.expanded && (
                  <div className="pl-8 space-y-1">
                    {commodity.l2_commodities.map((l2) => (
                      <div
                        key={`${commodity.adpg_level_1}-${l2}`}
                        className="text-xs font-dm-sans py-1"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {l2}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
