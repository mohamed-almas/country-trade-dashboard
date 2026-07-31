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
import { formatCurrency, formatVolume, formatCompactNumber } from '../utils/formatters';
import {
  Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ComposedChart, Line,
} from 'recharts';
import { Package, TrendingUp } from 'lucide-react';
import { getChartTheme } from '../utils/chartTheme';
import { CountryLabel } from '../components/CountryLabel';
import { MarketIntelligence } from '../components/MarketIntelligence';

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

function CorridorCountryCell({ name }: { name: string }) {
  return <CountryLabel name={name} size={18} />;
}

export function CommodityDashboard() {
  const { isDark } = useTheme();
  const ct = getChartTheme(isDark);
  const { metric } = useMetric();
  const { year } = useYear();
  const [selectedL1, setSelectedL1] = useState<string>('Ores');
  const [selectedL2, setSelectedL2] = useState<string>('All');
  const [showTopCountriesExport, setShowTopCountriesExport] = useState(true);

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: ct.tooltipBg,
      border: `1px solid ${ct.tooltipBorder}`,
      color: ct.tooltipColor,
      fontSize: 12,
    },
  };

  // Fetch L1 list
  const { data: l1List = [], isLoading: l1Loading } = useQuery({
    queryKey: ['commodity_l1_list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_commodity_aggregates')
        .select('commodity_l1')
        .eq('year', year)
        .order('commodity_l1');
      if (error) throw error;
      return [...new Set(data.map(d => d.commodity_l1 as string))].sort();
    },
  });

  // Fetch L2 list based on selected L1
  const { data: l2List = [] } = useQuery({
    queryKey: ['commodity_l2_list', selectedL1],
    queryFn: async () => {
      if (!selectedL1) return [];
      const { data, error } = await supabase
        .from('mv_commodity_aggregates')
        .select('commodity_l2')
        .eq('commodity_l1', selectedL1)
        .eq('year', year)
        .order('commodity_l2');
      if (error) throw error;
      return [...new Set(data.map(d => d.commodity_l2 as string))].sort();
    },
    enabled: !!selectedL1,
  });

  // Commodity historical data for trend
  const { data: commodityHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['commodity_history', selectedL1, selectedL2],
    queryFn: async () => {
      if (!selectedL1) return [];
      let query = supabase
        .from('mv_commodity_aggregates')
        .select('year, total_value, total_volume')
        .eq('commodity_l1', selectedL1)
        .order('year', { ascending: true });
      
      if (selectedL2 !== 'All') {
        query = query.eq('commodity_l2', selectedL2);
      }
      
      const { data, error } = await query;
      if (error) throw error;

      const yearlyAgg = new Map<number, { value: number; volume: number }>();
      data.forEach(d => {
        if (!yearlyAgg.has(d.year)) yearlyAgg.set(d.year, { value: 0, volume: 0 });
        const entry = yearlyAgg.get(d.year)!;
        entry.value += d.total_value;
        entry.volume += d.total_volume;
      });

      return Array.from(yearlyAgg.entries())
        .map(([yr, vals]) => ({ year: yr, total_value: vals.value, total_volume: vals.volume }))
        .sort((a, b) => a.year - b.year);
    },
    enabled: !!selectedL1,
  });

  // Top exporting countries
  const { data: topExportCountries = [] } = useQuery({
    queryKey: ['top_export_countries', selectedL1, selectedL2, year],
    queryFn: async () => {
      if (!selectedL1) return [];
      
      const table = selectedL2 !== 'All' ? 'commodity_corridors_mv' : 'commodity_l1_corridors_mv';
      const filterField = selectedL2 !== 'All' ? 'commodity_l2' : 'commodity_l1';
      const filterValue = selectedL2 !== 'All' ? selectedL2 : selectedL1;
      
      const { data, error } = await supabase
        .from(table)
        .select('exporter, total_value, total_volume')
        .eq('year', year)
        .eq(filterField, filterValue);
      
      if (error) throw error;
      
      const exporterMap = new Map();
      data?.forEach(d => {
        const existing = exporterMap.get(d.exporter) || { total_value: 0, total_volume: 0 };
        existing.total_value += d.total_value;
        existing.total_volume += d.total_volume;
        exporterMap.set(d.exporter, existing);
      });
      
      return Array.from(exporterMap.entries())
        .map(([country, vals]) => ({ country, total_value: vals.total_value, total_volume: vals.total_volume }))
        .sort((a, b) => b.total_value - a.total_value)
        .slice(0, 10);
    },
    enabled: !!selectedL1,
  });

  // Top importing countries
  const { data: topImportCountries = [] } = useQuery({
    queryKey: ['top_import_countries', selectedL1, selectedL2, year],
    queryFn: async () => {
      if (!selectedL1) return [];
      
      const table = selectedL2 !== 'All' ? 'commodity_corridors_mv' : 'commodity_l1_corridors_mv';
      const filterField = selectedL2 !== 'All' ? 'commodity_l2' : 'commodity_l1';
      const filterValue = selectedL2 !== 'All' ? selectedL2 : selectedL1;
      
      const { data, error } = await supabase
        .from(table)
        .select('importer, total_value, total_volume')
        .eq('year', year)
        .eq(filterField, filterValue);
      
      if (error) throw error;
      
      const importerMap = new Map();
      data?.forEach(d => {
        const existing = importerMap.get(d.importer) || { total_value: 0, total_volume: 0 };
        existing.total_value += d.total_value;
        existing.total_volume += d.total_volume;
        importerMap.set(d.importer, existing);
      });
      
      return Array.from(importerMap.entries())
        .map(([country, vals]) => ({ country, total_value: vals.total_value, total_volume: vals.total_volume }))
        .sort((a, b) => b.total_value - a.total_value)
        .slice(0, 10);
    },
    enabled: !!selectedL1,
  });

  // Trade corridors
  const { data: tradeCorridors = [] } = useQuery({
    queryKey: ['commodity_trade_corridors', selectedL1, selectedL2, year, metric],
    queryFn: async () => {
      if (!selectedL1) return [];
      
      const table = selectedL2 !== 'All' ? 'commodity_corridors_mv' : 'commodity_l1_corridors_mv';
      const filterField = selectedL2 !== 'All' ? 'commodity_l2' : 'commodity_l1';
      const filterValue = selectedL2 !== 'All' ? selectedL2 : selectedL1;
      
      const { data, error } = await supabase
        .from(table)
        .select('exporter, importer, total_value, total_volume')
        .eq('year', year)
        .eq(filterField, filterValue)
        .order(metric === 'value' ? 'total_value' : 'total_volume', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!selectedL1,
  });

  // Related commodities
  const { data: relatedCommodities = [] } = useQuery({
    queryKey: ['related_commodities', selectedL1, selectedL2, year],
    queryFn: async () => {
      if (!selectedL1) return [];
      
      let query = supabase
        .from('mv_commodity_aggregates')
        .select('commodity_l2, total_value, total_volume')
        .eq('commodity_l1', selectedL1)
        .eq('year', year)
        .order('total_value', { ascending: false });
      
      if (selectedL2 !== 'All') {
        query = query.neq('commodity_l2', selectedL2);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      const l2Map = new Map();
      data.forEach(d => {
        if (!l2Map.has(d.commodity_l2)) {
          l2Map.set(d.commodity_l2, { total_value: 0, total_volume: 0 });
        }
        const entry = l2Map.get(d.commodity_l2);
        entry.total_value += d.total_value;
        entry.total_volume += d.total_volume;
      });
      
      return Array.from(l2Map.entries())
        .map(([name, vals]) => ({ commodity_l2: name, total_value: vals.total_value, total_volume: vals.total_volume }))
        .sort((a, b) => b.total_value - a.total_value)
        .slice(0, 10);
    },
    enabled: !!selectedL1,
  });

  // Trend data
  const trendData = useMemo(() => {
    if (!commodityHistory || commodityHistory.length === 0) return [];
    return commodityHistory.map((d, i) => {
      const value = metric === 'value' ? d.total_value : d.total_volume;
      const prevValue = i > 0 ? (metric === 'value' ? commodityHistory[i - 1].total_value : commodityHistory[i - 1].total_volume) : value;
      const growth = i > 0 && prevValue > 0 ? ((value - prevValue) / prevValue) * 100 : 0;
      return { year: d.year, value, growth };
    });
  }, [commodityHistory, metric]);

  const currentData = useMemo(() => trendData.find(d => d.year === year), [trendData, year]);
  const currentValue = currentData?.value ?? 0;
  const currentYoY = currentData?.growth ?? 0;
  const cagr = useMemo(() => {
    if (!trendData || trendData.length < 2) return 0;
    const first = trendData[0].value;
    const last = trendData[trendData.length - 1].value;
    const years = trendData.length - 1;
    if (first <= 0 || years <= 0) return 0;
    return (Math.pow(last / first, 1 / years) - 1) * 100;
  }, [trendData]);

  const forecastHistoricalData = useMemo(() => {
    if (!trendData || trendData.length === 0) return [];
    return trendData.map(d => ({ year: d.year, value: d.value }));
  }, [trendData]);

  const forecasts = useMemo(() => {
    if (forecastHistoricalData.length < 3) return [];
    return generateAllForecasts(forecastHistoricalData);
  }, [forecastHistoricalData]);

  // Top countries donut
  const topCountriesDonut = useMemo(() => {
    const sourceData = showTopCountriesExport ? topExportCountries : topImportCountries;
    if (!sourceData || sourceData.length === 0) return [];
    
    const totalValue = currentValue;
    const top = sourceData.map((c: any) => ({
      name: c.country,
      value: metric === 'value' ? Number(c.total_value) : Number(c.total_volume),
    }));
    const topSum = top.reduce((s: number, r: any) => s + r.value, 0);
    const others = totalValue - topSum;
    if (others > 0 && others > topSum * 0.01) top.push({ name: 'Others', value: others });
    
    return top;
  }, [topExportCountries, topImportCountries, showTopCountriesExport, currentValue, metric]);

  // Related commodities donut
  const relatedCommoditiesDonut = useMemo(() => {
    if (!relatedCommodities || relatedCommodities.length === 0) return [];
    
    const totalValue = currentValue;
    const top = relatedCommodities.map((c: any) => ({
      name: c.commodity_l2,
      value: metric === 'value' ? Number(c.total_value) : Number(c.total_volume),
    }));
    const topSum = top.reduce((s: number, r: any) => s + r.value, 0);
    const others = totalValue - topSum;
    if (others > 0 && others > topSum * 0.01) top.push({ name: 'Others', value: others });
    
    return top;
  }, [relatedCommodities, currentValue, metric]);

  const topCommodityName = selectedL2 !== 'All' ? selectedL2 : selectedL1;
  const displayLabel = selectedL2 !== 'All' ? selectedL2 : selectedL1;

  const fmt = (v: number) => metric === 'value' ? formatCurrency(v) : formatVolume(v);
  const cagrColor = (v: number) => (v > 0 ? '#10b981' : v < 0 ? '#ef4444' : 'var(--text-secondary)');
  const cagrSign = (v: number) => (v > 0 ? '+' : '');

  if (l1Loading || historyLoading) return <LoadingState />;

  return (
    <div className="min-h-screen pt-14" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-screen-2xl mx-auto px-4 md:px-8 py-8 space-y-6">

        <div className="flex items-center gap-3">
          <Package className="w-7 h-7 flex-shrink-0" style={{ color: 'var(--accent)' }} />
          <h1 className="text-2xl md:text-3xl font-bold font-outfit" style={tp}>Commodity Trade Analysis</h1>
        </div>

        {/* L1 & L2 Selectors */}
        <div className="border p-4 md:p-6" style={card}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <div>
              <label className="block text-xs font-semibold mb-2" style={tm}>Commodity Category (L1)</label>
              <select
                value={selectedL1}
                onChange={e => { setSelectedL1(e.target.value); setSelectedL2('All'); }}
                className="w-full px-3 py-2 text-sm border outline-none rounded"
                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              >
                {l1List.map(l1 => <option key={l1} value={l1}>{l1}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2" style={tm}>Sub-Commodity (L2) <span className="font-normal" style={tm}>— optional</span></label>
              <select
                value={selectedL2}
                onChange={e => setSelectedL2(e.target.value)}
                className="w-full px-3 py-2 text-sm border outline-none rounded"
                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                disabled={!selectedL1}
              >
                <option value="All">All sub-commodities</option>
                {l2List.map(l2 => <option key={l2} value={l2}>{l2}</option>)}
              </select>
            </div>
          </div>
          {selectedL1 && (
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded" style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>{selectedL1}</span>
              {selectedL2 !== 'All' && <><span className="text-xs" style={tm}>›</span><span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded" style={{ backgroundColor: 'var(--positive-bg)', color: 'var(--positive-text)' }}>{selectedL2}</span></>}
            </div>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <KPICard label={`Total ${metric === 'value' ? 'Value' : 'Volume'} (${year})`} value={fmt(currentValue)} icon={<TrendingUp size={16} />} delta={currentYoY} sub="YoY" />
          <KPICard label={`YoY Growth (${year})`} value={`${currentYoY.toFixed(1)}%`} icon={<TrendingUp size={16} />} delta={currentYoY} />
          <div className="border p-5 flex flex-col gap-2" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
            <span className="text-xs font-dm-sans font-medium uppercase tracking-wide" style={tm}>CAGR (2018–{year})</span>
            <div className="flex flex-col gap-2 mt-1"><span className="text-sm font-bold font-dm-mono" style={{ color: cagrColor(cagr) }}>{cagrSign(cagr)}{cagr.toFixed(1)}%</span></div>
          </div>
          <div className="border p-5 flex flex-col gap-2" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
            <span className="text-xs font-dm-sans font-medium uppercase tracking-wide" style={tm}>Top Commodity</span>
            <div className="flex flex-col gap-2 mt-1"><span className="text-xs font-semibold" style={tp}>{topCommodityName}</span></div>
          </div>
        </div>

        {/* Executive Insights + AI */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <div className="border p-5 md:p-6" style={card}>
            <div className="flex items-center gap-2 mb-4"><TrendingUp size={16} style={{ color: 'var(--accent)' }} /><h2 className="text-base font-bold font-outfit" style={tp}>Executive Insights</h2></div>
            <ul className="space-y-2.5">
              {[
                `${displayLabel} trade reached ${fmt(currentValue)} in ${year}, ${currentYoY >= 0 ? 'up' : 'down'} ${Math.abs(currentYoY).toFixed(1)}% year-on-year.`,
                `CAGR since 2018 is ${cagrSign(cagr)}${cagr.toFixed(1)}%.`,
                `Top exporting countries: ${topExportCountries.slice(0, 3).map(c => c.country).join(', ')}.`,
                `Top importing countries: ${topImportCountries.slice(0, 3).map(c => c.country).join(', ')}.`,
              ].map((point, i) => (
                <li key={i} className="flex gap-2.5 text-sm leading-relaxed" style={ts}><span className="flex-shrink-0 w-1.5 h-1.5 rounded-full mt-[7px]" style={{ backgroundColor: 'var(--accent)' }} />{point}</li>
              ))}
            </ul>
          </div>
          <MarketIntelligence
            scopeKey={`commodity:${selectedL2 !== 'All' ? selectedL2 : selectedL1}`}
            scopeLabel={displayLabel}
            kpis={{
              total_value: fmt(currentValue),
              yoy_growth: `${currentYoY >= 0 ? '+' : ''}${currentYoY.toFixed(1)}%`,
              cagr_since_2018: `${cagrSign(cagr)}${cagr.toFixed(1)}%`,
              top_exporters: topExportCountries.slice(0, 3).map((c) => c.country),
              top_importers: topImportCountries.slice(0, 3).map((c) => c.country),
            }}
          />
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
                  <Tooltip {...tooltipStyle} formatter={(value: any, name: string) => name === 'growth' ? [`${Number(value).toFixed(1)}%`, 'YoY Growth'] : [fmt(Number(value)), name]} />
                  <Legend wrapperStyle={{ color: ct.axisStroke, fontSize: 11 }} />
                  <Bar yAxisId="left" dataKey="value" fill={ct.barFill} name={metric === 'value' ? 'Trade Value' : 'Trade Volume'} maxBarSize={32} />
                  <Line yAxisId="right" type="monotone" dataKey="growth" stroke={ct.greenLine} strokeWidth={2} name="YoY Growth %" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (<div className="flex items-center justify-center h-48 text-sm" style={tm}>No trend data available</div>)}
          </div>
          <div className="border p-5 md:p-6" style={card}>
            <SectionHeader title={`Forecast 2025–2030 — ${displayLabel}`} />
            {forecasts.length > 0 ? <ForecastChart historicalData={forecastHistoricalData} forecasts={forecasts} isDark={isDark} metric={metric} /> : <div className="flex items-center justify-center h-48 text-sm" style={tm}>Insufficient data for forecast</div>}
          </div>
        </div>

        {/* Top Countries + Related Commodities */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <div className="border p-5 md:p-6" style={card}>
            <SectionHeader title={`Top ${showTopCountriesExport ? 'Exporting' : 'Importing'} Countries — ${displayLabel} (${year})`} action={
              <div className="flex gap-2">
                <button onClick={() => setShowTopCountriesExport(true)} className="px-3 py-1.5 text-xs font-semibold transition-colors" style={{ backgroundColor: showTopCountriesExport ? 'var(--accent)' : 'var(--bg-tertiary)', color: showTopCountriesExport ? 'var(--accent-text)' : 'var(--text-secondary)', border: `1px solid ${showTopCountriesExport ? 'var(--accent)' : 'var(--border)'}` }}>Exports</button>
                <button onClick={() => setShowTopCountriesExport(false)} className="px-3 py-1.5 text-xs font-semibold transition-colors" style={{ backgroundColor: !showTopCountriesExport ? 'var(--accent)' : 'var(--bg-tertiary)', color: !showTopCountriesExport ? 'var(--accent-text)' : 'var(--text-secondary)', border: `1px solid ${!showTopCountriesExport ? 'var(--accent)' : 'var(--border)'}` }}>Imports</button>
              </div>
            } />
            <div className="max-w-xl mx-auto">{topCountriesDonut.length > 0 ? <DonutChart data={topCountriesDonut} isDark={isDark} metric={metric} /> : <div className="flex items-center justify-center h-48 text-sm" style={tm}>No data</div>}</div>
          </div>
          <div className="border p-5 md:p-6" style={card}>
            <SectionHeader title={`Related Sub-Commodities — ${selectedL1} (${year})`} />
            <div className="max-w-xl mx-auto">{relatedCommoditiesDonut.length > 0 ? <DonutChart data={relatedCommoditiesDonut} isDark={isDark} metric={metric} /> : <div className="flex items-center justify-center h-48 text-sm" style={tm}>No related commodities data</div>}</div>
          </div>
        </div>

        {/* Top 20 Trade Corridors - Simple List View */}
        <div className="border p-5 md:p-6" style={card}>
          <SectionHeader title={`Top 20 Trade Corridors — ${displayLabel} (${year})`} />
          {tradeCorridors.length > 0 ? (
            <div className="space-y-2">
              {tradeCorridors.slice(0, 20).map((corridor, idx) => {
                const val = metric === 'value' ? corridor.total_value : corridor.total_volume;
                return (
                  <div key={idx} className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium w-6" style={tm}>{idx + 1}</span>
                      <span className="text-sm" style={tp}><CorridorCountryCell name={corridor.exporter} /></span>
                      <span className="text-xs" style={tm}>→</span>
                      <span className="text-sm" style={tp}><CorridorCountryCell name={corridor.importer} /></span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium" style={tp}>{formatCompactNumber(val)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-sm" style={tm}>No trade corridor data available</div>
          )}
        </div>

      </div>
    </div>
  );
}