import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/ThemeContext';
import { useYear } from '../lib/YearContext';
import { useMetric } from '../lib/MetricContext';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { KPICard } from '../components/KPICard';
import { ForecastChart } from '../components/ForecastChart';
import { generateAllForecasts } from '../utils/forecast';
import { formatCurrency, formatVolume } from '../utils/formatters';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Line } from 'recharts';
import { DollarSign, TrendingUp, Package, Sparkles } from 'lucide-react';
import { getChartTheme } from '../utils/chartTheme';

const card = { backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' };
const textPrimary = { color: 'var(--text-primary)' };
const textSecondary = { color: 'var(--text-secondary)' };
const textMuted = { color: 'var(--text-muted)' };

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4 gap-3">
      <h2 className="text-base font-bold font-outfit" style={textPrimary}>{title}</h2>
      {action}
    </div>
  );
}

export function DollarPerTonDashboard() {
  const { isDark } = useTheme();
  const ct = getChartTheme(isDark);
  const { year } = useYear();
  const { metric } = useMetric();

  // Fetch price data for current year
  const { data: priceData, isLoading, error } = useQuery({
    queryKey: ['price_per_ton', year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_commodity_aggregates')
        .select('*')
        .eq('year', year)
        .order('price_per_ton', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Fetch historical price data for trends
  const { data: historicalPrice } = useQuery({
    queryKey: ['price_history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_commodity_aggregates')
        .select('*')
        .order('year', { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  // Top L2 commodity by $/Ton (for card)
  const topL2Commodity = useMemo(() => {
    if (!priceData || priceData.length === 0) return { commodity: '—', price: 0 };
    const top = priceData.reduce((max, item) => 
      item.price_per_ton > max.price_per_ton ? item : max, priceData[0]);
    return { commodity: top.commodity_l2, price: top.price_per_ton };
  }, [priceData]);

  // L1 Data aggregated
  const l1Data = useMemo(() => {
    if (!priceData) return [];
    const l1Map = new Map<string, { totalValue: number; totalVolume: number }>();

    priceData.forEach(d => {
      if (!l1Map.has(d.commodity_l1)) {
        l1Map.set(d.commodity_l1, { totalValue: 0, totalVolume: 0 });
      }
      const current = l1Map.get(d.commodity_l1)!;
      current.totalValue += d.price_per_ton * d.total_volume;
      current.totalVolume += d.total_volume;
    });

    return Array.from(l1Map.entries())
      .map(([name, data]) => ({
        commodity: name,
        pricePerTon: data.totalValue / data.totalVolume
      }))
      .sort((a, b) => b.pricePerTon - a.pricePerTon);
  }, [priceData]);

  // L2 Data (Top 20)
  const l2Data = useMemo(() => {
    if (!priceData) return [];
    return priceData
      .map(d => ({
        commodity: d.commodity_l2,
        pricePerTon: d.price_per_ton
      }))
      .sort((a, b) => b.pricePerTon - a.pricePerTon);
  }, [priceData]);

  // Trend data with YoY growth
  const trendData = useMemo(() => {
    if (!historicalPrice) return [];
    const yearlyData = new Map<number, { totalValue: number; totalVolume: number }>();

    historicalPrice.forEach(d => {
      if (!yearlyData.has(d.year)) {
        yearlyData.set(d.year, { totalValue: 0, totalVolume: 0 });
      }
      const yearData = yearlyData.get(d.year)!;
      yearData.totalValue += d.price_per_ton * d.total_volume;
      yearData.totalVolume += d.total_volume;
    });

    const result = Array.from(yearlyData.entries())
      .map(([year, data]) => ({
        year,
        avgPrice: data.totalValue / data.totalVolume,
        volume: data.totalVolume,
        value: data.totalValue
      }))
      .sort((a, b) => a.year - b.year);

    return result.map((d, i) => {
      const prevPrice = i > 0 ? result[i - 1].avgPrice : d.avgPrice;
      const priceGrowth = i > 0 ? ((d.avgPrice - prevPrice) / prevPrice) * 100 : 0;
      const prevVolume = i > 0 ? result[i - 1].volume : d.volume;
      const volumeGrowth = i > 0 ? ((d.volume - prevVolume) / prevVolume) * 100 : 0;
      const prevValue = i > 0 ? result[i - 1].value : d.value;
      const valueGrowth = i > 0 ? ((d.value - prevValue) / prevValue) * 100 : 0;

      return { ...d, priceGrowth, volumeGrowth, valueGrowth };
    });
  }, [historicalPrice]);

  const currentData = useMemo(() => {
    return trendData.find(d => d.year === year);
  }, [trendData, year]);

  const priceCagr = useMemo(() => {
    if (!trendData || trendData.length < 2) return 0;
    const first = trendData[0].avgPrice;
    const last = trendData[trendData.length - 1].avgPrice;
    const years = trendData.length - 1;
    return ((Math.pow(last / first, 1 / years) - 1) * 100);
  }, [trendData]);

  // Forecast data for Avg $/Ton
  const forecastHistoricalData = useMemo(() => {
    if (!trendData || trendData.length === 0) return [];
    return trendData.map(d => ({ year: d.year, value: d.avgPrice }));
  }, [trendData]);

  const forecasts = useMemo(() => {
    if (forecastHistoricalData.length < 3) return [];
    return generateAllForecasts(forecastHistoricalData);
  }, [forecastHistoricalData]);

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message="Failed to load price per ton data" />;
  }

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: ct.tooltipBg,
      border: `1px solid ${ct.tooltipBorder}`,
      color: ct.tooltipColor,
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-screen-2xl mx-auto px-4 md:px-8 py-8 space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-3">
          <DollarSign className="w-7 h-7 flex-shrink-0" style={{ color: 'var(--accent)' }} />
          <h1 className="text-2xl md:text-3xl font-bold font-outfit" style={textPrimary}>$/Ton Analysis</h1>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <KPICard
            label="Avg $/Ton"
            value={currentData ? `$${currentData.avgPrice.toFixed(2)}` : '-'}
            icon={<DollarSign />}
            delta={currentData?.priceGrowth || 0}
            sub="YoY"
          />
          <KPICard
            label="Price CAGR"
            value={`${priceCagr.toFixed(1)}%`}
            icon={<TrendingUp />}
          />
          <KPICard
            label={`Total Volume (${year})`}
            value={currentData ? formatVolume(currentData.volume) : '-'}
            icon={<Package />}
            delta={currentData?.volumeGrowth || 0}
            sub="YoY"
          />
          <KPICard
            label="Top L2 Commodity"
            value={topL2Commodity.commodity}
            icon={<DollarSign />}
            sub={`$${topL2Commodity.price.toFixed(2)}/ton`}
          />
        </div>

        {/* Executive Insights + AI */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <div className="border p-5 md:p-6" style={card}>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={16} style={{ color: 'var(--accent)' }} />
              <h2 className="text-base font-bold font-outfit" style={textPrimary}>Executive Insights</h2>
            </div>
            <ul className="space-y-2.5">
              {[
                `The average price per ton in ${year} was $${currentData?.avgPrice.toFixed(2) || 0}, ${currentData && currentData.priceGrowth > 0 ? 'up' : 'down'} ${Math.abs(currentData?.priceGrowth || 0).toFixed(1)}% year-on-year.`,
                `Price CAGR since 2018 is ${priceCagr > 0 ? '+' : ''}${priceCagr.toFixed(1)}%, reflecting ${priceCagr > 0 ? 'increasing' : 'decreasing'} commodity values.`,
                `Highest value commodity: ${topL2Commodity.commodity} at $${topL2Commodity.price.toFixed(2)}/ton.`,
                `Total trade volume reached ${currentData ? formatVolume(currentData.volume) : '-'} in ${year}, with total value of ${currentData ? formatCurrency(currentData.value) : '-'}.`,
                `Price per ton analysis reveals value density across commodities, with higher-value goods commanding premium transport and logistics costs.`,
              ].map((point, i) => (
                <li key={i} className="flex gap-2.5 text-sm leading-relaxed" style={textSecondary}>
                  <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full mt-[7px]" style={{ backgroundColor: 'var(--accent)' }} />
                  {point}
                </li>
              ))}
            </ul>
          </div>

          <div className="border p-5 md:p-6 flex flex-col" style={card}>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} style={{ color: 'var(--accent)' }} />
              <h2 className="text-base font-bold font-outfit" style={textPrimary}>AI-Powered Market Insights</h2>
              <span className="ml-auto text-xs font-semibold px-2 py-0.5" style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)', opacity: 0.8 }}>
                Coming Soon
              </span>
            </div>
            <p className="text-sm mb-4" style={textSecondary}>
              Ask questions about commodity price trends, $/ton analysis, and market drivers.
            </p>
            <textarea
              placeholder={`e.g. "Which commodities have the highest price per ton?"`}
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

        {/* Price Trends & Growth + Forecast - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Price Trends Chart */}
          <div className="border p-4 md:p-6" style={card}>
            <SectionHeader title={`Price Trends & Growth (${year})`} />
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.gridStroke} />
                <XAxis dataKey="year" stroke={ct.axisStroke} tick={{ fill: ct.axisStroke, fontSize: 11 }} />
                <YAxis yAxisId="left" stroke={ct.axisStroke} tick={{ fill: ct.axisStroke, fontSize: 10 }} tickFormatter={(v) => `$${v.toFixed(0)}`} width={68} />
                <YAxis yAxisId="right" orientation="right" stroke={ct.axisStroke} tick={{ fill: ct.axisStroke, fontSize: 10 }} tickFormatter={(v) => `${Number(v).toFixed(0)}%`} width={44} />
                <Tooltip {...tooltipStyle} formatter={(value: any, name: string) => {
                  if (name.includes('Growth')) return [`${Number(value).toFixed(1)}%`, name];
                  if (name.includes('Price')) return [`$${Number(value).toFixed(2)}`, name];
                  return [formatVolume(value), name];
                }} />
                <Legend wrapperStyle={{ color: ct.axisStroke, fontSize: 11 }} />
                <Bar yAxisId="left" dataKey="avgPrice" fill={ct.barFill} name="Avg $/Ton" maxBarSize={32} />
                <Line yAxisId="right" type="monotone" dataKey="volumeGrowth" stroke={ct.greenLine} strokeWidth={2} name="Volume Growth %" dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="valueGrowth" stroke={ct.amberLine} strokeWidth={2} name="Value Growth %" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Forecast Chart */}
          <div className="border p-4 md:p-6" style={card}>
            <SectionHeader title={`Avg $/Ton Forecast 2025–2030`} />
            {forecasts.length > 0 ? (
              <ForecastChart
                historicalData={forecastHistoricalData}
                forecasts={forecasts}
                isDark={isDark}
                metric="value"
              />
            ) : (
              <div className="flex items-center justify-center h-48 text-sm" style={textSecondary}>
                Insufficient data for forecast
              </div>
            )}
          </div>
        </div>

        {/* L1 & L2 Commodities by $/Ton - Side by Side with Centered Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* L1 Commodities by $/Ton */}
          <div className="border p-4 md:p-6" style={card}>
            <SectionHeader title="Level 1 Commodities by $/Ton" />
            <div className="flex justify-center">
              <ResponsiveContainer width="100%" height={500}>
                <BarChart data={l1Data} layout="vertical" margin={{ left: 20, right: 20, top: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={ct.gridStroke} />
                  <XAxis type="number" stroke={ct.axisStroke} tick={{ fill: ct.axisStroke, fontSize: 11 }} tickFormatter={(v) => `$${v.toFixed(0)}`} />
                  <YAxis type="category" dataKey="commodity" stroke={ct.axisStroke} tick={{ fill: ct.axisStroke, fontSize: 11 }} width={150} />
                  <Tooltip {...tooltipStyle} formatter={(value: any) => [`$${Number(value).toFixed(2)}/ton`, 'Price per Ton']} />
                  <Bar dataKey="pricePerTon" fill={ct.barFill2} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* L2 Commodities by $/Ton */}
          <div className="border p-4 md:p-6" style={card}>
            <SectionHeader title="Level 2 Commodities by $/Ton" />
            <div className="flex justify-center">
              <ResponsiveContainer width="100%" height={500}>
                <BarChart data={l2Data} layout="vertical" margin={{ left: 20, right: 20, top: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={ct.gridStroke} />
                  <XAxis type="number" stroke={ct.axisStroke} tick={{ fill: ct.axisStroke, fontSize: 11 }} tickFormatter={(v) => `$${v.toFixed(0)}`} />
                  <YAxis type="category" dataKey="commodity" stroke={ct.axisStroke} tick={{ fill: ct.axisStroke, fontSize: 11 }} width={200} />
                  <Tooltip {...tooltipStyle} formatter={(value: any) => [`$${Number(value).toFixed(2)}/ton`, 'Price per Ton']} />
                  <Bar dataKey="pricePerTon" fill={ct.lineFill} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}