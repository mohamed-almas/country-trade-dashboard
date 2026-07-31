import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useMetric } from '../lib/MetricContext';
import { useYear } from '../lib/YearContext';
import { PageShell, Card, SectionTitle } from '../components/PageShell';
import { KPICard } from '../components/KPICard';
import { DonutChart } from '../components/DonutChart';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { SearchableDropdown } from '../components/SearchableDropdown';
import { useBilateralByYear, useBilateralCommodities } from '../hooks/useTradeData';
import { formatCurrency, formatVolume } from '../utils/formatters';
import { ArrowLeftRight } from 'lucide-react';

const COMMON_COUNTRIES = [
  'China', 'United States of America', 'Germany', 'Japan', 'United Kingdom',
  'France', 'India', 'Italy', 'Canada', 'South Korea', 'Russia', 'Brazil',
  'Australia', 'Spain', 'Mexico', 'Indonesia', 'Netherlands', 'Turkey', 'Switzerland'
];

export function BilateralPage() {
  const { metric } = useMetric();
  const { year } = useYear();
  const [exporter, setExporter] = useState('China');
  const [importer, setImporter] = useState('United States of America');

  const { data: trendData, isLoading: loadingTrend, error: trendError } = useBilateralByYear(exporter, importer);
  const { data: commodities, isLoading: loadingCommodities, error: commoditiesError } = useBilateralCommodities(exporter, importer, year);

  const isLoading = loadingTrend || loadingCommodities;
  const error = trendError || commoditiesError;

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={(error as Error).message} />;

  const currentYearData = trendData?.find((d: any) => d.year === year) || {};
  const totalValue = currentYearData.total_value || 0;
  const totalVolume = currentYearData.total_volume || 0;

  const topCommodity = commodities?.[0]?.commodity_l1 || '—';

  const commodityData = commodities?.map((c: any) => ({
    name: c.commodity_l1,
    value: c.total_value || 0,
    volume: c.total_volume || 0,
  })) || [];

  const chartData = trendData?.map((d: any) => ({
    year: d.year,
    value: metric === 'value' ? d.total_value : d.total_volume,
  })) || [];

  function swap() {
    setExporter(importer);
    setImporter(exporter);
  }

  return (
    <PageShell>
      <div className="flex flex-wrap items-start gap-4 mb-6">
        <SectionTitle
          title={`Bilateral: ${exporter} → ${importer}`}
          subtitle="Bilateral trade corridor analysis"
        />
        <div className="ml-auto flex items-center gap-3">
          <SearchableDropdown
            options={COMMON_COUNTRIES}
            value={exporter}
            onChange={setExporter}
            placeholder="Exporter..."
          />
          <button
            onClick={swap}
            className="p-2 border transition-colors"
            style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            <ArrowLeftRight size={16} />
          </button>
          <SearchableDropdown
            options={COMMON_COUNTRIES}
            value={importer}
            onChange={setImporter}
            placeholder="Importer..."
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
        <KPICard
          label={`Total Value (${year})`}
          value={formatCurrency(totalValue)}
          accent
        />
        <KPICard
          label={`Total Volume (${year})`}
          value={formatVolume(totalVolume)}
        />
        <KPICard
          label="Top Commodity"
          value={topCommodity}
          sub={`${year}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <h3 className="text-sm font-outfit font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            Bilateral Trade Trend
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
              <XAxis
                dataKey="year"
                tick={{ fontSize: 10, fontFamily: 'DM Mono', fill: 'var(--text-secondary)' }}
                stroke="var(--border)"
              />
              <YAxis
                tick={{ fontSize: 10, fontFamily: 'DM Mono', fill: 'var(--text-secondary)' }}
                stroke="var(--border)"
                tickFormatter={(v) => metric === 'value' ? formatCurrency(v) : formatVolume(v)}
              />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--tooltip-bg)', border: '1px solid var(--border)', fontFamily: 'DM Sans', fontSize: 12 }}
                formatter={(v: number) => [metric === 'value' ? formatCurrency(v) : formatVolume(v), 'Total']}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--accent)"
                strokeWidth={2}
                dot={{ fill: 'var(--accent)', r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <DonutChart
            data={commodityData}
            title={`Commodity Breakdown (${year})`}
          />
        </Card>
      </div>
    </PageShell>
  );
}
