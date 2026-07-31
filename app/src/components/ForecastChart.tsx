import { useMemo, useState } from 'react';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { ForecastMethod } from '../utils/forecast';
import { formatCurrency, formatVolume } from '../utils/formatters';

interface ForecastChartProps {
  historicalData: Array<{ year: number; value: number }>;
  forecasts: ForecastMethod[];
  isDark: boolean;
  metric: 'value' | 'volume';
  title?: string;
}

const METHOD_COLORS: Record<string, string> = {
  'Linear Trend (OLS)': '#3b82f6',
  'CAGR · 3-Year Base': '#10b981',
  'CAGR · 7-Year Base': '#f59e0b',
  "Holt's Exponential": '#ef4444',
  'Moving Average Trend': '#06b6d4',
};

const CONFIDENCE_LABELS: Record<string, string> = {
  High: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  Medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  Low: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400',
};

function getMethodColor(name: string, index: number): string {
  const fallbacks = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];
  return METHOD_COLORS[name] ?? fallbacks[index % fallbacks.length];
}

export function ForecastChart({ historicalData, forecasts, isDark, metric, title }: ForecastChartProps) {
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  const chartData = useMemo(() => {
    if (!historicalData.length || !forecasts.length) return [];

    const lastHistoricalYear = historicalData[historicalData.length - 1].year;

    const allYears = new Set<number>();
    historicalData.forEach(d => allYears.add(d.year));
    forecasts.forEach(m => m.forecasts.forEach(f => allYears.add(f.year)));

    const sortedYears = Array.from(allYears).sort((a, b) => a - b);

    return sortedYears.map(year => {
      const row: Record<string, number | string | null> = { year: year.toString() };

      const histPoint = historicalData.find(d => d.year === year);
      row['Historical'] = histPoint ? histPoint.value : null;

      forecasts.forEach(method => {
        const fPoint = method.forecasts.find(f => f.year === year);
        const isJoin = year === lastHistoricalYear;
        if (fPoint) {
          row[method.name] = fPoint.value;
        } else if (isJoin && histPoint) {
          row[method.name] = histPoint.value;
        } else {
          row[method.name] = null;
        }
      });

      return row;
    });
  }, [historicalData, forecasts]);

  const lastHistoricalYear = historicalData[historicalData.length - 1]?.year;

  const tooltipStyle = {
    backgroundColor: isDark ? '#1f2937' : '#ffffff',
    border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
    borderRadius: '0.5rem',
    fontSize: 12,
  };

  const formatValue = (v: number) =>
    metric === 'value' ? formatCurrency(v) : formatVolume(v);

  const activeForecasts = selectedMethod
    ? forecasts.filter(m => m.name === selectedMethod)
    : forecasts;

  return (
    <div className="space-y-4">
      {title && (
        <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300">{title}</h3>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {forecasts.map((method, i) => {
          const color = getMethodColor(method.name, i);
          const isActive = selectedMethod === null || selectedMethod === method.name;
          return (
            <button
              key={method.name}
              onClick={() => setSelectedMethod(prev => prev === method.name ? null : method.name)}
              className={`p-3 rounded-lg border-2 text-left transition-all ${
                selectedMethod === method.name
                  ? 'border-opacity-100 shadow-md'
                  : selectedMethod !== null
                  ? 'opacity-40 border-gray-200 dark:border-gray-700'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
              style={selectedMethod === method.name ? { borderColor: color } : {}}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className="w-3 h-0.5 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: isActive ? color : '#9ca3af',
                    borderTop: `2px dashed ${isActive ? color : '#9ca3af'}`,
                    display: 'block',
                    height: 0,
                    width: 20,
                  }}
                />
                <span
                  className={`text-xs px-1.5 py-0.5 rounded font-medium ${CONFIDENCE_LABELS[method.confidence]}`}
                >
                  {method.confidence}
                </span>
              </div>
              <div className="text-xs font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                {method.name}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                2030 CAGR: <span className="font-medium" style={{ color: isActive ? color : undefined }}>{method.cagr.toFixed(1)}%</span>
              </div>
            </button>
          );
        })}
      </div>

      {selectedMethod && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {forecasts.find(m => m.name === selectedMethod)?.description}
          {' '}
          <button
            className="text-blue-600 dark:text-blue-400 underline"
            onClick={() => setSelectedMethod(null)}
          >
            Show all methods
          </button>
        </p>
      )}

      <ResponsiveContainer width="100%" height={420}>
        <ComposedChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
          <XAxis dataKey="year" stroke={isDark ? '#9ca3af' : '#6b7280'} tick={{ fontSize: 12 }} />
          <YAxis
            stroke={isDark ? '#9ca3af' : '#6b7280'}
            tick={{ fontSize: 11 }}
            tickFormatter={formatValue}
            width={80}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={{ fontWeight: 700, color: isDark ? '#f9fafb' : '#111827' }}
            formatter={(value: number, name: string) => {
              if (value == null) return null;
              return [formatValue(value), name];
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            formatter={(value) => (
              <span style={{ color: isDark ? '#d1d5db' : '#374151' }}>{value}</span>
            )}
          />
          {lastHistoricalYear && (
            <ReferenceLine
              x={lastHistoricalYear.toString()}
              stroke={isDark ? '#6b7280' : '#9ca3af'}
              strokeDasharray="4 4"
              label={{ value: 'Forecast →', position: 'insideTopRight', fontSize: 10, fill: isDark ? '#9ca3af' : '#6b7280' }}
            />
          )}

          <Area
            type="monotone"
            dataKey="Historical"
            stroke="#64748b"
            fill="#64748b"
            fillOpacity={isDark ? 0.15 : 0.1}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5 }}
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
                strokeWidth={selectedMethod === method.name ? 2.5 : 1.5}
                strokeDasharray="6 3"
                dot={false}
                activeDot={{ r: 4, fill: color }}
                connectNulls={false}
                opacity={isVisible ? 1 : 0}
              />
            );
          })}
        </ComposedChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-1">
        {activeForecasts.map((method, i) => {
          const color = getMethodColor(method.name, forecasts.indexOf(method));
          const value2030 = method.value2030;
          return (
            <div key={method.name} className="text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400">2030 Est.</div>
              <div className="text-sm font-bold" style={{ color }}>{formatValue(value2030)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
