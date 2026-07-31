import { useMemo, useState } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { scaleSequential } from 'd3-scale';
import { interpolateRgb } from 'd3-interpolate';
import worldTopology from 'world-atlas/countries-110m.json?url';

const mapColorInterpolator = interpolateRgb('#E1F0F0', '#00565E');

export interface WorldMapDatum {
  numCode: number;
  value: number;
  label: string;
}

interface WorldMapProps {
  data: WorldMapDatum[];
  height?: number;
  formatValue?: (v: number) => string;
}

export function WorldMap({ data, height = 380, formatValue = (v) => v.toLocaleString() }: WorldMapProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string; value: string } | null>(null);

  const byId = useMemo(() => {
    const m = new Map<number, WorldMapDatum>();
    data.forEach((d) => m.set(d.numCode, d));
    return m;
  }, [data]);

  const colorScale = useMemo(() => {
    const max = Math.max(1, ...data.map((d) => d.value));
    return scaleSequential(mapColorInterpolator).domain([0, max]);
  }, [data]);

  return (
    <div className="relative w-full" style={{ height }}>
      <ComposableMap projection="geoEqualEarth" style={{ width: '100%', height: '100%' }}>
        <ZoomableGroup zoom={1} minZoom={1} maxZoom={5}>
          <Geographies geography={worldTopology}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const numCode = Number(geo.id);
                const datum = byId.get(numCode);
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={datum ? colorScale(datum.value) : 'var(--bg-tertiary)'}
                    stroke="var(--bg-secondary)"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: 'none' },
                      hover: { outline: 'none', fill: 'var(--accent-2)', cursor: datum ? 'pointer' : 'default' },
                      pressed: { outline: 'none' },
                    }}
                    onMouseEnter={(e) => {
                      if (!datum) return;
                      setTooltip({ x: e.clientX, y: e.clientY, label: datum.label, value: formatValue(datum.value) });
                    }}
                    onMouseMove={(e) => {
                      if (!datum) return;
                      setTooltip((t) => (t ? { ...t, x: e.clientX, y: e.clientY } : t));
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>
      {tooltip && (
        <div
          className="fixed z-50 px-2.5 py-1.5 text-xs font-dm-sans pointer-events-none"
          style={{
            left: tooltip.x + 12,
            top: tooltip.y + 12,
            backgroundColor: 'var(--tooltip-bg)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div className="font-semibold">{tooltip.label}</div>
          <div style={{ color: 'var(--text-secondary)' }}>{tooltip.value}</div>
        </div>
      )}
    </div>
  );
}
