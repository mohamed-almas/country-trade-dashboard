import { useState, useEffect, useRef, useMemo } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../lib/supabase';
import { useTradeDataContext } from '../lib/TradeDataContext';
import { SearchableDropdown } from '../components/SearchableDropdown';
import { KPICard } from '../components/KPICard';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { Sparkline } from '../components/Sparkline';
import { CAGRBadge } from '../components/CAGRBadge';
import { formatNumber, calculateCAGR } from '../lib/utils';

interface CommodityAnalysisProps {
  selectedYear: number | 'all';
  metricType: 'value' | 'volume';
}

const ALL_SENTINEL = '__ALL__';
const ALL_LABEL = '— All —';
const TREND_YEARS = [2020, 2021, 2022, 2023, 2024];

function buildPerRowCagr(rows: any[], rows2020: any[], rows2024: any[], keyField: string): any[] {
  const map2020: Record<string, number> = {};
  const map2024: Record<string, number> = {};
  for (const r of rows2020) map2020[r[keyField]] = r.total_value || 0;
  for (const r of rows2024) map2024[r[keyField]] = r.total_value || 0;

  const trendMap: Record<string, number[]> = {};
  for (const r of rows) {
    if (!trendMap[r[keyField]]) trendMap[r[keyField]] = [];
    trendMap[r[keyField]].push(r.total_value || 0);
  }

  return rows.map((row) => {
    const v2020 = map2020[row[keyField]] ?? 0;
    const v2024 = map2024[row[keyField]] ?? 0;
    const cagr = calculateCAGR(v2020, v2024, 4);
    const trend = trendMap[row[keyField]] ?? [];
    return { ...row, cagr, trend };
  });
}

export function CommodityAnalysis({ selectedYear, metricType }: CommodityAnalysisProps) {
  const { l1Cache, l1CacheReady } = useTradeDataContext();

  const [initLoading, setInitLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState(false);

  const [commodityList, setCommodityList] = useState<any[]>([]);
  const [l1Options, setL1Options] = useState<string[]>([]);
  const [l2Options, setL2Options] = useState<{ label: string; value: string }[]>([]);

  const [selectedL1, setSelectedL1] = useState('');
  const [selectedL2, setSelectedL2] = useState<string>(ALL_SENTINEL);

  const [kpis, setKpis] = useState<any>(null);
  const [yearlyData, setYearlyData] = useState<any[]>([]);
  const [exporterData, setExporterData] = useState<any[]>([]);
  const [importerData, setImporterData] = useState<any[]>([]);

  const prevL1Ref = useRef<string>('');

  useEffect(() => {
    fetchCommodityList();
  }, []);

  useEffect(() => {
    if (!selectedL1 || commodityList.length === 0) return;

    const l2s = commodityList
      .filter((c) => c.adpg_level_1 === selectedL1)
      .map((c) => c.adpg_level_2 as string);
    const uniqueL2s = Array.from(new Set(l2s)).sort();

    const options = [
      { label: ALL_LABEL, value: ALL_SENTINEL },
      ...uniqueL2s.map((l2) => ({ label: l2, value: l2 })),
    ];
    setL2Options(options);

    if (prevL1Ref.current !== selectedL1) {
      prevL1Ref.current = selectedL1;
      setSelectedL2(ALL_SENTINEL);
    }
  }, [selectedL1, commodityList]);

  useEffect(() => {
    if (!selectedL1 || !selectedL2) return;
    fetchCommodityData();
  }, [selectedL1, selectedL2, selectedYear, l1CacheReady]);

  const fetchCommodityList = async () => {
    setInitLoading(true);
    setError(false);
    try {
      const { data: list } = await supabase.rpc('get_commodity_list', {});
      setCommodityList(list || []);

      const l1s: string[] = Array.from(new Set((list || []).map((c: any) => c.adpg_level_1 as string))).sort();
      setL1Options(l1s);

      const defaultL1 = l1s.includes('Machines') ? 'Machines' : l1s[0];
      prevL1Ref.current = defaultL1;
      setSelectedL1(defaultL1);
      setSelectedL2(ALL_SENTINEL);
    } catch (err) {
      console.error('Error loading commodity list:', err);
      setError(true);
    } finally {
      setInitLoading(false);
    }
  };

  const fetchCommodityData = async () => {
    if (!l1CacheReady && selectedL2 === ALL_SENTINEL) return;

    setDataLoading(true);
    setError(false);

    try {
      const year = selectedYear === 'all' ? null : selectedYear;

      if (selectedL2 === ALL_SENTINEL) {
        const trendLine = TREND_YEARS.map((y) => {
          const cacheRow = (l1Cache[String(y)] ?? []).find((r: any) => r.adpg_level_1 === selectedL1);
          return {
            year: y,
            total_value: cacheRow?.total_value || 0,
            total_volume: cacheRow?.total_volume || 0,
          };
        });

        const [exporterRes, exporterRes2020, exporterRes2024, importerRes, importerRes2020, importerRes2024] =
          await Promise.all([
            supabase.rpc('get_top_exporters', { p_year: year, p_limit: 10 }).then(r => r.data),
            supabase.rpc('get_top_exporters', { p_year: 2020, p_limit: 10 }).then(r => r.data),
            supabase.rpc('get_top_exporters', { p_year: 2024, p_limit: 10 }).then(r => r.data),
            supabase.rpc('get_top_importers', { p_year: year, p_limit: 10 }).then(r => r.data),
            supabase.rpc('get_top_importers', { p_year: 2020, p_limit: 10 }).then(r => r.data),
            supabase.rpc('get_top_importers', { p_year: 2024, p_limit: 10 }).then(r => r.data),
          ]);

        setYearlyData(trendLine);

        const totalValue = (exporterRes as any[]).reduce((sum, r) => sum + (r.total_value || 0), 0);
        const topExporter = (exporterRes as any[])[0] || null;
        const topImporter = (importerRes as any[])[0] || null;

        setKpis({
          totalValue,
          topExporter: topExporter?.exporter || 'N/A',
          topExporterValue: topExporter?.total_value || 0,
          topImporter: topImporter?.importer || 'N/A',
          topImporterValue: topImporter?.total_value || 0,
        });

        const trendValues = trendLine.map((r) => r.total_value);
        setExporterData(
          buildPerRowCagr(exporterRes as any[], exporterRes2020 as any[], exporterRes2024 as any[], 'exporter').map(
            (row) => ({ ...row, trend: trendValues })
          )
        );
        setImporterData(
          buildPerRowCagr(importerRes as any[], importerRes2020 as any[], importerRes2024 as any[], 'importer').map(
            (row) => ({ ...row, trend: trendValues })
          )
        );
      } else {
        let yearlyRes: any[] = [];
        let exporterRes: any[] = [];
        let importerRes: any[] = [];
        let exporterRes2020: any[] = [];
        let exporterRes2024: any[] = [];
        let importerRes2020: any[] = [];
        let importerRes2024: any[] = [];

        const results = await Promise.allSettled([
          supabase.rpc('get_commodity_by_year', { p_level_2: selectedL2 }).then(r => r.data),
          supabase.rpc('get_commodity_exporters', { p_level_2: selectedL2, p_year: year, p_limit: 10 }).then(r => r.data),
          supabase.rpc('get_commodity_importers', { p_level_2: selectedL2, p_year: year, p_limit: 10 }).then(r => r.data),
          supabase.rpc('get_commodity_exporters', { p_level_2: selectedL2, p_year: 2020, p_limit: 10 }).then(r => r.data),
          supabase.rpc('get_commodity_exporters', { p_level_2: selectedL2, p_year: 2024, p_limit: 10 }).then(r => r.data),
          supabase.rpc('get_commodity_importers', { p_level_2: selectedL2, p_year: 2020, p_limit: 10 }).then(r => r.data),
          supabase.rpc('get_commodity_importers', { p_level_2: selectedL2, p_year: 2024, p_limit: 10 }).then(r => r.data),
        ]);

        const allFailed = results.every((r) => r.status === 'rejected');
        if (allFailed) {
          setError(true);
          setDataLoading(false);
          return;
        }

        if (results[0].status === 'fulfilled') yearlyRes = results[0].value as any[];
        if (results[1].status === 'fulfilled') exporterRes = results[1].value as any[];
        if (results[2].status === 'fulfilled') importerRes = results[2].value as any[];
        if (results[3].status === 'fulfilled') exporterRes2020 = results[3].value as any[];
        if (results[4].status === 'fulfilled') exporterRes2024 = results[4].value as any[];
        if (results[5].status === 'fulfilled') importerRes2020 = results[5].value as any[];
        if (results[6].status === 'fulfilled') importerRes2024 = results[6].value as any[];

        setYearlyData(yearlyRes);

        const totalValue = yearlyRes.reduce((sum, r) => sum + (r.total_value || 0), 0);
        const topExporter = exporterRes[0] || null;
        const topImporter = importerRes[0] || null;

        setKpis({
          totalValue,
          topExporter: topExporter?.exporter || 'N/A',
          topExporterValue: topExporter?.total_value || 0,
          topImporter: topImporter?.importer || 'N/A',
          topImporterValue: topImporter?.total_value || 0,
        });

        const trendValues = yearlyRes.map((r) => r.total_value);
        setExporterData(
          buildPerRowCagr(exporterRes, exporterRes2020, exporterRes2024, 'exporter').map((row) => ({
            ...row,
            trend: trendValues,
          }))
        );
        setImporterData(
          buildPerRowCagr(importerRes, importerRes2020, importerRes2024, 'importer').map((row) => ({
            ...row,
            trend: trendValues,
          }))
        );
      }
    } catch (err) {
      console.error('Error fetching commodity data:', err);
      setError(true);
    } finally {
      setDataLoading(false);
    }
  };

  if (initLoading) return <LoadingState height="h-screen" />;
  if (error) return <ErrorState onRetry={() => { setError(false); fetchCommodityData(); }} />;

  const displayField = metricType === 'value' ? 'total_value' : 'total_volume';
  const axisLabel = metricType === 'value' ? 'USD k' : 'mT';

  return (
    <div className="flex gap-8">
      <div className="w-52 flex-shrink-0 space-y-6">
        <div>
          <label className="block text-xs mb-2 font-dm-sans font-semibold" style={{ color: 'var(--text-secondary)' }}>
            L1 Commodity
          </label>
          <SearchableDropdown
            options={l1Options}
            value={selectedL1}
            onChange={setSelectedL1}
            placeholder="Select L1"
          />
        </div>

        <div>
          <label className="block text-xs mb-2 font-dm-sans font-semibold" style={{ color: 'var(--text-secondary)' }}>
            L2 Commodity
          </label>
          <SearchableDropdown
            options={l2Options.map((o) => o.label)}
            value={l2Options.find((o) => o.value === selectedL2)?.label ?? ALL_LABEL}
            onChange={(label) => {
              const match = l2Options.find((o) => o.label === label);
              setSelectedL2(match?.value ?? ALL_SENTINEL);
            }}
            placeholder="Select L2"
          />
        </div>
      </div>

      <div className="flex-1 space-y-8 overflow-auto">
        {dataLoading ? (
          <LoadingState height="h-96" />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-6">
              <KPICard
                label={`Global Trade ${metricType === 'value' ? 'Value' : 'Volume'}`}
                value={kpis?.totalValue || 0}
                unit={axisLabel}
              />
              <KPICard
                label="Top Exporter"
                value={`${kpis?.topExporter} (${formatNumber(kpis?.topExporterValue || 0)})`}
              />
              <KPICard
                label="Top Importer"
                value={`${kpis?.topImporter} (${formatNumber(kpis?.topImporterValue || 0)})`}
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div
                className="border p-6"
                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
              >
                <h3 className="text-sm font-outfit font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                  Global {metricType === 'value' ? 'Value' : 'Volume'} Trend 2020–2024
                </h3>
                <p className="text-xs font-dm-sans mb-4" style={{ color: 'var(--text-muted)' }}>{axisLabel}</p>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={yearlyData}>
                    <defs>
                      <linearGradient id="colorCommodity" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--chart-bar)" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="var(--chart-bar)" stopOpacity={0} />
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
                      tickFormatter={(v) => formatNumber(v)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--tooltip-bg)',
                        border: '1px solid var(--border)',
                      }}
                      labelStyle={{ color: 'var(--text-primary)', fontFamily: 'DM Sans' }}
                      itemStyle={{ color: 'var(--chart-bar)', fontFamily: 'DM Mono' }}
                      formatter={(v: any) => [formatNumber(v), axisLabel]}
                    />
                    <Area
                      type="monotone"
                      dataKey={displayField}
                      stroke="var(--chart-bar)"
                      strokeWidth={2}
                      fill="url(#colorCommodity)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div
                className="border p-6"
                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
              >
                <h3 className="text-sm font-outfit font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                  Top Exporters
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={exporterData} layout="vertical" margin={{ left: 100, right: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                    <XAxis
                      type="number"
                      stroke="var(--text-secondary)"
                      tick={{ fontSize: 11, fontFamily: 'DM Mono', fill: 'var(--text-secondary)' }}
                      tickFormatter={(v) => formatNumber(v)}
                    />
                    <YAxis
                      type="category"
                      dataKey="exporter"
                      stroke="var(--text-secondary)"
                      tick={{ fontSize: 11, fontFamily: 'DM Sans', fill: 'var(--text-secondary)' }}
                      width={95}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--tooltip-bg)',
                        border: '1px solid var(--border)',
                      }}
                      labelStyle={{ color: 'var(--text-primary)', fontFamily: 'DM Sans' }}
                      itemStyle={{ color: 'var(--chart-bar)', fontFamily: 'DM Mono' }}
                      formatter={(v: any) => [formatNumber(v), axisLabel]}
                    />
                    <Bar dataKey={displayField} fill="var(--chart-bar)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div
                className="border"
                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
              >
                <div className="p-6 border-b" style={{ borderColor: 'var(--border)' }}>
                  <h3 className="text-sm font-outfit font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Top Exporters
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                        <th className="text-left px-4 py-3 text-xs font-dm-sans font-semibold" style={{ color: 'var(--text-secondary)' }}>Rank</th>
                        <th className="text-left px-4 py-3 text-xs font-dm-sans font-semibold" style={{ color: 'var(--text-secondary)' }}>Country</th>
                        <th className="text-right px-4 py-3 text-xs font-dm-sans font-semibold" style={{ color: 'var(--text-secondary)' }}>
                          {metricType === 'value' ? 'Value' : 'Volume'}
                        </th>
                        <th className="text-center px-4 py-3 text-xs font-dm-sans font-semibold" style={{ color: 'var(--text-secondary)' }}>CAGR</th>
                        <th className="text-left px-4 py-3 text-xs font-dm-sans font-semibold" style={{ color: 'var(--text-secondary)' }}>Trend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exporterData.map((exp, index) => (
                        <tr
                          key={exp.exporter}
                          style={{
                            backgroundColor: index % 2 === 0 ? 'var(--bg-secondary)' : 'var(--table-row-alt)',
                          }}
                        >
                          <td className="px-4 py-3 text-sm font-dm-mono" style={{ color: 'var(--text-primary)' }}>{index + 1}</td>
                          <td className="px-4 py-3 text-sm font-dm-sans" style={{ color: 'var(--text-primary)' }}>{exp.exporter}</td>
                          <td className="px-4 py-3 text-sm font-dm-mono text-right" style={{ color: 'var(--text-primary)' }}>
                            {formatNumber(metricType === 'value' ? exp.total_value : (exp.total_volume || 0))}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <CAGRBadge cagr={exp.cagr} />
                          </td>
                          <td className="px-4 py-3">
                            <Sparkline data={exp.trend} color="var(--chart-bar)" />
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
                    Top Importers
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                        <th className="text-left px-4 py-3 text-xs font-dm-sans font-semibold" style={{ color: 'var(--text-secondary)' }}>Rank</th>
                        <th className="text-left px-4 py-3 text-xs font-dm-sans font-semibold" style={{ color: 'var(--text-secondary)' }}>Country</th>
                        <th className="text-right px-4 py-3 text-xs font-dm-sans font-semibold" style={{ color: 'var(--text-secondary)' }}>
                          {metricType === 'value' ? 'Value' : 'Volume'}
                        </th>
                        <th className="text-center px-4 py-3 text-xs font-dm-sans font-semibold" style={{ color: 'var(--text-secondary)' }}>CAGR</th>
                        <th className="text-left px-4 py-3 text-xs font-dm-sans font-semibold" style={{ color: 'var(--text-secondary)' }}>Trend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importerData.map((imp, index) => (
                        <tr
                          key={imp.importer}
                          style={{
                            backgroundColor: index % 2 === 0 ? 'var(--bg-secondary)' : 'var(--table-row-alt)',
                          }}
                        >
                          <td className="px-4 py-3 text-sm font-dm-mono" style={{ color: 'var(--text-primary)' }}>{index + 1}</td>
                          <td className="px-4 py-3 text-sm font-dm-sans" style={{ color: 'var(--text-primary)' }}>{imp.importer}</td>
                          <td className="px-4 py-3 text-sm font-dm-mono text-right" style={{ color: 'var(--text-primary)' }}>
                            {formatNumber(metricType === 'value' ? imp.total_value : (imp.total_volume || 0))}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <CAGRBadge cagr={imp.cagr} />
                          </td>
                          <td className="px-4 py-3">
                            <Sparkline data={imp.trend} color="#66BFEE" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
