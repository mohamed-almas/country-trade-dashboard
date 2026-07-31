import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCompactNumber } from '../utils/formatters';
import { CountryLabel } from './CountryLabel';

const COLORS = [
  '#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#06b6d4',
  '#f97316', '#14b8a6', '#84cc16', '#e11d48', '#0ea5e9', '#6b7280',
];

interface DonutChartProps {
  data: Array<{ name: string; value: number; shortName?: string; flag?: string | null }>;
  isDark: boolean;
  metric: 'value' | 'volume';
}

export function DonutChart({ data, isDark, metric }: DonutChartProps) {
  const sortedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    const withoutOthers = data.filter(d => d.name !== 'Others').sort((a, b) => b.value - a.value);
    const others = data.find(d => d.name === 'Others');
    return others ? [...withoutOthers, others] : withoutOthers;
  }, [data]);

  const total = useMemo(() => sortedData.reduce((sum, item) => sum + item.value, 0), [sortedData]);

  if (sortedData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 dark:text-gray-500 text-sm">
        No data available
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="relative">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={sortedData}
              cx="50%"
              cy="50%"
              innerRadius="55%"
              outerRadius="78%"
              dataKey="value"
              nameKey="name"
              paddingAngle={2}
              startAngle={90}
              endAngle={-270}
            >
              {sortedData.map((_, i) => (
                <Cell
                  key={i}
                  fill={COLORS[i % COLORS.length]}
                  stroke={isDark ? '#1f2937' : '#ffffff'}
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? '#1f2937' : '#ffffff',
                border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
                borderRadius: '0.5rem',
                fontSize: 12,
              }}
              formatter={(value: number, name: string) => [
                `${formatCompactNumber(value)} (${((value / total) * 100).toFixed(1)}%)`,
                name
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
              {formatCompactNumber(total)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Total {metric === 'value' ? 'Value' : 'Volume'}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 px-2 space-y-1.5">
        {sortedData.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5 min-w-0">
            <span
              className="flex-shrink-0 w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
            />
            <span className="text-xs text-gray-600 dark:text-gray-400 flex-1 min-w-0" title={item.name}>
              <CountryLabel name={item.name} shortName={item.shortName} flag={item.flag} />
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto flex-shrink-0">
              {((item.value / total) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
