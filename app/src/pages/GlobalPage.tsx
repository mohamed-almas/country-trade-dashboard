import { useEffect, useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart } from 'recharts';
import { Globe, TrendingUp, Package, Users } from 'lucide-react';
import { useYear } from '../lib/YearContext';
import { useMetric } from '../lib/MetricContext';
import { PageShell, Card, SectionTitle } from '../components/PageShell';
import { KPICard } from '../components/KPICard';
import { DonutChart } from '../components/DonutChart';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { useTopExporters, useTopImporters, useTradeByL1 } from '../hooks/useTradeData';
import { formatCurrency, formatVolume, formatPercentage } from '../utils/formatters';
import { supabase } from '../lib/supabase';

export function GlobalPage() {
  const { year } = useYear();
  const { metric } = useMetric();
  const [trendData, setTrendData] = useState<any[]>([]);
  const [loadingTrend, setLoadingTrend] = useState(true);

  const { data: exporters, isLoading: loadingExporters, error: exportersError } = useTopExporters(year, 200);
  const { data: exportersTop10, isLoading: loadingExportersTop10 } = useTopExporters(year, 10);
  const { data: importers, isLoading: loadingImporters, error: importersError } = useTopImporters(year, 10);
  const { data: commodities, isLoading: loadingCommodities, error: commoditiesError } = useTradeByL1(year);

  useEffect(() => {
    async function testConnection() {
      console.log('🔍 Testing Supabase connection...');

      const { data: globalData, error: globalError } = await supabase
        .from('global_aggregates')
        .select('*')
        .order('year');

      console.log('✅ Global aggregates:', globalData);
      console.log('❌ Global error:', globalError);

      const { data: topData, error: topError } = await supabase
        .from('top_trade_partners')
        .select('*')
        .eq('year', 2024)
        .limit(5);

      console.log('✅ Top partners sample:', topData);
      console.log('❌ Top partners error:', topError);

      const { data: commodityData, error: commodityError } = await supabase
        .from('commodity_aggregates')
        .select('*')
        .eq('year', 2024)
        .limit(5);

      console.log('✅ Commodity aggregates sample:', commodityData);
      console.log('❌ Commodity error:', commodityError);
    }

    testConnection();

    async function fetchTrend() {
      setLoadingTrend(true);
      try {
        const { data: globalAggregates, error } = await supabase
          .from('global_aggregates')
          .select('year, total_value, total_volume, value_yoy_growth, volume_yoy_growth')
          .order('year', { ascending: true });

        if (error) throw error;

        const trendWithYoY = globalAggregates?.map((item) => ({
          year: item.year,
          total_value: item.total_value,
          total_volume: item.total_volume,
          yoy_pct: item.value_yoy_growth,
        })) || [];

        console.log('📊 Trend data:', trendWithYoY);
        setTrendData(trendWithYoY);
      } catch (err) {
        console.error('❌ Error fetching trend:', err);
      }
      setLoadingTrend(false);
    }
    fetchTrend();
  }, []);

  const isLoading = loadingExporters || loadingImporters || loadingCommodities || loadingTrend || loadingExportersTop10;
  const error = exportersError || importersError || commoditiesError;

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={(error as Error).message} />;

  const totalValue = exporters?.reduce((sum: number, e: any) => sum + (e.total_value || 0), 0) || 0;
  const totalVolume = exporters?.reduce((sum: number, e: any) => sum + (e.total_volume || 0), 0) || 0;
  const topExporter = exporters?.[0]?.country || '—';
  const topImporter = importers?.[0]?.country || '—';
  const topCommodity = commodities?.[0]?.commodity_l1 || '—';

  const exporterData = exportersTop10?.map((e: any) => ({
    name: e.country,
    value: e.total_value || 0,
    volume: e.total_volume || 0,
  })) || [];

  const importerData = importers?.map((i: any) => ({
    name: i.country,
    value: i.total_value || 0,
    volume: i.total_volume || 0,
  })) || [];

  const commodityData = commodities?.map((c: any) => ({
    name: c.commodity_l1,
    value: c.total_value || 0,
    volume: c.total_volume || 0,
  })) || [];

  const chartData = trendData.map((d: any) => ({
    year: d.year,
    value: metric === 'value' ? d.total_value : d.total_volume,
    yoy: d.yoy_pct,
  }));

  return (
    <PageShell>
      <SectionTitle
        title="Global Trade Overview"
        subtitle={`Aggregated across all countries and commodities · BACI ${year}`}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        <KPICard
          label={`Total Trade (${year})`}
          value={formatCurrency(totalValue)}
          icon={<Globe size={16} />}
          accent
        />
        <KPICard
          label={`Total Volume (${year})`}
          value={formatVolume(totalVolume)}
          icon={<Package size={16} />}
        />
        <KPICard
          label="Top Exporter"
          value={topExporter}
          sub={`by ${year} trade`}
          icon={<TrendingUp size={16} />}
        />
        <KPICard
          label="Top Importer"
          value={topImporter}
          sub={`by ${year} trade`}
          icon={<Users size={16} />}
        />
        <KPICard
          label="Top Commodity"
          value={topCommodity}
          sub={`by ${year} trade`}
          icon={<Package size={16} />}
        />
      </div>

      <Card>
        <h3 className="text-sm font-outfit font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
          Global Trade Trend (2018-2024)
        </h3>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 10, fontFamily: 'DM Mono', fill: 'var(--text-secondary)' }}
              stroke="var(--border)"
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 10, fontFamily: 'DM Mono', fill: 'var(--text-secondary)' }}
              stroke="var(--border)"
              tickFormatter={(v) => metric === 'value' ? formatCurrency(v) : formatVolume(v)}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 10, fontFamily: 'DM Mono', fill: 'var(--text-secondary)' }}
              stroke="var(--border)"
              tickFormatter={(v) => `${v.toFixed(1)}%`}
            />
            <Tooltip
              contentStyle={{ backgroundColor: 'var(--tooltip-bg)', border: '1px solid var(--border)', fontFamily: 'DM Sans', fontSize: 12 }}
              formatter={(v: number, name: string) => {
                if (name === 'yoy') return [formatPercentage(v), 'YoY %'];
                return [metric === 'value' ? formatCurrency(v) : formatVolume(v), 'Total'];
              }}
            />
            <Bar
              yAxisId="left"
              dataKey="value"
              fill="var(--accent)"
              radius={[4, 4, 0, 0]}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="yoy"
              stroke="#10B981"
              strokeWidth={2}
              dot={{ fill: '#10B981', r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <Card>
          <DonutChart
            data={exporterData}
            title={`Top Exporters (${year})`}
          />
        </Card>
        <Card>
          <DonutChart
            data={importerData}
            title={`Top Importers (${year})`}
          />
        </Card>
        <Card>
          <DonutChart
            data={commodityData}
            title={`Top Commodities (${year})`}
          />
        </Card>
      </div>
    </PageShell>
  );
}
