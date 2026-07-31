import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { supabase } from '../lib/supabase';
import { SearchableDropdown } from '../components/SearchableDropdown';
import { KPICard } from '../components/KPICard';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { formatNumber, COUNTRIES } from '../lib/utils';

interface CountryProfileProps {
  selectedYear: number | 'all';
  metricType: 'value' | 'volume';
}

export function CountryProfile({ selectedYear, metricType }: CountryProfileProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('United Arab Emirates');
  const [direction, setDirection] = useState<'export' | 'import' | 'both'>('both');
  const [kpis, setKpis] = useState<any>(null);
  const [yearlyData, setYearlyData] = useState<any[]>([]);
  const [commodityData, setCommodityData] = useState<any[]>([]);
  const [partnerData, setPartnerData] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [selectedCountry, direction, selectedYear, metricType]);

  const fetchData = async () => {
    setLoading(true);
    setError(false);

    try {
      const year = selectedYear === 'all' ? null : selectedYear;

      const [yearlyRes, commodityRes, partnerRes] = await Promise.all([
        supabase.rpc('get_country_by_year', { p_country: selectedCountry }).then(r => r.data),
        supabase.rpc('get_country_by_commodity', {
          p_country: selectedCountry,
          p_year: year,
          p_direction: direction,
        }).then(r => r.data),
        supabase.rpc('get_country_partners', {
          p_country: selectedCountry,
          p_year: year,
          p_limit: 20,
        }).then(r => r.data),
      ]);

      const currentYearData = year
        ? yearlyRes.find((r: any) => r.year === year)
        : yearlyRes.reduce(
            (acc: any, r: any) => ({
              export_value: acc.export_value + r.export_value,
              import_value: acc.import_value + r.import_value,
              export_volume: acc.export_volume + r.export_volume,
              import_volume: acc.import_volume + r.import_volume,
            }),
            { export_value: 0, import_value: 0, export_volume: 0, import_volume: 0 }
          );

      const exports = currentYearData?.export_value || 0;
      const imports = currentYearData?.import_value || 0;
      const exportsVolume = currentYearData?.export_volume || 0;
      const importsVolume = currentYearData?.import_volume || 0;

      setKpis({
        exports: metricType === 'value' ? exports : exportsVolume,
        imports: metricType === 'value' ? imports : importsVolume,
        tradeBalance: exports - imports,
      });

      setYearlyData(
        yearlyRes.map((r: any) => ({
          year: r.year,
          exports: metricType === 'value' ? r.export_value : r.export_volume,
          imports: metricType === 'value' ? r.import_value : r.import_volume,
        }))
      );

      setCommodityData(commodityRes);

      const partnersWithBalance = partnerRes.map((p: any) => ({
        ...p,
        tradeBalance: p.export_value - p.import_value,
        topCommodity: 'N/A',
      }));

      setPartnerData(partnersWithBalance);
    } catch (err) {
      console.error('Error fetching country profile data:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (error) return <ErrorState onRetry={fetchData} />;

  return (
    <div className="space-y-8">
      <div className="flex gap-4 items-center">
        <div className="flex-1 max-w-xs">
          <SearchableDropdown
            options={COUNTRIES}
            value={selectedCountry}
            onChange={setSelectedCountry}
            placeholder="Select country"
          />
        </div>
        <div className="flex gap-2">
          {(['export', 'import', 'both'] as const).map((dir) => (
            <button
              key={dir}
              onClick={() => setDirection(dir)}
              className="px-4 py-2 text-sm font-dm-sans transition-colors capitalize border"
              style={
                direction === dir
                  ? { backgroundColor: 'var(--accent)', color: 'var(--accent-text)', borderColor: 'var(--accent)' }
                  : { backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', borderColor: 'var(--border)' }
              }
            >
              {dir}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingState height="h-96" />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-6">
            <KPICard
              label="Total Exports"
              value={kpis?.exports || 0}
              unit={metricType === 'value' ? 'USD k' : 'mT'}
            />
            <KPICard
              label="Total Imports"
              value={kpis?.imports || 0}
              unit={metricType === 'value' ? 'USD k' : 'mT'}
            />
            <KPICard
              label="Trade Balance"
              value={kpis?.tradeBalance || 0}
              unit="USD k"
              valueColor={
                kpis?.tradeBalance > 0
                  ? 'var(--positive-text)'
                  : kpis?.tradeBalance < 0
                  ? 'var(--negative-text)'
                  : undefined
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div
              className="border p-6"
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
            >
              <h3 className="text-sm font-outfit font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                Trade by Year
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={yearlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                  <XAxis
                    dataKey="year"
                    stroke="var(--text-secondary)"
                    tick={{ fontSize: 11, fontFamily: 'DM Mono', fill: 'var(--text-secondary)' }}
                  />
                  <YAxis
                    stroke="var(--text-secondary)"
                    tick={{ fontSize: 11, fontFamily: 'DM Mono', fill: 'var(--text-secondary)' }}
                    tickFormatter={(value) => formatNumber(value)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--tooltip-bg)',
                      border: '1px solid var(--border)',
                    }}
                    labelStyle={{ color: 'var(--text-primary)', fontFamily: 'DM Sans' }}
                    formatter={(value: any) => formatNumber(value)}
                  />
                  <Legend wrapperStyle={{ fontFamily: 'DM Sans', fontSize: 12, color: 'var(--text-secondary)' }} />
                  <Bar dataKey="exports" fill="var(--chart-bar)" name="Exports" />
                  <Bar dataKey="imports" fill="#66BFEE" name="Imports" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div
              className="border p-6"
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
            >
              <h3 className="text-sm font-outfit font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                Commodity Breakdown
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={commodityData} layout="vertical" margin={{ left: 120, right: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                  <XAxis
                    type="number"
                    stroke="var(--text-secondary)"
                    tick={{ fontSize: 11, fontFamily: 'DM Mono', fill: 'var(--text-secondary)' }}
                    tickFormatter={(value) => formatNumber(value)}
                  />
                  <YAxis
                    type="category"
                    dataKey="adpg_level_1"
                    stroke="var(--text-secondary)"
                    tick={{ fontSize: 11, fontFamily: 'DM Sans', fill: 'var(--text-secondary)' }}
                    width={115}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--tooltip-bg)',
                      border: '1px solid var(--border)',
                    }}
                    labelStyle={{ color: 'var(--text-primary)', fontFamily: 'DM Sans' }}
                    itemStyle={{ color: '#C9A959', fontFamily: 'DM Mono' }}
                    formatter={(value: any) => formatNumber(value)}
                  />
                  <Bar dataKey={metricType === 'value' ? 'total_value' : 'total_volume'} fill="#C9A959" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div
            className="border"
            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
          >
            <div className="p-6 border-b" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-sm font-outfit font-semibold" style={{ color: 'var(--text-primary)' }}>
                Top Trade Partners
              </h3>
              {metricType === 'volume' && (
                <p className="text-xs font-dm-sans mt-1" style={{ color: 'var(--text-muted)' }}>
                  Partner-level volume not available
                </p>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                    <th className="text-left px-4 py-3 text-xs font-dm-sans font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      Partner Country
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-dm-sans font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      Exports to Partner
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-dm-sans font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      Imports from Partner
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-dm-sans font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      Trade Balance
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-dm-sans font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      Top Commodity
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {partnerData.map((partner, index) => (
                    <tr
                      key={partner.partner}
                      style={{
                        backgroundColor: index % 2 === 0 ? 'var(--bg-secondary)' : 'var(--table-row-alt)',
                      }}
                    >
                      <td className="px-4 py-3 text-sm font-dm-sans" style={{ color: 'var(--text-primary)' }}>
                        {partner.partner}
                      </td>
                      <td className="px-4 py-3 text-sm font-dm-mono text-right" style={{ color: 'var(--text-primary)' }}>
                        {metricType === 'value' ? formatNumber(partner.export_value) : <span style={{ color: 'var(--text-muted)' }}>N/A</span>}
                      </td>
                      <td className="px-4 py-3 text-sm font-dm-mono text-right" style={{ color: 'var(--text-primary)' }}>
                        {metricType === 'value' ? formatNumber(partner.import_value) : <span style={{ color: 'var(--text-muted)' }}>N/A</span>}
                      </td>
                      <td className="px-4 py-3 text-sm font-dm-mono text-right">
                        {metricType === 'volume' ? (
                          <span style={{ color: 'var(--text-muted)' }}>N/A</span>
                        ) : (
                          <span
                            style={{
                              color: partner.tradeBalance > 0
                                ? 'var(--positive-text)'
                                : partner.tradeBalance < 0
                                ? 'var(--negative-text)'
                                : 'var(--text-primary)',
                            }}
                          >
                            {partner.tradeBalance > 0 ? '+' : ''}
                            {formatNumber(partner.tradeBalance)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-dm-sans" style={{ color: 'var(--text-secondary)' }}>
                        {partner.topCommodity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
