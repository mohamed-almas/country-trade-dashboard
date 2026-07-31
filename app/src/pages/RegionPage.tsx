import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useYear } from '../lib/YearContext';
import { useMetric } from '../lib/MetricContext';
import { PageShell, Card, SectionTitle } from '../components/PageShell';
import { KPICard } from '../components/KPICard';
import { DonutChart } from '../components/DonutChart';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { useRegionSummary, useRegionTrend, useRegionPartners, useTopExporters } from '../hooks/useTradeData';
import { formatCurrency, formatVolume } from '../utils/formatters';

export function RegionPage() {
  const { year } = useYear();
  const { metric } = useMetric();
  const [selectedRegion, setSelectedRegion] = useState('');

  const { data: regionSummary, isLoading: loadingSummary } = useRegionSummary(year);

  useEffect(() => {
    if (regionSummary && regionSummary.length > 0 && !selectedRegion) {
      setSelectedRegion(regionSummary[0].region);
    }
  }, [regionSummary, selectedRegion]);

  const { data: trendData, isLoading: loadingTrend, error: trendError } = useRegionTrend(selectedRegion);
  const { data: partners, isLoading: loadingPartners, error: partnersError } = useRegionPartners(selectedRegion, year, 10);
  const { data: topExporters, isLoading: loadingExporters, error: exportersError } = useTopExporters(year, 10);

  const isLoading = loadingSummary || loadingTrend || loadingPartners || loadingExporters;
  const error = trendError || partnersError || exportersError;

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={(error as Error).message} />;
  if (!selectedRegion) return <LoadingState />;

  const currentRegionData = regionSummary?.find((r: any) => r.region === selectedRegion) || {};
  const totalExports = currentRegionData.export_value || 0;
  const totalImports = currentRegionData.import_value || 0;
  const balance = totalExports - totalImports;

  const exporterData = topExporters?.map((e: any) => ({
    name: e.exporter,
    value: e.total_value || 0,
    volume: e.total_volume || 0,
  })) || [];

  const partnerData = partners?.map((p: any) => ({
    name: p.partner_region,
    value: p.trade_value || 0,
    volume: p.trade_volume || 0,
  })) || [];

  const chartData = trendData?.map((d: any) => ({
    year: d.year,
    exports: metric === 'value' ? d.export_value : d.export_volume,
    imports: metric === 'value' ? d.import_value : d.import_volume,
  })) || [];

  const regions = regionSummary?.map((r: any) => r.region) || [];

  return (
    <PageShell>
      <div className="flex flex-wrap items-start gap-4 mb-6">
        <SectionTitle
          title={`Region: ${selectedRegion}`}
          subtitle="Regional trade analysis"
        />
        <div className="ml-auto">
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="text-sm font-dm-sans px-3 py-2 border"
            style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
          >
            {regions.map((region: string) => (
              <option key={region} value={region}>{region}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <KPICard
          label={`Total Exports (${year})`}
          value={formatCurrency(totalExports)}
          accent
        />
        <KPICard
          label={`Total Imports (${year})`}
          value={formatCurrency(totalImports)}
        />
        <KPICard
          label="Trade Balance"
          value={formatCurrency(Math.abs(balance))}
          sub={balance >= 0 ? 'surplus' : 'deficit'}
        />
        <KPICard
          label="Net Position"
          value={balance >= 0 ? 'Net Exporter' : 'Net Importer'}
          sub={`${year}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <h3 className="text-sm font-outfit font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            {selectedRegion} Trade Trend
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
                formatter={(v: number, name: string) => [
                  metric === 'value' ? formatCurrency(v) : formatVolume(v),
                  name === 'exports' ? 'Exports' : 'Imports'
                ]}
              />
              <Line
                type="monotone"
                dataKey="exports"
                stroke="#10B981"
                strokeWidth={2}
                dot={{ fill: '#10B981', r: 3 }}
                name="exports"
              />
              <Line
                type="monotone"
                dataKey="imports"
                stroke="#EF4444"
                strokeWidth={2}
                dot={{ fill: '#EF4444', r: 3 }}
                name="imports"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <DonutChart
            data={partnerData}
            title={`Top Partner Regions (${year})`}
          />
        </Card>
      </div>

      <Card>
        <DonutChart
          data={exporterData}
          title={`Top Global Exporters (${year})`}
        />
      </Card>
    </PageShell>
  );
}
