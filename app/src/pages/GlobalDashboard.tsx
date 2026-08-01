import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/ThemeContext';
import { useMetric } from '../lib/MetricContext';
import { useYear } from '../lib/YearContext';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { KPICard } from '../components/KPICard';
import { SankeyChart } from '../components/SankeyChart';
import { TreemapChart } from '../components/TreemapChart';
import { GeographicTreemap } from '../components/GeographicTreemap';
import { generateAllForecasts, ForecastMethod } from '../utils/forecast';
import { formatCurrency, formatVolume } from '../utils/formatters';
import { getChartTheme } from '../utils/chartTheme';
import { CountryLabel } from '../components/CountryLabel';
import { WorldMap } from '../components/WorldMap';
import { MarketIntelligence } from '../components/MarketIntelligence';
import {
  Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ComposedChart, Line, PieChart, Pie, Cell,
  Area, ReferenceLine,
} from 'recharts';
import { TrendingUp, Globe, Package } from 'lucide-react';
import { formatCompactNumber } from '../utils/formatters';

const card = { backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' };
const textPrimary = { color: 'var(--text-primary)' };

const PIE_COLORS = [
  '#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#06b6d4',
  '#f97316', '#14b8a6', '#84cc16', '#e11d48', '#0ea5e9', '#6b7280',
];

const COMMODITY_COLORS = [
  '#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#06b6d4',
  '#f97316', '#14b8a6', '#84cc16', '#e11d48', '#0ea5e9', '#6b7280',
];

const METHOD_COLORS: Record<string, string> = {
  'Linear Trend (OLS)': '#3b82f6',
  'CAGR · 3-Year Base': '#10b981',
  'CAGR · 7-Year Base': '#f59e0b',
  "Holt's Exponential": '#ef4444',
  'Moving Average Trend': '#06b6d4',
};

function getMethodColor(name: string, index: number): string {
  const fallbacks = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];
  return METHOD_COLORS[name] ?? fallbacks[index % fallbacks.length];
}

function fmtVal(v: number, metric: 'value' | 'volume') {
  return metric === 'value' ? formatCurrency(v) : formatVolume(v);
}

function fmtAxis(v: number, metric: 'value' | 'volume') {
  if (metric === 'value') {
    const t = v / 1e12;
    if (t >= 0.1) return `$${t.toFixed(1)}T`;
    const b = v / 1e9;
    if (b >= 1) return `$${b.toFixed(0)}B`;
    return `$${(v / 1e6).toFixed(0)}M`;
  }
  const bn = v / 1e9;
  if (bn >= 1) return `${bn.toFixed(1)}Bn t`;
  const mn = v / 1e6;
  if (mn >= 1) return `${mn.toFixed(0)}Mn t`;
  return `${(v / 1e3).toFixed(0)}K t`;
}

interface PieSlice { name: string; value: number; pct: number; shortName?: string; flag?: string | null }

function TradePieChart({
  data,
  title,
  isDark,
  metric,
}: {
  data: PieSlice[];
  title: string;
  isDark: boolean;
  metric: 'value' | 'volume';
}) {
  const ct = getChartTheme(isDark);
  return (
    <div className="flex flex-col h-full">
      <p className="text-sm font-semibold mb-3" style={textPrimary}>{title}</p>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius="80%"
            dataKey="value"
            nameKey="name"
            paddingAngle={1}
            startAngle={90}
            endAngle={-270}
          >
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={PIE_COLORS[i % PIE_COLORS.length]}
                stroke={isDark ? '#0d1829' : '#ffffff'}
                strokeWidth={1.5}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: ct.tooltipBg,
              border: `1px solid ${ct.tooltipBorder}`,
              borderRadius: '0.375rem',
              fontSize: 12,
              color: ct.tooltipColor,
            }}
            formatter={(value: number, name: string) => {
              const slice = data.find(d => d.name === name);
              return [`${fmtVal(value, metric)} (${slice?.pct.toFixed(1) ?? 0}%)`, name];
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-3 space-y-1.5">
        {data.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5 min-w-0">
            <span
              className="flex-shrink-0 w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
            />
            <span className="text-xs flex-1 min-w-0 truncate" style={{ color: 'var(--text-secondary)' }}>
              <CountryLabel name={item.name} shortName={item.shortName} flag={item.flag} />
            </span>
            <span className="text-xs flex-shrink-0 tabular-nums" style={{ color: 'var(--text-muted)' }}>
              {item.pct.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CommodityPieChart({
  data,
  isDark,
  metric,
}: {
  data: PieSlice[];
  isDark: boolean;
  metric: 'value' | 'volume';
}) {
  const ct = getChartTheme(isDark);
  return (
    <div className="flex flex-col h-full">
      <p className="text-sm font-semibold mb-3" style={textPrimary}>Top Commodities</p>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius="85%"
            innerRadius={0}
            dataKey="value"
            nameKey="name"
            paddingAngle={1}
            startAngle={90}
            endAngle={-270}
          >
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={COMMODITY_COLORS[i % COMMODITY_COLORS.length]}
                stroke={isDark ? '#0d1829' : '#ffffff'}
                strokeWidth={1.5}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: ct.tooltipBg,
              border: `1px solid ${ct.tooltipBorder}`,
              borderRadius: '0.375rem',
              fontSize: 12,
              color: ct.tooltipColor,
            }}
            formatter={(value: number, name: string) => {
              const slice = data.find(d => d.name === name);
              return [`${fmtVal(value, metric)} (${slice?.pct.toFixed(1) ?? 0}%)`, name];
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
        {data.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5 min-w-0">
            <span
              className="flex-shrink-0 w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: COMMODITY_COLORS[i % COMMODITY_COLORS.length] }}
            />
            <span className="text-xs truncate" style={{ color: 'var(--text-secondary)', maxWidth: 110 }}>
              {item.name}
            </span>
            <span className="text-xs flex-shrink-0 tabular-nums" style={{ color: 'var(--text-muted)' }}>
              {item.pct.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompactForecastChart({
  historicalData,
  forecasts,
  isDark,
  metric,
}: {
  historicalData: Array<{ year: number; value: number }>;
  forecasts: ForecastMethod[];
  isDark: boolean;
  metric: 'value' | 'volume';
}) {
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const ct = getChartTheme(isDark);

  const chartData = useMemo(() => {
    if (!historicalData.length || !forecasts.length) return [];
    const lastHistoricalYear = historicalData[historicalData.length - 1].year;
    const allYears = new Set<number>();
    historicalData.forEach(d => allYears.add(d.year));
    forecasts.forEach(m => m.forecasts.forEach(f => allYears.add(f.year)));
    return Array.from(allYears).sort((a, b) => a - b).map(year => {
      const row: Record<string, number | string | null> = { year: year.toString() };
      const histPoint = historicalData.find(d => d.year === year);
      row['Historical'] = histPoint ? histPoint.value : null;
      forecasts.forEach(method => {
        const fPoint = method.forecasts.find(f => f.year === year);
        const isJoin = year === lastHistoricalYear;
        row[method.name] = fPoint ? fPoint.value : (isJoin && histPoint ? histPoint.value : null);
      });
      return row;
    });
  }, [historicalData, forecasts]);

  const lastHistoricalYear = historicalData[historicalData.length - 1]?.year;

  const tooltipStyle = {
    backgroundColor: isDark ? '#1f2937' : '#ffffff',
    border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
    borderRadius: '0.375rem',
    fontSize: 11,
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
        {forecasts.map((method, i) => {
          const color = getMethodColor(method.name, i);
          const isActive = selectedMethod === null || selectedMethod === method.name;
          return (
            <button
              key={method.name}
              onClick={() => setSelectedMethod(prev => prev === method.name ? null : method.name)}
              className="p-2 border-2 text-left transition-all"
              style={{
                borderColor: selectedMethod === method.name ? color : 'var(--border)',
                opacity: !isActive ? 0.4 : 1,
                backgroundColor: 'var(--bg-primary)',
              }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  style={{ display: 'block', width: 16, height: 0, borderTop: `2px dashed ${isActive ? color : '#9ca3af'}` }}
                />
                <span
                  className={`text-xs px-1 py-0.5 font-medium`}
                  style={{
                    backgroundColor: method.confidence === 'High' ? '#d1fae5' : method.confidence === 'Medium' ? '#fef3c7' : '#f3f4f6',
                    color: method.confidence === 'High' ? '#065f46' : method.confidence === 'Medium' ? '#92400e' : '#374151',
                    fontSize: 10,
                  }}
                >
                  {method.confidence}
                </span>
              </div>
              <div className="text-xs font-semibold leading-tight truncate" style={textPrimary}>
                {method.name}
              </div>
              <div className="flex items-center justify-between mt-1 gap-1">
                <span className="text-xs" style={{ color: 'var(--text-muted)', fontSize: 10 }}>2030:</span>
                <span className="text-xs font-bold tabular-nums" style={{ color, fontSize: 10 }}>
                  {fmtVal(method.value2030, metric)}
                </span>
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)', fontSize: 10 }}>
                CAGR {method.cagr.toFixed(1)}%
              </div>
            </button>
          );
        })}
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.gridStroke} />
          <XAxis dataKey="year" stroke={ct.axisStroke} tick={{ fontSize: 10, fill: ct.axisStroke }} />
          <YAxis
            stroke={ct.axisStroke}
            tick={{ fontSize: 10, fill: ct.axisStroke }}
            tickFormatter={(v) => fmtAxis(v, metric)}
            width={62}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={{ fontWeight: 700, color: isDark ? '#f9fafb' : '#111827', fontSize: 11 }}
            formatter={(value: number, name: string) => {
              if (value == null) return null;
              return [fmtVal(value, metric), name];
            }}
          />
          {lastHistoricalYear && (
            <ReferenceLine
              x={lastHistoricalYear.toString()}
              stroke={isDark ? '#6b7280' : '#9ca3af'}
              strokeDasharray="4 4"
              label={{ value: 'Forecast →', position: 'insideTopRight', fontSize: 9, fill: isDark ? '#9ca3af' : '#6b7280' }}
            />
          )}
          <Area
            type="monotone"
            dataKey="Historical"
            stroke="#64748b"
            fill="#64748b"
            fillOpacity={isDark ? 0.15 : 0.1}
            strokeWidth={2}
            dot={false}
            connectNulls={false}
          />
          {forecasts.map((method, i) => {
            const color = getMethodColor(method.name, i);
            const isVisible = selectedMethod === null || selectedMethod === method.name;
            if (!isVisible) return null;
            return (
              <Line
                key={method.name}
                type="monotone"
                dataKey={method.name}
                stroke={color}
                strokeWidth={selectedMethod === method.name ? 2 : 1.5}
                strokeDasharray="6 3"
                dot={false}
                connectNulls={false}
              />
            );
          })}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

const GLOBAL_TOTAL_2024 = 22_859_231_618_696;

function CorridorCountryCell({ name, shortName, flag }: { name: string; shortName?: string | null; flag?: string | null }) {
  return <CountryLabel name={name} shortName={shortName} flag={flag} size={18} />;
}

function CorridorCAGRBadge({ cagr }: { cagr: number | null }) {
  if (cagr === null) return <span style={{ color: 'var(--text-muted)' }} className="text-xs">—</span>;
  const isPositive = cagr >= 0;
  return (
    <span
      className="inline-flex items-center text-xs font-semibold tabular-nums"
      style={{ color: isPositive ? 'var(--positive-text)' : 'var(--negative-text)' }}
    >
      {isPositive ? '+' : ''}{cagr.toFixed(1)}%
    </span>
  );
}

function TradeCorridorsTable({
  corridors,
  corridorHistory,
  metric,
  year,
}: {
  corridors: any[] | undefined;
  corridorHistory: any[] | undefined;
  metric: 'value' | 'volume';
  year: number;
}) {
  const cagrMap = useMemo(() => {
    if (!corridorHistory) return new Map<string, number>();
    const map = new Map<string, number>();
    const byKey = new Map<string, { v2018?: number; v2024?: number }>();
    corridorHistory.forEach(row => {
      const key = `${row.exporter}||${row.importer}`;
      if (!byKey.has(key)) byKey.set(key, {});
      const entry = byKey.get(key)!;
      const val = metric === 'value' ? row.total_value : row.total_volume;
      if (row.year === 2018) entry.v2018 = val;
      if (row.year === 2024) entry.v2024 = val;
    });
    byKey.forEach((entry, key) => {
      if (entry.v2018 && entry.v2024 && entry.v2018 > 0) {
        map.set(key, (Math.pow(entry.v2024 / entry.v2018, 1 / 6) - 1) * 100);
      }
    });
    return map;
  }, [corridorHistory, metric]);

  const rows = useMemo(() => {
    if (!corridors) return [];
    const total = corridors.reduce((s, c) => s + (metric === 'value' ? c.total_value : c.total_volume), 0);
    return corridors.map((c, i) => {
      const val = metric === 'value' ? c.total_value : c.total_volume;
      const key = `${c.exporter}||${c.importer}`;
      return {
        rank: i + 1,
        exporter: c.exporter,
        exporterShort: c.exporter_short,
        exporterFlag: c.exporter_flag,
        importer: c.importer,
        importerShort: c.importer_short,
        importerFlag: c.importer_flag,
        value: val,
        share: total > 0 ? (val / total) * 100 : 0,
        cagr: cagrMap.has(key) ? cagrMap.get(key)! : null,
      };
    });
  }, [corridors, metric, cagrMap]);

  return (
    <div className="border" style={card}>
      <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <h2 className="text-base font-semibold font-outfit" style={textPrimary}>
          Top 50 Trade Corridors ({year})
        </h2>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          Bilateral trade flows ranked by {metric === 'value' ? 'trade value' : 'trade volume'}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: `1px solid var(--border)`, backgroundColor: 'var(--bg-primary)' }}>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                #
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Exporter
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Importer
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                {metric === 'value' ? 'Trade Value' : 'Trade Volume'}
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Share of Top 50
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                CAGR 2018–2024
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={`${row.exporter}-${row.importer}`}
                className="transition-colors"
                style={{ borderBottom: '1px solid var(--border)' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-primary)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <td className="px-4 py-3 text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
                  {row.rank}
                </td>
                <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
                  <CorridorCountryCell name={row.exporter} shortName={row.exporterShort} flag={row.exporterFlag} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
                  <CorridorCountryCell name={row.importer} shortName={row.importerShort} flag={row.importerFlag} />
                </td>
                <td className="px-4 py-3 text-right font-medium tabular-nums" style={{ color: 'var(--text-primary)' }}>
                  {formatCompactNumber(row.value)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {row.share.toFixed(2)}%
                </td>
                <td className="px-4 py-3 text-right">
                  <CorridorCAGRBadge cagr={row.cagr} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function GlobalDashboard() {
  const { isDark } = useTheme();
  const { metric } = useMetric();
  const { year } = useYear();
  const ct = getChartTheme(isDark);

  const { data: globalData, isLoading: globalLoading, error: globalError } = useQuery({
    queryKey: ['global_aggregates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_global_aggregates')
        .select('*')
        .order('year', { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  const { data: topExporterPartners, isLoading: expLoading } = useQuery({
    queryKey: ['top_exporters_pie', year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_top_trade_partners')
        .select('*')
        .eq('year', year)
        .eq('role', 'exporter')
        .order('rank')
        .limit(11);
      if (error) throw error;
      return data;
    }
  });

  const { data: topImporterPartners, isLoading: impLoading } = useQuery({
    queryKey: ['top_importers_pie', year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_top_trade_partners')
        .select('*')
        .eq('year', year)
        .eq('role', 'importer')
        .order('rank')
        .limit(11);
      if (error) throw error;
      return data;
    }
  });

  const { data: regionalTrade, isLoading: regionalLoading } = useQuery({
    queryKey: ['regional_trade', year, metric],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_regional_trade')
        .select('*')
        .eq('year', year)
        .order(metric === 'value' ? 'trade_value' : 'trade_volume', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { data: commodityData, isLoading: commodityLoading } = useQuery({
    queryKey: ['commodity_hierarchy_view', year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_commodity_aggregates')
        .select('commodity_l1, commodity_l2, total_value, total_volume')
        .eq('year', year)
        .order('total_value', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Use country_aggregates_with_region - for display, we'll use export_value for value mode
  const { data: countryAggregates, isLoading: geoLoading } = useQuery({
    queryKey: ['country_aggregates_geo', year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_country_aggregates')
        .select('country, num_code, region, export_value, export_volume, import_value, import_volume')
        .eq('year', year);

      if (error) throw error;

      return (data || []).map((item: any) => ({
        country: item.country,
        num_code: item.num_code,
        region: item.region || 'Other',
        // For value mode, use export_value (exports only) to avoid double counting
        total_value: Number(item.export_value) || 0,
        // For volume mode, use total_volume (which is exports + imports)
        total_volume: (Number(item.export_volume) || 0) + (Number(item.import_volume) || 0),
        export_value: Number(item.export_value) || 0,
        import_value: Number(item.import_value) || 0,
        trade_balance: (Number(item.export_value) || 0) - (Number(item.import_value) || 0)
      }));
    },
    enabled: true,
  });

  const { data: corridors } = useQuery({
    queryKey: ['global_corridors', year, metric],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_bilateral_aggregates')
        .select('*')
        .eq('year', year)
        .order(metric === 'value' ? 'total_value' : 'total_volume', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    }
  });

  const { data: corridorHistory } = useQuery({
    queryKey: ['global_corridors_history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_bilateral_aggregates')
        .select('exporter, importer, year, total_value, total_volume')
        .in('year', [2018, 2024]);
      if (error) throw error;
      return data;
    }
  });

  const forecastHistoricalData = useMemo(() => {
    if (!globalData) return [];
    return globalData.map(d => ({
      year: d.year,
      value: metric === 'value' ? d.total_value : d.total_volume
    }));
  }, [globalData, metric]);

  const forecasts = useMemo(() => {
    if (forecastHistoricalData.length < 3) return [];
    return generateAllForecasts(forecastHistoricalData);
  }, [forecastHistoricalData]);

  const trendData = useMemo(() => {
    if (!globalData) return [];
    return globalData.map((d, i) => {
      const value = metric === 'value' ? d.total_value : d.total_volume;
      const prevValue = i > 0 ? (metric === 'value' ? globalData[i - 1].total_value : globalData[i - 1].total_volume) : value;
      const growth = i > 0 ? ((value - prevValue) / prevValue) * 100 : 0;
      return { year: d.year, value, growth };
    });
  }, [globalData, metric]);

  const currentYearData = useMemo(() => {
    if (!globalData) return null;
    return globalData.find(d => d.year === year);
  }, [globalData, year]);

  const valueCagr = useMemo(() => {
    if (!globalData || globalData.length < 2) return 0;
    const first = globalData[0].total_value;
    const last = globalData[globalData.length - 1].total_value;
    const years = globalData.length - 1;
    return (Math.pow(last / first, 1 / years) - 1) * 100;
  }, [globalData]);

  const volumeCagr = useMemo(() => {
    if (!globalData || globalData.length < 2) return 0;
    const first = globalData[0].total_volume;
    const last = globalData[globalData.length - 1].total_volume;
    const years = globalData.length - 1;
    return (Math.pow(last / first, 1 / years) - 1) * 100;
  }, [globalData]);

  const valueYoY = useMemo(() => {
    if (!trendData.length) return 0;
    return trendData[trendData.length - 1].growth;
  }, [trendData]);

  const volumeYoY = useMemo(() => {
    if (!globalData || globalData.length < 2) return 0;
    const last = globalData[globalData.length - 1].total_volume;
    const prev = globalData[globalData.length - 2].total_volume;
    return ((last - prev) / prev) * 100;
  }, [globalData]);

  const topCommodityL2 = useMemo(() => {
    if (!commodityData || commodityData.length === 0) return null;
    return commodityData[0];
  }, [commodityData]);

  const exporterPieData = useMemo((): PieSlice[] => {
    if (!topExporterPartners) return [];
    const globalTotal = metric === 'value' ? GLOBAL_TOTAL_2024 : (currentYearData?.total_volume ?? 1);
    const top10 = topExporterPartners.slice(0, 10);
    const top10Sum = top10.reduce((s, p) => s + (metric === 'value' ? p.total_value : p.total_volume), 0);
    const othersVal = globalTotal - top10Sum;
    const result: PieSlice[] = top10.map(p => {
      const v = metric === 'value' ? p.total_value : p.total_volume;
      return { name: p.country, shortName: p.country_short, flag: p.flag, value: v, pct: (v / globalTotal) * 100 };
    });
    if (othersVal > 0) {
      result.push({ name: 'Others', value: othersVal, pct: (othersVal / globalTotal) * 100 });
    }
    return result;
  }, [topExporterPartners, metric, currentYearData]);

  const importerPieData = useMemo((): PieSlice[] => {
    if (!topImporterPartners) return [];
    const globalTotal = metric === 'value' ? GLOBAL_TOTAL_2024 : (currentYearData?.total_volume ?? 1);
    const top10 = topImporterPartners.slice(0, 10);
    const top10Sum = top10.reduce((s, p) => s + (metric === 'value' ? p.total_value : p.total_volume), 0);
    const othersVal = globalTotal - top10Sum;
    const result: PieSlice[] = top10.map(p => {
      const v = metric === 'value' ? p.total_value : p.total_volume;
      return { name: p.country, shortName: p.country_short, flag: p.flag, value: v, pct: (v / globalTotal) * 100 };
    });
    if (othersVal > 0) {
      result.push({ name: 'Others', value: othersVal, pct: (othersVal / globalTotal) * 100 });
    }
    return result;
  }, [topImporterPartners, metric, currentYearData]);

  const commodityPieData = useMemo((): PieSlice[] => {
    if (!commodityData || commodityData.length === 0) return [];
    const globalTotal = metric === 'value' ? GLOBAL_TOTAL_2024 : (currentYearData?.total_volume ?? 1);
    const top10 = commodityData.slice(0, 10);
    const top10Sum = top10.reduce((s, c) => s + (metric === 'value' ? c.total_value : c.total_volume), 0);
    const othersVal = globalTotal - top10Sum;
    const result: PieSlice[] = top10.map(c => {
      const v = metric === 'value' ? c.total_value : c.total_volume;
      return { name: c.commodity_l2, value: v, pct: (v / globalTotal) * 100 };
    });
    if (othersVal > 0) {
      result.push({ name: 'Others', value: othersVal, pct: (othersVal / globalTotal) * 100 });
    }
    return result;
  }, [commodityData, metric, currentYearData]);

  const sankeyData = useMemo(() => {
    if (!regionalTrade) return [];
    return regionalTrade.map(r => ({
      exporter_region: r.exporter_region,
      importer_region: r.importer_region,
      value: metric === 'value' ? r.trade_value : r.trade_volume
    }));
  }, [regionalTrade, metric]);

  const treemapData = useMemo(() => {
    if (!commodityData) return [];
    return commodityData.map(c => ({
      commodity_l1: c.commodity_l1,
      commodity_l2: c.commodity_l2,
      value: metric === 'value' ? c.total_value : c.total_volume
    }));
  }, [commodityData, metric]);

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: ct.tooltipBg,
      border: `1px solid ${ct.tooltipBorder}`,
      color: ct.tooltipColor,
      fontSize: 12,
      borderRadius: '0.375rem',
    }
  };

  if (globalLoading || expLoading || impLoading || regionalLoading || commodityLoading || geoLoading) {
    return <LoadingState />;
  }

  if (globalError) {
    return <ErrorState message="Failed to load global trade data" />;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-screen-2xl mx-auto px-4 md:px-8 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Globe className="w-7 h-7 flex-shrink-0" style={{ color: 'var(--accent)' }} />
          <h1 className="text-2xl md:text-3xl font-bold font-outfit" style={textPrimary}>Global Trade Dashboard</h1>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
          <KPICard
            label={`Total Trade Value (${year})`}
            value={currentYearData ? formatCurrency(currentYearData.total_value) : '-'}
            icon={<TrendingUp />}
            delta={valueYoY}
          />
          <div
            className="border p-5 flex flex-col gap-2"
            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-dm-sans font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Value CAGR (2018–2024)
              </span>
              <TrendingUp size={16} style={{ color: 'var(--accent)' }} />
            </div>
            <div
              className="text-2xl font-dm-mono font-semibold"
              style={{
                color: valueCagr > 0 ? 'var(--positive-text)' : valueCagr < 0 ? 'var(--negative-text)' : 'var(--text-primary)',
              }}
            >
              {valueCagr > 0 ? '+' : ''}{valueCagr.toFixed(1)}%
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Compound annual growth rate</div>
          </div>
          <KPICard
            label={`Total Trade Volume (${year})`}
            value={currentYearData ? formatVolume(currentYearData.total_volume) : '-'}
            icon={<Package />}
            delta={volumeYoY}
          />
          <div
            className="border p-5 flex flex-col gap-2"
            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-dm-sans font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Volume CAGR (2018–2024)
              </span>
              <Package size={16} style={{ color: 'var(--accent)' }} />
            </div>
            <div
              className="text-2xl font-dm-mono font-semibold"
              style={{
                color: volumeCagr > 0 ? 'var(--positive-text)' : volumeCagr < 0 ? 'var(--negative-text)' : 'var(--text-primary)',
              }}
            >
              {volumeCagr > 0 ? '+' : ''}{volumeCagr.toFixed(1)}%
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Compound annual growth rate</div>
          </div>
          <KPICard
            label="Top Commodity (L2)"
            value={topCommodityL2 ? topCommodityL2.commodity_l2 : '-'}
            icon={<Package />}
            sub={topCommodityL2 ? formatCurrency(topCommodityL2.total_value) : undefined}
          />
        </div>

        <MarketIntelligence
          scopeKey="global"
          scopeLabel="Global Trade"
          kpis={{
            total_value_2024: currentYearData ? formatCurrency(currentYearData.total_value) : null,
            total_volume_2024: currentYearData ? formatVolume(currentYearData.total_volume) : null,
            value_yoy: `${valueYoY >= 0 ? '+' : ''}${valueYoY.toFixed(1)}%`,
            value_cagr_2018_2024: `${valueCagr >= 0 ? '+' : ''}${valueCagr.toFixed(1)}%`,
            top_exporter: topExporterPartners?.[0]?.country ?? null,
            top_commodity: topCommodityL2?.commodity_l2 ?? null,
          }}
        />

        {/* Trend + Forecast */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <div className="border p-4 md:p-5" style={card}>
            <h2 className="text-sm font-semibold mb-4 font-outfit" style={textPrimary}>
              Trade Trend &amp; Growth ({metric === 'value' ? 'Value' : 'Volume'})
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={trendData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.gridStroke} vertical={false} />
                <XAxis dataKey="year" stroke={ct.axisStroke} tick={{ fill: ct.axisStroke, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  yAxisId="left"
                  stroke={ct.axisStroke}
                  tick={{ fill: ct.axisStroke, fontSize: 10 }}
                  tickFormatter={(v) => fmtAxis(v, metric)}
                  axisLine={false}
                  tickLine={false}
                  width={62}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke={ct.axisStroke}
                  tick={{ fill: ct.axisStroke, fontSize: 10 }}
                  tickFormatter={(v) => `${v.toFixed(0)}%`}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(value: number, name: string) => {
                    if (name === 'growth') return [`${value.toFixed(1)}%`, 'YoY Growth'];
                    return [fmtVal(value, metric), metric === 'value' ? 'Trade Value' : 'Trade Volume'];
                  }}
                />
                <Legend wrapperStyle={{ color: ct.axisStroke, fontSize: 11 }} />
                <Bar yAxisId="left" dataKey="value" fill={ct.barFill} name={metric === 'value' ? 'Trade Value' : 'Trade Volume'} radius={[2, 2, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="growth" stroke={ct.greenLine} strokeWidth={2} name="YoY Growth %" dot={{ r: 3, fill: ct.greenLine }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {forecasts.length > 0 && (
            <div className="border p-4 md:p-5" style={card}>
              <h2 className="text-sm font-semibold mb-3 font-outfit" style={textPrimary}>
                Global Forecast 2025–2030
              </h2>
              <CompactForecastChart
                historicalData={forecastHistoricalData}
                forecasts={forecasts}
                isDark={isDark}
                metric={metric}
              />
            </div>
          )}
        </div>

        {/* Pie Charts: Top Exporters + Top Importers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <div className="border p-4 md:p-5" style={card}>
            <TradePieChart
              data={exporterPieData}
              title={`Top Exporters (${year})`}
              isDark={isDark}
              metric={metric}
            />
          </div>
          <div className="border p-4 md:p-5" style={card}>
            <TradePieChart
              data={importerPieData}
              title={`Top Importers (${year})`}
              isDark={isDark}
              metric={metric}
            />
          </div>
        </div>

        {/* Commodities Section: Treemap (left) + Pie (right) */}
        <div>
          <h2 className="text-base font-semibold mb-4 font-outfit" style={textPrimary}>Commodity Breakdown</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <div className="border p-4 md:p-5" style={card}>
              <h3 className="text-sm font-semibold mb-4 font-outfit" style={textPrimary}>Commodity Hierarchy</h3>
              <TreemapChart data={treemapData} isDark={isDark} />
            </div>
            <div className="border p-4 md:p-5" style={card}>
              <CommodityPieChart
                data={commodityPieData}
                isDark={isDark}
                metric={metric}
              />
            </div>
          </div>
        </div>

        {/* Geography Section: Geo Treemap (left) + Sankey (right) */}
        <div>
          <h2 className="text-base font-semibold mb-4 font-outfit" style={textPrimary}>Geographic Distribution</h2>
          <div className="border p-4 md:p-5 mb-4 md:mb-6" style={card}>
            <h3 className="text-sm font-semibold mb-4 font-outfit" style={textPrimary}>
              Trade Value by Country ({year})
            </h3>
            <WorldMap
              data={(countryAggregates || [])
                .filter((c) => c.num_code)
                .map((c) => ({
                  numCode: c.num_code,
                  value: metric === 'value' ? c.total_value : c.total_volume,
                  label: c.country,
                }))}
              formatValue={(v) => fmtVal(v, metric)}
            />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <div className="border p-4 md:p-5" style={card}>
              <h3 className="text-sm font-semibold mb-4 font-outfit" style={textPrimary}>Geographic Hierarchy (Region → Country)</h3>
              <GeographicTreemap
                countryData={countryAggregates || []}
                isDark={isDark}
                metric={metric}
                formatVal={(v) => fmtVal(v, metric)}
              />
            </div>
            <div className="border p-4 md:p-5" style={card}>
              <h3 className="text-sm font-semibold mb-4 font-outfit" style={textPrimary}>Regional Trade Flows</h3>
              <SankeyChart data={sankeyData} isDark={isDark} />
            </div>
          </div>
        </div>

        {/* Trade Corridors Table */}
        <TradeCorridorsTable
          corridors={corridors ?? undefined}
          corridorHistory={corridorHistory ?? undefined}
          metric={metric}
          year={year}
        />
      </div>
    </div>
  );
}