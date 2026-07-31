import { useMemo, useRef, useEffect, useState } from 'react';
import { hierarchy, treemap, treemapSquarify } from 'd3-hierarchy';
import { formatCompactNumber } from '../utils/formatters';

interface TreemapChartProps {
  data: Array<{
    commodity_l1: string;
    commodity_l2: string;
    value: number;
  }>;
  isDark: boolean;
}

const L1_COLOR_MAP: Record<string, string> = {
  'Machines': '#3b82f6',
  'Mineral Fuels': '#f59e0b',
  'Chemical Products': '#06b6d4',
  'Transport Vehicles': '#10b981',
  'Metals': '#ef4444',
  'Plastics & Rubbers': '#f97316',
  'Precious Metals': '#eab308',
  'Food & Drink': '#84cc16',
  'Textiles': '#e11d48',
  'Instruments': '#0ea5e9',
  'Vegetable Products': '#14b8a6',
  'Animal Products': '#a3e635',
  'Stone & Glass': '#64748b',
  'Wood & Paper': '#a16207',
  'Other Commodities': '#6b7280',
};

const FALLBACK_COLORS = [
  '#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#f97316',
  '#06b6d4', '#84cc16', '#e11d48', '#0ea5e9', '#14b8a6',
  '#eab308', '#a3e635', '#64748b', '#a16207', '#6b7280',
];

export function TreemapChart({ data, isDark }: TreemapChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 600, h: 480 });
  const [tooltip, setTooltip] = useState<{
    x: number; y: number; name: string; value: number; l1: string;
  } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      if (w > 0) setDims({ w, h: 480 });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { colorMap, leaves, l1Groups } = useMemo(() => {
    const l1Map = new Map<string, number>();
    data.forEach(d => {
      if (!d.value || d.value <= 0) return;
      l1Map.set(d.commodity_l1, (l1Map.get(d.commodity_l1) ?? 0) + d.value);
    });

    const sorted = Array.from(l1Map.entries()).sort((a, b) => b[1] - a[1]);
    const colors = new Map<string, string>();
    sorted.forEach(([name], i) => {
      colors.set(name, L1_COLOR_MAP[name] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length]);
    });

    const groups = sorted.map(([name, total]) => ({ name, total }));

    if (!data.length) return { colorMap: colors, leaves: [], l1Groups: groups };

    const rootData = {
      name: 'root',
      children: sorted.map(([l1]) => ({
        name: l1,
        children: data
          .filter(d => d.commodity_l1 === l1 && d.value > 0)
          .map(d => ({ name: d.commodity_l2, value: d.value, l1 }))
          .sort((a, b) => b.value - a.value),
      })).filter(g => g.children.length > 0),
    };

    const root = hierarchy(rootData)
      .sum((d: any) => d.value ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    treemap<typeof rootData>()
      .tile(treemapSquarify)
      .size([dims.w, dims.h])
      .paddingOuter(4)
      .paddingTop(20)
      .paddingInner(1)(root);

    return { colorMap: colors, leaves: root.descendants(), l1Groups: groups };
  }, [data, dims]);

  const truncate = (s: string, maxChars: number) =>
    s.length > maxChars ? s.slice(0, maxChars - 1) + '\u2026' : s;

  const l1Nodes = leaves.filter(d => d.depth === 1);
  const l2Nodes = leaves.filter(d => d.depth === 2);

  return (
    <div ref={containerRef} className="w-full relative">
      <svg
        width="100%"
        height={dims.h}
        style={{ display: 'block', overflow: 'visible' }}
        onMouseLeave={() => setTooltip(null)}
      >
        {l1Nodes.map(node => {
          const d = node as any;
          const x = d.x0, y = d.y0, w = d.x1 - d.x0, h = d.y1 - d.y0;
          const color = colorMap.get(d.data.name) ?? '#6b7280';
          if (w < 2 || h < 2) return null;
          return (
            <g key={d.data.name}>
              <rect
                x={x} y={y} width={w} height={h}
                fill={color}
                fillOpacity={0.12}
                stroke={color}
                strokeWidth={1.5}
                strokeOpacity={0.7}
                rx={3}
              />
              {w > 50 && (
                <text
                  x={x + 5}
                  y={y + 13}
                  fill={color}
                  fontSize={Math.min(11, Math.max(8, w / 14))}
                  fontWeight={700}
                  style={{ pointerEvents: 'none' }}
                >
                  {truncate(d.data.name, Math.max(4, Math.floor(w / 9)))}
                </text>
              )}
            </g>
          );
        })}

        {l2Nodes.map(node => {
          const d = node as any;
          const x = d.x0, y = d.y0, w = d.x1 - d.x0, h = d.y1 - d.y0;
          if (w < 2 || h < 2) return null;
          const color = colorMap.get(d.data.l1) ?? '#6b7280';
          const showLabel = w > 28 && h > 16;
          const showVal = w > 60 && h > 36;
          return (
            <g
              key={`${d.data.l1}-${d.data.name}`}
              style={{ cursor: 'default' }}
              onMouseEnter={(e) => {
                const svgEl = (e.currentTarget as SVGElement).closest('svg')!;
                const bbox = svgEl.getBoundingClientRect();
                const scaleX = bbox.width / dims.w;
                const ax = (x + w / 2) * scaleX + bbox.left;
                const ay = y * scaleX + bbox.top - 8;
                setTooltip({ x: ax, y: ay, name: d.data.name, value: d.data.value, l1: d.data.l1 });
              }}
              onMouseLeave={() => setTooltip(null)}
            >
              <rect
                x={x} y={y} width={w - 0.5} height={h - 0.5}
                fill={color}
                fillOpacity={0.75}
                stroke="rgba(255,255,255,0.2)"
                strokeWidth={0.5}
                rx={2}
              />
              {showLabel && (
                <text
                  x={x + w / 2}
                  y={y + h / 2 - (showVal ? 7 : 0)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize={Math.min(11, Math.max(7, w / 10))}
                  fontWeight={500}
                  style={{ pointerEvents: 'none' }}
                >
                  {truncate(d.data.name, Math.max(4, Math.floor(w / 7)))}
                </text>
              )}
              {showVal && (
                <text
                  x={x + w / 2}
                  y={y + h / 2 + 8}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="rgba(255,255,255,0.7)"
                  fontSize={8}
                  style={{ pointerEvents: 'none' }}
                >
                  {formatCompactNumber(d.data.value)}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {tooltip && (
        <div
          className="fixed z-50 px-3 py-2 rounded-lg shadow-lg pointer-events-none text-xs"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
            backgroundColor: isDark ? '#1f2937' : '#ffffff',
            border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
            color: isDark ? '#f9fafb' : '#111827',
          }}
        >
          <div className="font-semibold">{tooltip.name}</div>
          <div style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>{tooltip.l1}</div>
          <div className="mt-0.5">{formatCompactNumber(tooltip.value)}</div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 px-1">
        {l1Groups.map(g => (
          <div key={g.name} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
              style={{ backgroundColor: colorMap.get(g.name) }}
            />
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {g.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
