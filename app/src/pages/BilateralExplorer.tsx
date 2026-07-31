import { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SearchableDropdown } from '../components/SearchableDropdown';
import { KPICard } from '../components/KPICard';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { formatNumber, COUNTRIES } from '../lib/utils';

interface BilateralExplorerProps {
  selectedYear: number | 'all';
  metricType: 'value' | 'volume';
}

export function BilateralExplorer({ selectedYear, metricType }: BilateralExplorerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [exporter, setExporter] = useState('United Arab Emirates');
  const [importer, setImporter] = useState('India');
  const [kpis, setKpis] = useState<any>(null);
  const [yearlyData, setYearlyData] = useState<any[]>([]);
  const [allCommodityData, setAllCommodityData] = useState<any[]>([]);

  useEffect(() => {
    if (exporter && importer) {
      fetchData();
    }
  }, [exporter, importer, selectedYear]);

  const fetchData = async () => {
    setLoading(true);
    setError(false);

    try {
      const { data: yearlyRes } = await supabase.rpc('get_bilateral_by_year', { p_exporter: exporter, p_importer: importer });
      setYearlyData(yearlyRes || []);

      const year = selectedYear === 'all' ? null : selectedYear;
      const { data: commodityRes } = await supabase.rpc('get_bilateral_commodities', {
        p_exporter: exporter,
        p_importer: importer,
        p_year: year,
      });
      setAllCommodityData(commodityRes as any[] || []);

      const currentYearData = year
        ? yearlyRes.find((r: any) => r.year === year)
        : yearlyRes.reduce(
            (acc: any, r: any) => ({
              total_value: acc.total_value + r.total_value,
              total_volume: acc.total_volume + r.total_volume,
            }),
            { total_value: 0, total_volume: 0 }
          );

      const distinctCommodities = new Set((commodityRes as any[]).map((c: any) => c.adpg_level_2)).size;

      setKpis({
        totalValue: currentYearData?.total_value || 0,
        totalVolume: currentYearData?.total_volume || 0,
        commodityCount: distinctCommodities,
      });
    } catch (err) {
      console.error('Error fetching bilateral data:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const chartTitle = metricType === 'value' ? 'Trade Value by Year' : 'Trade Volume by Year';
  const chartDataKey = metricType === 'value' ? 'total_value' : 'total_volume';
  const axisLabel = metricType === 'value' ? 'USD k' : 'mT';

  const topTenCommodities = useMemo(() => {
    const field = metricType === 'value' ? 'total_value' : 'total_volume';
    return [...allCommodityData].sort((a, b) => (b[field] || 0) - (a[field] || 0)).slice(0, 10);
  }, [allCommodityData, metricType]);

  const groupedCommodities = useMemo(() => {
    const field = metricType === 'value' ? 'total_value' : 'total_volume';
    const totalAll = allCommodityData.reduce((sum, r) => sum + (r[field] || 0), 0);

    const groups: Record<string, any[]> = {};
    for (const row of allCommodityData) {
      const l1 = row.adpg_level_1 as string;
      if (!groups[l1]) groups[l1] = [];
      groups[l1].push(row);
    }

    return Object.entries(groups)
      .map(([l1, rows]) => {
        const sorted = [...rows].sort((a, b) => (b[field] || 0) - (a[field] || 0));
        const groupTotal = sorted.reduce((sum, r) => sum + (r[field] || 0), 0);
        return { l1, rows: sorted, groupTotal };
      })
      .sort((a, b) => b.groupTotal - a.groupTotal)
      .map(({ l1, rows }) => ({
        l1,
        rows: rows.map((r) => ({
          ...r,
          sharePct: totalAll > 0 ? ((r[field] || 0) / totalAll) * 100 : 0,
        })),
      }));
  }, [allCommodityData, metricType]);

  if (error) return <ErrorState onRetry={fetchData} />;

  return (
    <div className="space-y-8">
      <div className="flex gap-4 items-center">
        <div className="flex-1 max-w-xs">
          <SearchableDropdown options={COUNTRIES} value={exporter} onChange={setExporter} placeholder="Select exporter" />
        </div>
        <ArrowRight size={20} style={{ color: 'var(--text-secondary)' }} />
        <div className="flex-1 max-w-xs">
          <SearchableDropdown options={COUNTRIES} value={importer} onChange={setImporter} placeholder="Select importer" />
        </div>
      </div>

      {loading ? (
        <LoadingState height="h-96" />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-6">
            <KPICard
              label={`Total ${metricType === 'value' ? 'Export Value' : 'Export Volume'}`}
              value={metricType === 'value' ? (kpis?.totalValue || 0) : (kpis?.totalVolume || 0)}
              unit={axisLabel}
            />
            <KPICard
              label={metricType === 'value' ? 'Total Volume' : 'Total Value'}
              value={metricType === 'value' ? (kpis?.totalVolume || 0) : (kpis?.totalValue || 0)}
              unit={metricType === 'value' ? 'mT' : 'USD k'}
            />
            <KPICard label="Commodity Categories" value={kpis?.commodityCount || 0} />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div
              className="border p-6"
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
            >
              <h3 className="text-sm font-outfit font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                {chartTitle}
              </h3>
              <p className="text-xs font-dm-sans mb-4" style={{ color: 'var(--text-muted)' }}>{axisLabel}</p>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={yearlyData}>
                  <defs>
                    <linearGradient id="colorBilateral" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                  <XAxis
                    dataKey="year"
                    stroke="var(--text-secondary)"
                    tick={{ fontSize: 11, fontFamily: 'DM Mono', fill: 'var(--text-secondary)' }}
                  />
                  <YAxis
                    stroke="var(--text-secondary)"
                    tick={{ fontSize: 11, fontFamily: 'DM Mono', fill: 'var(--text-secondary)' }}
                    tickFormatter={(value) => formatNumber(value)}
                    label={{ value: axisLabel, angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 10, fontFamily: 'DM Mono' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--tooltip-bg)',
                      border: '1px solid var(--border)',
                    }}
                    labelStyle={{ color: 'var(--text-primary)', fontFamily: 'DM Sans' }}
                    itemStyle={{ color: 'var(--accent)', fontFamily: 'DM Mono' }}
                    formatter={(value: any) => [formatNumber(value), axisLabel]}
                  />
                  <Area
                    type="monotone"
                    dataKey={chartDataKey}
                    stroke="var(--accent)"
                    strokeWidth={2}
                    fill="url(#colorBilateral)"
                    dot={{ fill: 'var(--accent)', r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div
              className="border p-6"
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
            >
              <h3 className="text-sm font-outfit font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                Top 10 Commodities
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topTenCommodities} layout="vertical" margin={{ left: 120, right: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                  <XAxis
                    type="number"
                    stroke="var(--text-secondary)"
                    tick={{ fontSize: 11, fontFamily: 'DM Mono', fill: 'var(--text-secondary)' }}
                    tickFormatter={(value) => formatNumber(value)}
                  />
                  <YAxis
                    type="category"
                    dataKey="adpg_level_2"
                    stroke="var(--text-secondary)"
                    tick={{ fontSize: 10, fontFamily: 'DM Sans', fill: 'var(--text-secondary)' }}
                    width={115}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--tooltip-bg)',
                      border: '1px solid var(--border)',
                    }}
                    labelStyle={{ color: 'var(--text-primary)', fontFamily: 'DM Sans' }}
                    itemStyle={{ color: 'var(--chart-bar)', fontFamily: 'DM Mono' }}
                    formatter={(value: any) => [formatNumber(value), axisLabel]}
                  />
                  <Bar dataKey={metricType === 'value' ? 'total_value' : 'total_volume'} fill="var(--chart-bar)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div
            className="border"
            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
          >
            <div className="p-6 border-b" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-sm font-outfit font-semibold" style={{ color: 'var(--text-primary)' }}>
                Commodity Detail
              </h3>
            </div>
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full">
                <thead
                  className="sticky top-0 z-10"
                  style={{ backgroundColor: 'var(--bg-primary)' }}
                >
                  <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                    <th className="text-left px-4 py-3 text-xs font-dm-sans font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      ADPG Level 2
                    </th>
                    <th
                      className="text-right px-4 py-3 text-xs font-dm-sans font-semibold"
                      style={{ color: metricType === 'value' ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                    >
                      Value (USD k)
                    </th>
                    <th
                      className="text-right px-4 py-3 text-xs font-dm-sans font-semibold"
                      style={{ color: metricType === 'volume' ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                    >
                      Volume (mT)
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-dm-sans font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      Share %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {groupedCommodities.map(({ l1, rows }) => (
                    <>
                      <tr
                        key={`header-${l1}`}
                        className="border-t"
                        style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
                      >
                        <td
                          colSpan={4}
                          className="px-4 py-2 text-xs font-outfit font-semibold uppercase tracking-wider"
                          style={{ color: 'var(--accent)' }}
                        >
                          {l1}
                        </td>
                      </tr>
                      {rows.map((row, idx) => (
                        <tr
                          key={`${l1}-${row.adpg_level_2}-${idx}`}
                          style={{
                            backgroundColor: idx % 2 === 0 ? 'var(--table-row-alt)' : 'var(--bg-primary)',
                          }}
                        >
                          <td className="px-4 py-2.5 text-sm font-dm-sans pl-7" style={{ color: 'var(--text-primary)' }}>
                            {row.adpg_level_2}
                          </td>
                          <td
                            className="px-4 py-2.5 text-sm font-dm-mono text-right"
                            style={{ color: metricType === 'value' ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                          >
                            {formatNumber(row.total_value || 0)}
                          </td>
                          <td
                            className="px-4 py-2.5 text-sm font-dm-mono text-right"
                            style={{ color: metricType === 'volume' ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                          >
                            {formatNumber(row.total_volume || 0)}
                          </td>
                          <td className="px-4 py-2.5 text-sm font-dm-mono text-right" style={{ color: 'var(--text-secondary)' }}>
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 h-1" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                                <div
                                  className="h-1"
                                  style={{
                                    width: `${Math.min(row.sharePct * 3, 100)}%`,
                                    backgroundColor: 'var(--chart-bar)',
                                  }}
                                />
                              </div>
                              <span>{row.sharePct.toFixed(1)}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
