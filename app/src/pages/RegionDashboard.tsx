import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/ThemeContext';
import { useMetric } from '../lib/MetricContext';
import { useYear } from '../lib/YearContext';
import { LoadingState } from '../components/LoadingState';
import { KPICard } from '../components/KPICard';
import { DonutChart } from '../components/DonutChart';
import { ForecastChart } from '../components/ForecastChart';
import { generateAllForecasts } from '../utils/forecast';
import { formatCurrency, formatVolume } from '../utils/formatters';
import {
  Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ComposedChart, Line,
} from 'recharts';
import { MapPin, TrendingUp, Sparkles, ChevronDown } from 'lucide-react';
import { getChartTheme } from '../utils/chartTheme';

const card = { backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' };
const tp = { color: 'var(--text-primary)' };
const ts = { color: 'var(--text-secondary)' };
const tm = { color: 'var(--text-muted)' };

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4 gap-3">
      <h2 className="text-base font-bold font-outfit" style={tp}>{title}</h2>
      {action}
    </div>
  );
}

function ToggleButton({ label, onClick, isActive }: { label: string; onClick: () => void; isActive?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 text-xs font-semibold transition-colors flex-shrink-0"
      style={{ 
        backgroundColor: isActive ? 'var(--accent)' : 'var(--bg-tertiary)', 
        color: isActive ? 'var(--accent-text)' : 'var(--text-secondary)',
        border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`
      }}
    >
      {label}
    </button>
  );
}

export function RegionDashboard() {
  const { isDark } = useTheme();
  const ct = getChartTheme(isDark);
  const { metric } = useMetric();
  const { year } = useYear();
  const [selectedRegion, setSelectedRegion] = useState<string>('Asia');
  const [showExportForecast, setShowExportForecast] = useState(true);
  const [showPartnerExports, setShowPartnerExports] = useState(true);
  const [showTopCountriesExport, setShowTopCountriesExport] = useState(true);

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: ct.tooltipBg,
      border: `1px solid ${ct.tooltipBorder}`,
      color: ct.tooltipColor,
      fontSize: 12,
    },
  };

  // Fetch available regions from database
  const { data: availableRegions = [] } = useQuery({
    queryKey: ['available_regions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_regional_trade')
        .select('exporter_region')
        .eq('year', 2024)
        .order('exporter_region');
      if (error) throw error;
      return [...new Set((data ?? []).map((r: any) => r.exporter_region as string))].filter(Boolean);
    },
    staleTime: Infinity,
  });

  // All regional_trade rows for selected region
  const { data: allRegionalTrade, isLoading: regionalLoading } = useQuery({
    queryKey: ['regional_trade_all', selectedRegion],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_regional_trade')
        .select('*')
        .or(`exporter_region.eq.${selectedRegion},importer_region.eq.${selectedRegion}`)
        .order('year');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!selectedRegion,
  });

  // Top exporters in region
  const { data: topExporterCountries = [] } = useQuery({
    queryKey: ['region_top_exporters', selectedRegion, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_region_top_exporters')
        .select('country, total_value, total_volume')
        .eq('region', selectedRegion)
        .eq('year', year)
        .order('rank', { ascending: true })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!selectedRegion,
  });

  // Top importers in region
  const { data: topImporterCountries = [] } = useQuery({
    queryKey: ['region_top_importers', selectedRegion, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_region_top_importers')
        .select('country, total_value, total_volume')
        .eq('region', selectedRegion)
        .eq('year', year)
        .order('rank', { ascending: true })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!selectedRegion,
  });

  // Top export commodities by region - using MATERIALIZED VIEW
  const { data: topExportCommodities = [], isLoading: exportCommoditiesLoading } = useQuery({
    queryKey: ['top_export_commodities', selectedRegion, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_region_commodity_export')
        .select('commodity_l2, total_value, total_volume')
        .eq('region', selectedRegion)
        .eq('year', year)
        .order('total_value', { ascending: false })
        .limit(10);
      if (error) {
        console.error('Error fetching export commodities:', error);
        return [];
      }
      return data ?? [];
    },
    enabled: !!selectedRegion,
  });

// Top import commodities by region - using MATERIALIZED VIEW
const { data: topImportCommodities = [], isLoading: importCommoditiesLoading } = useQuery({
  queryKey: ['top_import_commodities', selectedRegion, year],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('mv_region_commodity_import')
      .select('commodity_l2, total_value, total_volume')
      .eq('region', selectedRegion)
      .eq('year', year)
      .order('total_value', { ascending: false })
      .limit(10);
    if (error) {
      console.error('Error fetching import commodities:', error);
      return [];
    }
    return data ?? [];
  },
  enabled: !!selectedRegion,
});

// Top export commodity for card
const { data: topExportCommodityCard = [] } = useQuery({
  queryKey: ['top_export_commodity_card', selectedRegion, year],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('mv_region_commodity_export')
      .select('commodity_l2, total_value')
      .eq('region', selectedRegion)
      .eq('year', year)
      .order('total_value', { ascending: false })
      .limit(1);
    if (error) return [];
    return data ?? [];
  },
  enabled: !!selectedRegion,
});

// Top import commodity for card
const { data: topImportCommodityCard = [] } = useQuery({
  queryKey: ['top_import_commodity_card', selectedRegion, year],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('mv_region_commodity_import')
      .select('commodity_l2, total_value')
      .eq('region', selectedRegion)
      .eq('year', year)
      .order('total_value', { ascending: false })
      .limit(1);
    if (error) return [];
    return data ?? [];
  },
  enabled: !!selectedRegion,
});

  // --- Trend data: aggregate exports/imports per year ---
  const trendData = useMemo(() => {
    if (!allRegionalTrade || allRegionalTrade.length === 0) return [];
    const byYear = new Map<number, { exports: number; imports: number; exportVol: number; importVol: number }>();
    for (const row of allRegionalTrade) {
      if (!byYear.has(row.year)) byYear.set(row.year, { exports: 0, imports: 0, exportVol: 0, importVol: 0 });
      const entry = byYear.get(row.year)!;
      if (row.exporter_region === selectedRegion) {
        entry.exports += row.trade_value;
        entry.exportVol += row.trade_volume;
      }
      if (row.importer_region === selectedRegion) {
        entry.imports += row.trade_value;
        entry.importVol += row.trade_volume;
      }
    }
    const sorted = Array.from(byYear.entries()).sort((a, b) => a[0] - b[0]);
    return sorted.map(([yr, d], i, arr) => {
      const prev = arr[i - 1]?.[1];
      const expVal = metric === 'value' ? d.exports : d.exportVol;
      const impVal = metric === 'value' ? d.imports : d.importVol;
      const prevExp = prev ? (metric === 'value' ? prev.exports : prev.exportVol) : expVal;
      const prevImp = prev ? (metric === 'value' ? prev.imports : prev.importVol) : impVal;
      return {
        year: yr,
        exports: expVal,
        imports: impVal,
        exportGrowth: prev && prevExp > 0 ? ((expVal - prevExp) / prevExp) * 100 : 0,
        importGrowth: prev && prevImp > 0 ? ((impVal - prevImp) / prevImp) * 100 : 0,
      };
    });
  }, [allRegionalTrade, selectedRegion, metric]);

  const currentYearTrend = useMemo(
    () => trendData.find(d => d.year === year) ?? trendData[trendData.length - 1],
    [trendData, year]
  );

  const exportVal = currentYearTrend?.exports ?? 0;
  const importVal = currentYearTrend?.imports ?? 0;
  const exportYoy = currentYearTrend?.exportGrowth ?? 0;
  const importYoy = currentYearTrend?.importGrowth ?? 0;

  const { exportCagr, importCagr } = useMemo(() => {
    if (trendData.length < 2) return { exportCagr: 0, importCagr: 0 };
    const first = trendData[0];
    const last = trendData[trendData.length - 1];
    const yrs = last.year - first.year;
    return {
      exportCagr: first.exports > 0 && yrs > 0 ? (Math.pow(last.exports / first.exports, 1 / yrs) - 1) * 100 : 0,
      importCagr: first.imports > 0 && yrs > 0 ? (Math.pow(last.imports / first.imports, 1 / yrs) - 1) * 100 : 0,
    };
  }, [trendData]);

  const forecastHistoricalData = useMemo(
    () => trendData.map(d => ({ year: d.year, value: showExportForecast ? d.exports : d.imports })),
    [trendData, showExportForecast]
  );
  const forecasts = useMemo(() => {
    if (forecastHistoricalData.length < 3) return [];
    return generateAllForecasts(forecastHistoricalData);
  }, [forecastHistoricalData]);

  // Partner regions donut
  const partnerDonutData = useMemo(() => {
    if (!allRegionalTrade) return [];
    const yearRows = allRegionalTrade.filter(r => r.year === year);
    const partnerMap = new Map<string, number>();
    
    for (const row of yearRows) {
      const val = metric === 'value' ? row.trade_value : row.trade_volume;
      if (showPartnerExports && row.exporter_region === selectedRegion) {
        if (row.importer_region !== 'World') {
          partnerMap.set(row.importer_region, (partnerMap.get(row.importer_region) ?? 0) + val);
        }
      } else if (!showPartnerExports && row.importer_region === selectedRegion) {
        if (row.exporter_region !== 'World') {
          partnerMap.set(row.exporter_region, (partnerMap.get(row.exporter_region) ?? 0) + val);
        }
      }
    }
    
    return Array.from(partnerMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [allRegionalTrade, selectedRegion, year, metric, showPartnerExports]);

  // Top countries donut (with toggle)
  const topCountriesDonut = useMemo(() => {
    const sourceData = showTopCountriesExport ? topExporterCountries : topImporterCountries;
    if (!sourceData || sourceData.length === 0) return [];
    
    const totalValue = showTopCountriesExport ? exportVal : importVal;
    const top = sourceData.map((c: any) => ({
      name: c.country,
      value: metric === 'value' ? Number(c.total_value) : Number(c.total_volume),
    }));
    const topSum = top.reduce((s: number, r: any) => s + r.value, 0);
    const others = totalValue - topSum;
    if (others > 0) top.push({ name: 'Others', value: others });
    
    return top;
  }, [topExporterCountries, topImporterCountries, showTopCountriesExport, exportVal, importVal, metric]);

// Export commodities donut
const exportCommoditiesDonut = useMemo(() => {
  if (!topExportCommodities || topExportCommodities.length === 0) return [];
  const top = topExportCommodities.map((c: any) => ({
    name: c.commodity_l2,
    value: metric === 'value' ? Number(c.total_value) : Number(c.total_volume),
  }));
  const topSum = top.reduce((s: number, r: any) => s + r.value, 0);
  const others = exportVal - topSum;
  if (others > 0 && others > topSum * 0.01) top.push({ name: 'Others', value: others });
  return top;
}, [topExportCommodities, exportVal, metric]);

// Import commodities donut
const importCommoditiesDonut = useMemo(() => {
  if (!topImportCommodities || topImportCommodities.length === 0) return [];
  const top = topImportCommodities.map((c: any) => ({
    name: c.commodity_l2,
    value: metric === 'value' ? Number(c.total_value) : Number(c.total_volume),
  }));
  const topSum = top.reduce((s: number, r: any) => s + r.value, 0);
  const others = importVal - topSum;
  if (others > 0 && others > topSum * 0.01) top.push({ name: 'Others', value: others });
  return top;
}, [topImportCommodities, importVal, metric]);

  const topExpCommodity = topExportCommodityCard[0]?.commodity_l2 || '—';
  const topImpCommodity = topImportCommodityCard[0]?.commodity_l2 || '—';

  const cagrColor = (v: number) => (v > 0 ? '#10b981' : v < 0 ? '#ef4444' : 'var(--text-secondary)');
  const cagrSign = (v: number) => (v > 0 ? '+' : '');
  const fmt = (v: number) => metric === 'value' ? formatCurrency(v) : formatVolume(v);

  if (regionalLoading || exportCommoditiesLoading || importCommoditiesLoading) return <LoadingState />;

  // Debug info
  console.log('=== Region Dashboard Debug ===');
  console.log('Selected Region:', selectedRegion);
  console.log('Top Export Commodities count:', topExportCommodities.length);
  console.log('Top Import Commodities count:', topImportCommodities.length);
  console.log('Top Export Commodity Card:', topExportCommodityCard[0]);
  console.log('Top Import Commodity Card:', topImportCommodityCard[0]);

  return (
    <div className="min-h-screen pt-14" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-screen-2xl mx-auto px-4 md:px-8 py-8 space-y-6">

        {/* Header + Region Selector */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex items-center gap-3">
            <MapPin className="w-7 h-7 flex-shrink-0" style={{ color: 'var(--accent)' }} />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold font-outfit" style={tp}>
                Regional Trade Analysis
              </h1>
              <p className="text-sm mt-0.5" style={tm}>
                Deep dive into export, import, and trade patterns by region
              </p>
            </div>
          </div>
          <div className="sm:ml-auto relative">
            <select
              value={selectedRegion}
              onChange={e => setSelectedRegion(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2.5 text-sm font-semibold border outline-none cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--accent)',
                color: 'var(--text-primary)',
                minWidth: 180,
              }}
            >
              {availableRegions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--text-muted)' }}
            />
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <KPICard
            label={`Total Exports (${year})`}
            value={fmt(exportVal)}
            icon={<TrendingUp size={16} />}
            delta={exportYoy}
            sub="YoY"
          />
          <KPICard
            label={`Total Imports (${year})`}
            value={fmt(importVal)}
            icon={<TrendingUp size={16} />}
            delta={importYoy}
            sub="YoY"
          />
          <div className="border p-5 flex flex-col gap-2" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
            <span className="text-xs font-dm-sans font-medium uppercase tracking-wide" style={tm}>
              CAGR (2018–{year})
            </span>
            <div className="flex flex-col gap-2 mt-1">
              <div className="flex items-center gap-2">
                <span className="text-xs" style={ts}>Export</span>
                <span className="text-sm font-bold font-dm-mono" style={{ color: cagrColor(exportCagr) }}>
                  {cagrSign(exportCagr)}{exportCagr.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={ts}>Import</span>
                <span className="text-sm font-bold font-dm-mono" style={{ color: cagrColor(importCagr) }}>
                  {cagrSign(importCagr)}{importCagr.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
          <div className="border p-5 flex flex-col gap-2" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
            <span className="text-xs font-dm-sans font-medium uppercase tracking-wide" style={tm}>
              Top Commodity ({year})
            </span>
            <div className="flex flex-col gap-2 mt-1">
              <div>
                <span className="text-xs" style={tm}>Exp: </span>
                <span className="text-xs font-semibold" style={tp} title={topExpCommodity}>
                  {topExpCommodity}
                </span>
              </div>
              <div>
                <span className="text-xs" style={tm}>Imp: </span>
                <span className="text-xs font-semibold" style={tp} title={topImpCommodity}>
                  {topImpCommodity}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Executive Insights + AI */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <div className="border p-5 md:p-6" style={card}>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={16} style={{ color: 'var(--accent)' }} />
              <h2 className="text-base font-bold font-outfit" style={tp}>Executive Insights</h2>
            </div>
            <ul className="space-y-2.5">
              {[
                `${selectedRegion} exported ${fmt(exportVal)} in ${year}, ${exportYoy >= 0 ? 'up' : 'down'} ${Math.abs(exportYoy).toFixed(1)}% year-on-year.`,
                `Total imports reached ${fmt(importVal)}, a ${importYoy >= 0 ? 'gain' : 'decline'} of ${Math.abs(importYoy).toFixed(1)}% vs ${year - 1}.`,
                `Export CAGR since 2018: ${cagrSign(exportCagr)}${exportCagr.toFixed(1)}% — ${exportCagr > 3 ? 'strong' : exportCagr > 0 ? 'moderate' : 'declining'} structural growth trajectory.`,
                `${selectedRegion} is a ${exportVal >= importVal ? 'net exporter' : 'net importer'} in ${year} with a trade balance of ${fmt(Math.abs(exportVal - importVal))}.`,
                `Top destination region for exports: ${partnerDonutData[0]?.name || 'N/A'} (${partnerDonutData[0] ? ((partnerDonutData[0].value / (partnerDonutData.reduce((s, d) => s + d.value, 0))) * 100).toFixed(1) : '0'}% share).`,
                `Largest exporting economy: ${topExporterCountries[0]?.country || 'N/A'} at ${topExporterCountries[0] ? fmt(metric === 'value' ? topExporterCountries[0].total_value : topExporterCountries[0].total_volume) : '—'}.`,
                `Leading export commodity: ${topExpCommodity}.`,
              ].map((point, i) => (
                <li key={i} className="flex gap-2.5 text-sm leading-relaxed" style={ts}>
                  <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full mt-[7px]" style={{ backgroundColor: 'var(--accent)' }} />
                  {point}
                </li>
              ))}
            </ul>
          </div>

          <div className="border p-5 md:p-6 flex flex-col" style={card}>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} style={{ color: 'var(--accent)' }} />
              <h2 className="text-base font-bold font-outfit" style={tp}>AI-Powered Market Insights</h2>
              <span className="ml-auto text-xs font-semibold px-2 py-0.5" style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)', opacity: 0.8 }}>
                Coming Soon
              </span>
            </div>
            <p className="text-sm mb-4" style={ts}>
              Ask questions about {selectedRegion}'s trade dynamics, growth drivers, and market opportunities.
            </p>
            <textarea
              placeholder={`e.g. "What are the top growth opportunities for ${selectedRegion} exports in 2025?"`}
              className="flex-1 w-full p-3 text-sm outline-none border resize-none"
              style={{
                backgroundColor: 'var(--input-bg)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
                minHeight: 96,
                opacity: 0.55,
                cursor: 'not-allowed',
              }}
              disabled
              rows={4}
            />
            <button disabled className="w-full py-2.5 mt-3 text-xs font-semibold opacity-40 cursor-not-allowed" style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
              Generate Insights
            </button>
          </div>
        </div>

        {/* Trade Trend + Forecast */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <div className="border p-5 md:p-6" style={card}>
            <SectionHeader title={`Trade Trend & Growth (${metric === 'value' ? 'Value' : 'Volume'})`} />
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={ct.gridStroke} />
                  <XAxis dataKey="year" stroke={ct.axisStroke} tick={{ fill: ct.axisStroke, fontSize: 11 }} />
                  <YAxis yAxisId="left" stroke={ct.axisStroke} tick={{ fill: ct.axisStroke, fontSize: 10 }} tickFormatter={fmt} width={68} />
                  <YAxis yAxisId="right" orientation="right" stroke={ct.axisStroke} tick={{ fill: ct.axisStroke, fontSize: 10 }} tickFormatter={v => `${Number(v).toFixed(0)}%`} width={44} />
                  <Tooltip {...tooltipStyle} formatter={(value: any, name: string) => name.includes('Growth') ? [`${Number(value).toFixed(1)}%`, name] : [fmt(Number(value)), name]} />
                  <Legend wrapperStyle={{ color: ct.axisStroke, fontSize: 11 }} />
                  <Bar yAxisId="left" dataKey="exports" fill={ct.barFill} name="Exports" maxBarSize={32} />
                  <Bar yAxisId="left" dataKey="imports" fill={ct.barFill2} name="Imports" maxBarSize={32} />
                  <Line yAxisId="right" type="monotone" dataKey="exportGrowth" stroke={ct.greenLine} strokeWidth={2} name="Export Growth %" dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="importGrowth" stroke={ct.amberLine} strokeWidth={2} name="Import Growth %" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-sm" style={tm}>No trend data available</div>
            )}
          </div>

          <div className="border p-5 md:p-6" style={card}>
            <SectionHeader
              title={`${showExportForecast ? 'Export' : 'Import'} Forecast 2025–2030`}
              action={
                <ToggleButton
                  label={`Show ${showExportForecast ? 'Import' : 'Export'}`}
                  onClick={() => setShowExportForecast(p => !p)}
                  isActive={false}
                />
              }
            />
            {forecasts.length > 0 ? (
              <ForecastChart
                historicalData={forecastHistoricalData}
                forecasts={forecasts}
                isDark={isDark}
                metric={metric}
              />
            ) : (
              <div className="flex items-center justify-center h-48 text-sm" style={tm}>Insufficient data for forecast</div>
            )}
          </div>
        </div>

        {/* Top Countries (with toggle) + Partner Regions - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <div className="border p-5 md:p-6" style={card}>
            <SectionHeader 
              title={`Top ${showTopCountriesExport ? 'Exporting' : 'Importing'} Countries — ${selectedRegion} (${year})`}
              action={
                <div className="flex gap-2">
                  <ToggleButton
                    label="Exports"
                    onClick={() => setShowTopCountriesExport(true)}
                    isActive={showTopCountriesExport}
                  />
                  <ToggleButton
                    label="Imports"
                    onClick={() => setShowTopCountriesExport(false)}
                    isActive={!showTopCountriesExport}
                  />
                </div>
              }
            />
            {topCountriesDonut.length > 0
              ? <DonutChart data={topCountriesDonut} isDark={isDark} metric={metric} />
              : <div className="flex items-center justify-center h-48 text-sm" style={tm}>No data</div>
            }
          </div>

          <div className="border p-5 md:p-6" style={card}>
            <SectionHeader
              title={showPartnerExports
                ? `${selectedRegion} Exports To — Partner Regions (${year})`
                : `${selectedRegion} Imports From — Partner Regions (${year})`}
              action={
                <ToggleButton
                  label={showPartnerExports ? 'Exports To' : 'Imports From'}
                  onClick={() => setShowPartnerExports(p => !p)}
                  isActive={false}
                />
              }
            />
            <div className="max-w-xl mx-auto">
              {partnerDonutData.length > 0
                ? <DonutChart data={partnerDonutData} isDark={isDark} metric={metric} />
                : <div className="flex items-center justify-center h-48 text-sm" style={tm}>No data</div>
              }
            </div>
          </div>
        </div>

        {/* Top Export + Import Commodities - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <div className="border p-5 md:p-6" style={card}>
            <SectionHeader title={`Top Export Commodities — ${selectedRegion} (${year})`} />
            {exportCommoditiesDonut.length > 0
              ? <DonutChart data={exportCommoditiesDonut} isDark={isDark} metric={metric} />
              : <div className="flex items-center justify-center h-48 text-sm" style={tm}>
                  No commodity data. Check console for details.
                </div>
            }
          </div>
          <div className="border p-5 md:p-6" style={card}>
            <SectionHeader title={`Top Import Commodities — ${selectedRegion} (${year})`} />
            {importCommoditiesDonut.length > 0
              ? <DonutChart data={importCommoditiesDonut} isDark={isDark} metric={metric} />
              : <div className="flex items-center justify-center h-48 text-sm" style={tm}>
                  No commodity data. Check console for details.
                </div>
            }
          </div>
        </div>

      </div>
    </div>
  );
}