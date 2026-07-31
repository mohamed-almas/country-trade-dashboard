import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/ThemeContext';
import { useMetric } from '../lib/MetricContext';
import { useYear } from '../lib/YearContext';
import { LoadingState } from '../components/LoadingState';
import { KPICard } from '../components/KPICard';
import { DonutChart } from '../components/DonutChart';
import { SearchableDropdown } from '../components/SearchableDropdown';
import { ForecastChart } from '../components/ForecastChart';
import { generateAllForecasts } from '../utils/forecast';
import { formatCurrency, formatVolume } from '../utils/formatters';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowLeftRight, TrendingUp, ArrowRightLeft, Scale } from 'lucide-react';
import { MarketIntelligence } from '../components/MarketIntelligence';
import { getChartTheme } from '../utils/chartTheme';

const card = { backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' };
const textPrimary = { color: 'var(--text-primary)' };
const textSecondary = { color: 'var(--text-secondary)' };
const textMuted = { color: 'var(--text-muted)' };

type BilateralRow = {
  year: number;
  exporter: string;
  importer: string;
  total_value: number;
  total_volume: number;
};

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4 gap-3">
      <h2 className="text-base font-bold font-outfit" style={textPrimary}>{title}</h2>
      {action}
    </div>
  );
}

export function BilateralDashboard() {
  const { isDark } = useTheme();
  const ct = getChartTheme(isDark);
  const { metric } = useMetric();
  const { year } = useYear();
  const [exporter, setExporter] = useState<string>('China');
  const [importer, setImporter] = useState<string>('United States of America');

  const { data: countries } = useQuery({
    queryKey: ['countries_list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_countries_list')
        .select('country')
        .order('country', { ascending: true });
      if (error) throw error;
      return data.map(d => d.country as string);
    }
  });

  function swapCountries() {
    setExporter(importer);
    setImporter(exporter);
  }

  // Bilateral trade history
  const { data: bilateralHistory, isLoading } = useQuery({
    queryKey: ['bilateral_history', exporter, importer],
    queryFn: async () => {
      if (!exporter || !importer) return [] as BilateralRow[];
      const { data, error } = await supabase
        .from('mv_bilateral_aggregates')
        .select('year, exporter, importer, total_value, total_volume')
        .eq('exporter', exporter)
        .eq('importer', importer)
        .order('year', { ascending: true });
      if (error) throw error;
      return (data ?? []) as BilateralRow[];
    },
    enabled: !!exporter && !!importer
  });

  // Top commodities traded between these two countries (from materialized view)
  const { data: bilateralCommodities = [] } = useQuery({
    queryKey: ['bilateral_commodities', exporter, importer, year],
    queryFn: async () => {
      if (!exporter || !importer) return [];
      const { data, error } = await supabase
        .from('mv_bilateral_commodity')
        .select('commodity_l2, total_value, total_volume')
        .eq('year', year)
        .eq('exporter', exporter)
        .eq('importer', importer)
        .order('total_value', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!exporter && !!importer,
  });

  // Top commodity for the card
  const topCommodity = bilateralCommodities[0]?.commodity_l2 || '—';

  const trendData = useMemo(() => {
    if (!bilateralHistory || bilateralHistory.length === 0) return [];
    return bilateralHistory.map((d, i) => {
      const value = metric === 'value' ? d.total_value : d.total_volume;
      const prev = i > 0
        ? (metric === 'value' ? bilateralHistory[i - 1].total_value : bilateralHistory[i - 1].total_volume)
        : value;
      const growth = i > 0 && prev !== 0 ? ((value - prev) / prev) * 100 : 0;
      return { year: d.year, value, growth };
    });
  }, [bilateralHistory, metric]);

  const forecastHistoricalData = useMemo(() => {
    if (trendData.length === 0) return [];
    return trendData.map(d => ({ year: d.year, value: d.value }));
  }, [trendData]);

  const forecasts = useMemo(() => {
    if (forecastHistoricalData.length < 3) return [];
    return generateAllForecasts(forecastHistoricalData);
  }, [forecastHistoricalData]);

  const currentData = useMemo(() => trendData.find(d => d.year === year), [trendData, year]);

  const cagr = useMemo(() => {
    if (trendData.length < 2) return 0;
    const first = trendData[0].value;
    const last = trendData[trendData.length - 1].value;
    if (first === 0) return 0;
    return (Math.pow(last / first, 1 / (trendData.length - 1)) - 1) * 100;
  }, [trendData]);

  // Bilateral commodities donut
  const bilateralCommoditiesDonut = useMemo(() => {
    if (!bilateralCommodities || bilateralCommodities.length === 0) return [];
    const totalValue = currentData?.value ?? 0;
    const top = bilateralCommodities.map((c: any) => ({
      name: c.commodity_l2,
      value: metric === 'value' ? Number(c.total_value) : Number(c.total_volume),
    }));
    const topSum = top.reduce((s: number, r: any) => s + r.value, 0);
    const others = totalValue - topSum;
    if (others > 0 && others > topSum * 0.01) top.push({ name: 'Others', value: others });
    return top;
  }, [bilateralCommodities, currentData, metric]);

  const yoyGrowth = currentData?.growth ?? 0;
  const hasNoTrade = bilateralHistory && bilateralHistory.length === 0;

  if (isLoading) return <LoadingState />;

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: ct.tooltipBg,
      border: `1px solid ${ct.tooltipBorder}`,
      color: ct.tooltipColor,
    }
  };

  return (
    <div className="min-h-screen pt-14" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-screen-2xl mx-auto px-4 md:px-8 py-8 space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-3">
          <ArrowLeftRight className="w-7 h-7 flex-shrink-0" style={{ color: 'var(--accent)' }} />
          <h1 className="text-2xl md:text-3xl font-bold font-outfit" style={textPrimary}>Bilateral Trade Analysis</h1>
        </div>

        {/* Country Selectors */}
        <div className="border p-4 md:p-6" style={card}>
          <div className="flex flex-col lg:flex-row items-stretch lg:items-end gap-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold mb-2" style={textMuted}>Exporter</label>
              <SearchableDropdown
                options={countries ?? []}
                value={exporter}
                onChange={(v) => { setExporter(v); }}
                placeholder="Choose exporter..."
              />
            </div>
            <div className="flex justify-center lg:pb-0.5">
              <button
                onClick={swapCountries}
                className="flex items-center gap-2 px-3 py-2 text-sm font-semibold border transition-colors"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                title="Swap exporter and importer"
              >
                <ArrowRightLeft size={14} />
                <span className="hidden sm:inline">Switch</span>
              </button>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold mb-2" style={textMuted}>Importer</label>
              <SearchableDropdown
                options={countries ?? []}
                value={importer}
                onChange={(v) => { setImporter(v); }}
                placeholder="Choose importer..."
              />
            </div>
          </div>
        </div>

        {/* No Trade Message */}
        {hasNoTrade && (
          <div className="border p-6 text-center" style={card}>
            <p className="text-sm" style={textSecondary}>
              There is no trade between {exporter} and {importer} for the selected period.
            </p>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <KPICard
            label={`Trade ${metric === 'value' ? 'Value' : 'Volume'} (${year})`}
            value={currentData ? (metric === 'value' ? formatCurrency(currentData.value) : formatVolume(currentData.value)) : '-'}
            icon={<TrendingUp />}
            delta={yoyGrowth}
            sub="YoY"
          />
          <KPICard
            label={metric === 'value' ? `Trade Volume (${year})` : `Trade Value (${year})`}
            value={currentData
              ? (metric === 'value' ? formatVolume(bilateralHistory?.find(d => d.year === year)?.total_volume ?? 0) : formatCurrency(bilateralHistory?.find(d => d.year === year)?.total_value ?? 0))
              : '-'}
            icon={<TrendingUp />}
          />
          <KPICard
            label="YoY Growth"
            value={currentData ? `${yoyGrowth.toFixed(1)}%` : '-'}
            icon={<Scale />}
            delta={yoyGrowth}
          />
          <KPICard
            label="Top Commodity"
            value={topCommodity}
            icon={<TrendingUp />}
            sub="Most traded"
          />
        </div>

        {/* Executive Insights + AI */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <div className="border p-5 md:p-6" style={card}>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={16} style={{ color: 'var(--accent)' }} />
              <h2 className="text-base font-bold font-outfit" style={textPrimary}>Executive Insights</h2>
            </div>
            {hasNoTrade ? (
              <p className="text-sm leading-relaxed" style={textSecondary}>
                No trade exists between {exporter} and {importer}. This could be due to geographical distance, trade barriers, or lack of economic complementarity.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {[
                  `${exporter} exported ${metric === 'value' ? formatCurrency(currentData?.value || 0) : formatVolume(currentData?.value || 0)} to ${importer} in ${year}, ${yoyGrowth >= 0 ? 'up' : 'down'} ${Math.abs(yoyGrowth).toFixed(1)}% year-on-year.`,
                  `The bilateral trade relationship shows a CAGR of ${cagr.toFixed(1)}% over the period.`,
                  `Top traded commodity: ${topCommodity}.`,
                  `Trade between these nations is influenced by economic policies, supply chains, and market demand.`,
                ].map((point, i) => (
                  <li key={i} className="flex gap-2.5 text-sm leading-relaxed" style={textSecondary}>
                    <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full mt-[7px]" style={{ backgroundColor: 'var(--accent)' }} />
                    {point}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <MarketIntelligence
            scopeKey={`corridor:${exporter}->${importer}`}
            scopeLabel={`${exporter} → ${importer} Trade Corridor`}
            kpis={{
              trade_value: metric === 'value' ? formatCurrency(currentData?.value || 0) : formatVolume(currentData?.value || 0),
              yoy_growth: `${yoyGrowth >= 0 ? '+' : ''}${yoyGrowth.toFixed(1)}%`,
              cagr: `${cagr.toFixed(1)}%`,
              top_commodity: topCommodity,
              has_trade: !hasNoTrade,
            }}
          />
        </div>

        {/* Trade Trend + Forecast - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Trade Trend Chart */}
          <div className="border p-4 md:p-6" style={card}>
            <SectionHeader title={`Trade Trend & Growth (${metric === 'value' ? 'Value' : 'Volume'}) — ${exporter} → ${importer}`} />
            {trendData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-sm" style={textSecondary}>
                No data found for this country pair
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={ct.gridStroke} />
                  <XAxis dataKey="year" stroke={ct.axisStroke} tick={{ fill: ct.axisStroke, fontSize: 11 }} />
                  <YAxis yAxisId="left" stroke={ct.axisStroke} tick={{ fill: ct.axisStroke, fontSize: 10 }} tickFormatter={(v) => metric === 'value' ? formatCurrency(v) : formatVolume(v)} width={68} />
                  <YAxis yAxisId="right" orientation="right" stroke={ct.axisStroke} tick={{ fill: ct.axisStroke, fontSize: 10 }} tickFormatter={(v) => `${Number(v).toFixed(0)}%`} width={44} />
                  <Tooltip {...tooltipStyle} formatter={(value: any, name: string) => {
                    if (name === 'YoY Growth %') return [`${Number(value).toFixed(1)}%`, name];
                    return [metric === 'value' ? formatCurrency(value) : formatVolume(value), name];
                  }} />
                  <Legend wrapperStyle={{ color: ct.axisStroke, fontSize: 11 }} />
                  <Bar yAxisId="left" dataKey="value" fill={ct.barFill} name={metric === 'value' ? 'Trade Value' : 'Trade Volume'} maxBarSize={32} />
                  <Line yAxisId="right" type="monotone" dataKey="growth" stroke={ct.greenLine} strokeWidth={2} name="YoY Growth %" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Forecast Chart */}
          {forecasts.length > 0 && !hasNoTrade ? (
            <div className="border p-4 md:p-6" style={card}>
              <SectionHeader title={`Bilateral Forecast 2025–2030 — ${exporter} → ${importer}`} />
              <ForecastChart
                historicalData={forecastHistoricalData}
                forecasts={forecasts}
                isDark={isDark}
                metric={metric}
              />
            </div>
          ) : (
            <div className="border p-4 md:p-6 flex items-center justify-center" style={card}>
              <p className="text-sm" style={textSecondary}>Insufficient data for forecast</p>
            </div>
          )}
        </div>

        {/* Top Commodities Traded Donut - Bilateral specific */}
        <div className="border p-4 md:p-6" style={card}>
          <SectionHeader title={`Top Commodities Traded — ${exporter} → ${importer} (${year})`} />
          <div className="max-w-xl mx-auto">
            {bilateralCommoditiesDonut.length > 0 ? (
              <DonutChart data={bilateralCommoditiesDonut} isDark={isDark} metric={metric} />
            ) : (
              <div className="flex items-center justify-center h-48 text-sm" style={textSecondary}>
                No commodity data available for this bilateral relationship
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}