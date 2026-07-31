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
import { TrendingUp, Sparkles, MapPin } from 'lucide-react';
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

export function CountryDashboard() {
  const { isDark } = useTheme();
  const ct = getChartTheme(isDark);
  const { metric } = useMetric();
  const { year } = useYear();
  const [selectedCountry, setSelectedCountry] = useState<string>('China');
  const [countries, setCountries] = useState<string[]>([]);
  const [showExportForecast, setShowExportForecast] = useState(true);
  const [showTopCountriesExport, setShowTopCountriesExport] = useState(true);
  const [showCommoditiesExport, setShowCommoditiesExport] = useState(true);

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: ct.tooltipBg,
      border: `1px solid ${ct.tooltipBorder}`,
      color: ct.tooltipColor,
      fontSize: 12,
    },
  };

  // Fetch all countries
  useQuery({
    queryKey: ['countries_list_static'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_countries_list')
        .select('country')
        .order('country');
      if (error) throw error;
      setCountries(data.map(c => c.country));
      return data;
    },
    staleTime: Infinity,
  });

  // Country export data
  const { data: exportData, isLoading: exportLoading } = useQuery({
    queryKey: ['country_export', selectedCountry],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_country_aggregates')
        .select('year, export_value, import_value')
        .eq('country', selectedCountry)
        .order('year', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!selectedCountry,
  });

  // Top export partners
  const { data: topExportPartners = [] } = useQuery({
    queryKey: ['top_export_partners', selectedCountry, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_bilateral_aggregates')
        .select('importer, total_value, total_volume')
        .eq('year', year)
        .eq('exporter', selectedCountry)
        .order('total_value', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!selectedCountry,
  });

  // Top import partners
  const { data: topImportPartners = [] } = useQuery({
    queryKey: ['top_import_partners', selectedCountry, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_bilateral_aggregates')
        .select('exporter, total_value, total_volume')
        .eq('year', year)
        .eq('importer', selectedCountry)
        .order('total_value', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!selectedCountry,
  });

  // Top export commodities
  const { data: topExportCommodities = [] } = useQuery({
    queryKey: ['top_export_commodities', selectedCountry, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_commodity_aggregates')
        .select('commodity_l2, total_value, total_volume')
        .eq('year', year)
        .order('total_value', { ascending: false })
        .limit(10);
      if (error) return [];
      return data ?? [];
    },
    enabled: !!selectedCountry,
  });

  // Top import commodities
  const { data: topImportCommodities = [] } = useQuery({
    queryKey: ['top_import_commodities', selectedCountry, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_commodity_aggregates')
        .select('commodity_l2, total_value, total_volume')
        .eq('year', year)
        .order('total_value', { ascending: false })
        .limit(10);
      if (error) return [];
      return data ?? [];
    },
    enabled: !!selectedCountry,
  });

  // Trend data
  const trendData = useMemo(() => {
    if (!exportData || exportData.length === 0) return [];
    return exportData.map((d, i) => {
      const exportVal = metric === 'value' ? d.export_value : 0;
      const importVal = metric === 'value' ? d.import_value : 0;
      const prevExport = i > 0 ? (metric === 'value' ? exportData[i - 1].export_value : 0) : exportVal;
      const prevImport = i > 0 ? (metric === 'value' ? exportData[i - 1].import_value : 0) : importVal;
      return {
        year: d.year,
        exports: exportVal,
        imports: importVal,
        exportGrowth: i > 0 && prevExport > 0 ? ((exportVal - prevExport) / prevExport) * 100 : 0,
        importGrowth: i > 0 && prevImport > 0 ? ((importVal - prevImport) / prevImport) * 100 : 0,
      };
    });
  }, [exportData, metric]);

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

  // Top partners donut
  const topPartnersDonut = useMemo(() => {
    const sourceData = showTopCountriesExport ? topExportPartners : topImportPartners;
    if (!sourceData || sourceData.length === 0) return [];
    
    const totalValue = showTopCountriesExport ? exportVal : importVal;
    const top = sourceData.map((c: any) => ({
      name: showTopCountriesExport ? c.importer : c.exporter,
      value: metric === 'value' ? Number(c.total_value) : Number(c.total_volume),
    }));
    const topSum = top.reduce((s: number, r: any) => s + r.value, 0);
    const others = totalValue - topSum;
    if (others > 0) top.push({ name: 'Others', value: others });
    
    return top;
  }, [topExportPartners, topImportPartners, showTopCountriesExport, exportVal, importVal, metric]);

  // Commodities donut
  const commoditiesDonut = useMemo(() => {
    const sourceData = showCommoditiesExport ? topExportCommodities : topImportCommodities;
    if (!sourceData || sourceData.length === 0) return [];
    
    const totalValue = showCommoditiesExport ? exportVal : importVal;
    const top = sourceData.map((c: any) => ({
      name: c.commodity_l2,
      value: metric === 'value' ? Number(c.total_value) : Number(c.total_volume),
    }));
    const topSum = top.reduce((s: number, r: any) => s + r.value, 0);
    const others = totalValue - topSum;
    if (others > 0) top.push({ name: 'Others', value: others });
    
    return top;
  }, [topExportCommodities, topImportCommodities, showCommoditiesExport, exportVal, importVal, metric]);

  const topExpCommodity = topExportCommodities[0]?.commodity_l2 || '—';
  const topImpCommodity = topImportCommodities[0]?.commodity_l2 || '—';

  const fmt = (v: number) => metric === 'value' ? formatCurrency(v) : formatVolume(v);
  const cagrColor = (v: number) => (v > 0 ? '#10b981' : v < 0 ? '#ef4444' : 'var(--text-secondary)');
  const cagrSign = (v: number) => (v > 0 ? '+' : '');

  if (exportLoading) return <LoadingState />;

  return (
    <div className="min-h-screen pt-14" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-screen-2xl mx-auto px-4 md:px-8 py-8 space-y-6">

        <div className="flex items-center gap-3">
          <MapPin className="w-7 h-7 flex-shrink-0" style={{ color: 'var(--accent)' }} />
          <h1 className="text-2xl md:text-3xl font-bold font-outfit" style={tp}>Country Trade Analysis</h1>
        </div>

        {/* Country Selector */}
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px] max-w-sm">
            <label className="block text-xs font-semibold mb-1" style={tm}>Select Country</label>
            <select
              className="w-full text-sm px-3 py-2 border outline-none rounded"
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              value={selectedCountry}
              onChange={e => setSelectedCountry(e.target.value)}
            >
              {countries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <KPICard label={`Total Exports (${year})`} value={fmt(exportVal)} icon={<TrendingUp size={16} />} delta={exportYoy} sub="YoY" />
          <KPICard label={`Total Imports (${year})`} value={fmt(importVal)} icon={<TrendingUp size={16} />} delta={importYoy} sub="YoY" />
          <div className="border p-5 flex flex-col gap-2" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
            <span className="text-xs font-dm-sans font-medium uppercase tracking-wide" style={tm}>CAGR (2018–{year})</span>
            <div className="flex flex-col gap-2 mt-1">
              <div className="flex items-center gap-2"><span className="text-xs" style={ts}>Export</span><span className="text-sm font-bold font-dm-mono" style={{ color: cagrColor(exportCagr) }}>{cagrSign(exportCagr)}{exportCagr.toFixed(1)}%</span></div>
              <div className="flex items-center gap-2"><span className="text-xs" style={ts}>Import</span><span className="text-sm font-bold font-dm-mono" style={{ color: cagrColor(importCagr) }}>{cagrSign(importCagr)}{importCagr.toFixed(1)}%</span></div>
            </div>
          </div>
          <div className="border p-5 flex flex-col gap-2" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
            <span className="text-xs font-dm-sans font-medium uppercase tracking-wide" style={tm}>Top Commodity ({year})</span>
            <div className="flex flex-col gap-2 mt-1">
              <div><span className="text-xs" style={tm}>Exp: </span><span className="text-xs font-semibold" style={tp}>{topExpCommodity}</span></div>
              <div><span className="text-xs" style={tm}>Imp: </span><span className="text-xs font-semibold" style={tp}>{topImpCommodity}</span></div>
            </div>
          </div>
        </div>

        {/* Executive Insights + AI */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <div className="border p-5 md:p-6" style={card}>
            <div className="flex items-center gap-2 mb-4"><TrendingUp size={16} style={{ color: 'var(--accent)' }} /><h2 className="text-base font-bold font-outfit" style={tp}>Executive Insights</h2></div>
            <ul className="space-y-2.5">
              {[
                `${selectedCountry} exported ${fmt(exportVal)} in ${year}, ${exportYoy >= 0 ? 'up' : 'down'} ${Math.abs(exportYoy).toFixed(1)}% year-on-year.`,
                `Total imports reached ${fmt(importVal)}, a ${importYoy >= 0 ? 'gain' : 'decline'} of ${Math.abs(importYoy).toFixed(1)}% vs ${year - 1}.`,
                `Export CAGR: ${cagrSign(exportCagr)}${exportCagr.toFixed(1)}%. Import CAGR: ${cagrSign(importCagr)}${importCagr.toFixed(1)}%.`,
                `${selectedCountry} is a ${exportVal >= importVal ? 'net exporter' : 'net importer'} in ${year}.`,
                `Top export destination: ${topExportPartners[0]?.importer || 'N/A'}.`,
                `Top import origin: ${topImportPartners[0]?.exporter || 'N/A'}.`,
                `Leading export commodity: ${topExpCommodity}.`,
              ].map((point, i) => (
                <li key={i} className="flex gap-2.5 text-sm leading-relaxed" style={ts}><span className="flex-shrink-0 w-1.5 h-1.5 rounded-full mt-[7px]" style={{ backgroundColor: 'var(--accent)' }} />{point}</li>
              ))}
            </ul>
          </div>
          <div className="border p-5 md:p-6 flex flex-col" style={card}>
            <div className="flex items-center gap-2 mb-3"><Sparkles size={16} style={{ color: 'var(--accent)' }} /><h2 className="text-base font-bold font-outfit" style={tp}>AI-Powered Market Insights</h2><span className="ml-auto text-xs font-semibold px-2 py-0.5" style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)', opacity: 0.8 }}>Coming Soon</span></div>
            <p className="text-sm mb-4" style={ts}>Ask questions about {selectedCountry}'s trade dynamics.</p>
            <textarea placeholder={`e.g. "What are the top growth opportunities for ${selectedCountry} exports?"`} className="flex-1 w-full p-3 text-sm outline-none border resize-none" style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)', minHeight: 96, opacity: 0.55, cursor: 'not-allowed' }} disabled rows={4} />
            <button disabled className="w-full py-2.5 mt-3 text-xs font-semibold opacity-40 cursor-not-allowed" style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>Generate Insights</button>
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
            ) : (<div className="flex items-center justify-center h-48 text-sm" style={tm}>No trend data available</div>)}
          </div>
          <div className="border p-5 md:p-6" style={card}>
            <SectionHeader title={`${showExportForecast ? 'Export' : 'Import'} Forecast 2025–2030`} action={<ToggleButton label={`Show ${showExportForecast ? 'Import' : 'Export'}`} onClick={() => setShowExportForecast(p => !p)} isActive={false} />} />
            {forecasts.length > 0 ? <ForecastChart historicalData={forecastHistoricalData} forecasts={forecasts} isDark={isDark} metric={metric} /> : <div className="flex items-center justify-center h-48 text-sm" style={tm}>Insufficient data for forecast</div>}
          </div>
        </div>

        {/* Top Partner Countries + Top Commodities */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <div className="border p-5 md:p-6" style={card}>
            <SectionHeader title={`Top ${showTopCountriesExport ? 'Export' : 'Import'} Partners — ${selectedCountry} (${year})`} action={<div className="flex gap-2"><ToggleButton label="Exports" onClick={() => setShowTopCountriesExport(true)} isActive={showTopCountriesExport} /><ToggleButton label="Imports" onClick={() => setShowTopCountriesExport(false)} isActive={!showTopCountriesExport} /></div>} />
            <div className="max-w-xl mx-auto">{topPartnersDonut.length > 0 ? <DonutChart data={topPartnersDonut} isDark={isDark} metric={metric} /> : <div className="flex items-center justify-center h-48 text-sm" style={tm}>No data</div>}</div>
          </div>
          <div className="border p-5 md:p-6" style={card}>
            <SectionHeader title={`Top ${showCommoditiesExport ? 'Export' : 'Import'} Commodities — ${selectedCountry} (${year})`} action={<div className="flex gap-2"><ToggleButton label="Exports" onClick={() => setShowCommoditiesExport(true)} isActive={showCommoditiesExport} /><ToggleButton label="Imports" onClick={() => setShowCommoditiesExport(false)} isActive={!showCommoditiesExport} /></div>} />
            <div className="max-w-xl mx-auto">{commoditiesDonut.length > 0 ? <DonutChart data={commoditiesDonut} isDark={isDark} metric={metric} /> : <div className="flex items-center justify-center h-48 text-sm" style={tm}>No commodity data</div>}</div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default CountryDashboard;