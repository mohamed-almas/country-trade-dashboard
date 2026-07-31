import React, { useMemo, useState } from 'react';

interface GeographicTreemapProps {
  countryData: any[];
  isDark: boolean;
  metric: 'value' | 'volume';
  formatVal: (value: number) => string;
}

export const GeographicTreemap: React.FC<GeographicTreemapProps> = ({
  countryData,
  isDark,
  metric,
  formatVal,
}) => {
  const [expandedRegions, setExpandedRegions] = useState<Record<string, boolean>>({
    'Asia': true,
    'Europe': true,
    'North America': true,
    'South America': true,
    'Africa': true,
    'Oceania': true,
    'Antarctica': true
  });

  const toggleRegion = (region: string) => {
    setExpandedRegions(prev => ({
      ...prev,
      [region]: !prev[region]
    }));
  };

  if (!countryData || countryData.length === 0) {
    return (
      <div className="p-4 text-center border rounded" style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
        No geographic data available
      </div>
    );
  }

  // Determine which field to use
  const valueField = metric === 'value' ? 'total_value' : 'total_volume';
  
  // Filter valid data
  const validData = countryData.filter(item => item && item[valueField] > 0);
  
  if (validData.length === 0) {
    return (
      <div className="p-4 text-center border rounded" style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
        <p>No data with positive {metric === 'value' ? 'value' : 'volume'}</p>
      </div>
    );
  }

  // Group by region
  const groupedData: Record<string, any[]> = {};
  validData.forEach(item => {
    const region = item.region || 'Other';
    if (!groupedData[region]) groupedData[region] = [];
    groupedData[region].push(item);
  });

  // Sort countries within each region
  Object.keys(groupedData).forEach(region => {
    groupedData[region].sort((a, b) => b[valueField] - a[valueField]);
  });

  // Calculate global total
  const globalTotal = validData.reduce((sum, item) => sum + item[valueField], 0);

  // Sort regions by total value
  const sortedRegions = Object.keys(groupedData).sort((a, b) => {
    const sumA = groupedData[a].reduce((s, c) => s + c[valueField], 0);
    const sumB = groupedData[b].reduce((s, c) => s + c[valueField], 0);
    return sumB - sumA;
  });

  // Colors for regions
  const regionColors: Record<string, string> = {
    'Asia': '#FF6B6B',
    'Europe': '#4ECDC4',
    'North America': '#45B7D1',
    'South America': '#96CEB4',
    'Africa': '#FFEAA7',
    'Oceania': '#DDA0DD',
    'Antarctica': '#C0C0C0',
    'Other': '#E2E2E2'
  };

  return (
    <div className="space-y-3">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="p-2 text-center border rounded" style={{ borderColor: 'var(--border)' }}>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Countries</div>
          <div className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{validData.length}</div>
        </div>
        <div className="p-2 text-center border rounded" style={{ borderColor: 'var(--border)' }}>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Regions</div>
          <div className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{Object.keys(groupedData).length}</div>
        </div>
        <div className="p-2 text-center border rounded" style={{ borderColor: 'var(--border)' }}>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Global Total</div>
          <div className="text-base font-bold truncate" style={{ color: 'var(--text-primary)' }} title={formatVal(globalTotal)}>
            {formatVal(globalTotal)}
          </div>
        </div>
      </div>

      {/* Expandable region list */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {sortedRegions.map(region => {
          const countries = groupedData[region];
          const regionTotal = countries.reduce((sum, c) => sum + c[valueField], 0);
          const regionPercent = (regionTotal / globalTotal) * 100;
          const isExpanded = expandedRegions[region];
          const regionColor = regionColors[region] || '#999';
          
          return (
            <div key={region} className="border rounded" style={{ borderColor: 'var(--border)' }}>
              {/* Region header */}
              <button
                onClick={() => toggleRegion(region)}
                className="w-full px-3 py-2 text-left font-semibold flex justify-between items-center hover:opacity-80 transition-all"
                style={{ backgroundColor: isDark ? '#1e293b' : '#f3f4f6' }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs">{isExpanded ? '▼' : '▶'}</span>
                  <span 
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: regionColor }}
                  />
                  <span>{region}</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    ({countries.length} countries)
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-medium">{formatVal(regionTotal)}</span>
                  <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>
                    ({regionPercent.toFixed(1)}%)
                  </span>
                </div>
              </button>
              
              {/* Country list */}
              {isExpanded && (
                <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  {countries.map((country, idx) => {
                    const countryValue = country[valueField];
                    const countryPercent = (countryValue / globalTotal) * 100;
                    return (
                      <div key={idx} className="px-3 py-1.5 flex justify-between items-center hover:bg-opacity-10 hover:bg-gray-500">
                        <div className="flex items-center gap-2">
                          <span className="w-4" />
                          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            {country.country}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm">{formatVal(countryValue)}</span>
                          <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>
                            ({countryPercent.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-3 pt-2 text-xs border-t" style={{ borderColor: 'var(--border)' }}>
        {sortedRegions.map(region => (
          <div key={region} className="flex items-center gap-1">
            <span 
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: regionColors[region] || '#999' }}
            />
            <span style={{ color: 'var(--text-secondary)' }}>{region}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GeographicTreemap;