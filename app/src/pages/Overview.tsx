import { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../lib/supabase';
import { KPICard } from '../components/KPICard';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { formatNumber } from '../lib/utils';

interface OverviewProps {
  selectedYear: number | 'all';
  metricType: 'value' | 'volume';
}

export function Overview({ selectedYear, metricType }: OverviewProps) {
  const [commodityData, setCommodityData] = useState<any[]>([]);
  const [corridorData, setCorridorData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);

    const year = selectedYear === 'all' ? null : selectedYear;

    Promise.all([
      supabase.rpc('get_trade_by_l1', { p_year: year }),
      supabase.rpc('get_trade_trends', { p_limit: 20 }),
    ])
      .then(([l1Res, trendsRes]) => {
        setCommodityData(l1Res.data as any[]);
        setCorridorData(trendsRes.data as any[]);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [selectedYear]);

  const sortedCommodityData = useMemo(() => {
    const field = metricType === 'value' ? 'total_value' : 'total_volume';
    return [...commodityData].sort((a, b) => (b[field] || 0) - (a[field] || 0));
  }, [commodityData, metricType]);

  const sortedCorridorData = useMemo(() => {
    const field = metricType === 'value' ? 'total_value' : 'total_volume';
    return [...corridorData].sort((a, b) => (b[field] || 0) - (a[field] || 0));
  }, [corridorData, metricType]);

  const totalValue = useMemo(
    () => commodityData.reduce((sum, row) => sum + (row.total_value || 0), 0),
    [commodityData]
  );

  const topCommodity = useMemo(() => {
    if (sortedCommodityData.length === 0) return 'N/A';
    return sortedCommodityData[0].adpg_level_1;
  }, [sortedCommodityData]);

  if (loading) return <LoadingState height="h-screen" />;
  if (error) return <ErrorState onRetry={() => { setError(false); setLoading(true); }} />;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-3 gap-6">
        <KPICard
          label="Global Trade Value"
          value={totalValue}
          unit="USD k"
        />
        <KPICard label="Top Commodity L1" value={topCommodity} />
        <KPICard label="Total Corridors" value={20} />
      </div>

      <div
        className="border p-6"
        style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
      >
        <h3 className="text-sm font-outfit font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Trade by Commodity
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={sortedCommodityData} layout="vertical" margin={{ left: 120, right: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
            <XAxis
              type="number"
              stroke="var(--text-secondary)"
              tick={{ fontSize: 11, fontFamily: 'DM Mono', fill: 'var(--text-secondary)' }}
              tickFormatter={formatNumber}
              label={{
                value: metricType === 'value' ? 'USD k' : 'mT',
                position: 'insideBottomRight',
                offset: -8,
                fill: 'var(--text-secondary)',
                fontSize: 10,
                fontFamily: 'DM Mono',
              }}
            />
            <YAxis
              type="category"
              dataKey="adpg_level_1"
              stroke="var(--text-secondary)"
              tick={{ fontSize: 11, fontFamily: 'DM Sans', fill: 'var(--text-secondary)' }}
              width={115}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--tooltip-bg)',
                border: '1px solid var(--border)',
              }}
              labelStyle={{ color: 'var(--text-primary)', fontFamily: 'DM Sans' }}
              itemStyle={{ color: 'var(--chart-bar)', fontFamily: 'DM Mono' }}
              formatter={(value: any) => [formatNumber(value), metricType === 'value' ? 'USD k' : 'mT']}
            />
            <Bar dataKey={metricType === 'value' ? 'total_value' : 'total_volume'} fill="var(--chart-bar)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div
        className="border"
        style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
      >
        <div className="p-6 border-b" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-sm font-outfit font-semibold" style={{ color: 'var(--text-primary)' }}>
            Top Trade Corridors
          </h3>
          <p className="text-xs font-dm-sans mt-1" style={{ color: 'var(--text-muted)' }}>
            2020–2024 cumulative
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                <th className="text-left px-4 py-3 text-xs font-dm-sans font-semibold" style={{ color: 'var(--text-secondary)' }}>Rank</th>
                <th className="text-left px-4 py-3 text-xs font-dm-sans font-semibold" style={{ color: 'var(--text-secondary)' }}>Exporter</th>
                <th className="text-left px-4 py-3 text-xs font-dm-sans font-semibold" style={{ color: 'var(--text-secondary)' }}>Importer</th>
                <th className="text-right px-4 py-3 text-xs font-dm-sans font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  {metricType === 'value' ? 'Value (USD k)' : 'Volume (mT)'}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedCorridorData.map((corridor, index) => (
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
