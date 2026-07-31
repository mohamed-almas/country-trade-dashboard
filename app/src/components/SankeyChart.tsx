import { useMemo, useState } from 'react';
import { formatCompactNumber } from '../utils/formatters';

interface SankeyChartProps {
  data: Array<{
    exporter_region: string;
    importer_region: string;
    value: number;
  }>;
  isDark: boolean;
}

interface TooltipState {
  x: number;
  y: number;
  source: string;
  target: string;
  value: number;
}

const REGION_COLORS: Record<string, string> = {
  'Europe': '#3b82f6',
  'Asia': '#f59e0b',
  'North America': '#10b981',
  'South America': '#ef4444',
  'Africa': '#f97316',
  'Middle East': '#06b6d4',
  'Oceania': '#84cc16',
  'Central Asia': '#e11d48',
  'Southeast Asia': '#0ea5e9',
  'East Asia': '#14b8a6',
};

const FALLBACK_COLORS = [
  '#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#f97316',
  '#06b6d4', '#84cc16', '#e11d48', '#0ea5e9', '#14b8a6',
];

function getRegionColor(region: string, index: number): string {
  return REGION_COLORS[region] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

export function SankeyChart({ data, isDark }: SankeyChartProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const { exporters, importers, links, maxValue, regionColorMap } = useMemo(() => {
    const exporterSet = new Set<string>();
    const importerSet = new Set<string>();

    data.forEach(d => {
      exporterSet.add(d.exporter_region);
      importerSet.add(d.importer_region);
    });

    const allRegions = Array.from(new Set([...exporterSet, ...importerSet]));
    const colorMap = new Map<string, string>();
    allRegions.forEach((r, i) => colorMap.set(r, getRegionColor(r, i)));

    const exporterList = Array.from(exporterSet).sort();
    const importerList = Array.from(importerSet).sort();

    const aggregated = new Map<string, number>();
    data.forEach(d => {
      const key = `${d.exporter_region}|||${d.importer_region}`;
      aggregated.set(key, (aggregated.get(key) ?? 0) + d.value);
    });

    const linkArray = Array.from(aggregated.entries()).map(([key, value]) => {
      const [source, target] = key.split('|||');
      return { source, target, value };
    }).sort((a, b) => b.value - a.value);

    const maxVal = Math.max(...linkArray.map(l => l.value), 1);

    return {
      exporters: exporterList,
      importers: importerList,
      links: linkArray,
      maxValue: maxVal,
      regionColorMap: colorMap,
    };
  }, [data]);

  const nodeH = 44;
  const nodeSpacing = 16;
  const nodeW = 160;
  const leftLabelW = 120;
  const rightLabelW = 140;
  const leftNodeX = leftLabelW;
  const rightNodeX = leftLabelW + nodeW + 260;
  const svgWidth = rightNodeX + nodeW + rightLabelW + 20;
  const topPadding = 36;

  const exporterCount = exporters.length;
  const importerCount = importers.length;
  const svgHeight = Math.max(exporterCount, importerCount) * (nodeH + nodeSpacing) + topPadding + 20;

  const exporterYMap = useMemo(() => {
    const map = new Map<string, number>();
    exporters.forEach((r, i) => map.set(r, topPadding + i * (nodeH + nodeSpacing)));
    return map;
  }, [exporters]);

  const importerYMap = useMemo(() => {
    const map = new Map<string, number>();
    importers.forEach((r, i) => map.set(r, topPadding + i * (nodeH + nodeSpacing)));
    return map;
  }, [importers]);

  return (
    <div className="w-full overflow-x-auto relative">
      <svg
        width={svgWidth}
        height={svgHeight}
        className="mx-auto block"
        onMouseLeave={() => setTooltip(null)}
      >
        {links.map((link, i) => {
          const sy = (exporterYMap.get(link.source) ?? 0) + nodeH / 2;
          const ty = (importerYMap.get(link.target) ?? 0) + nodeH / 2;
          const x1 = leftNodeX + nodeW;
          const x2 = rightNodeX;
          const mx = (x1 + x2) / 2;
          const thickness = Math.max(2, (link.value / maxValue) * 28);
          const color = regionColorMap.get(link.source) ?? '#6b7280';
          const path = `M ${x1} ${sy} C ${mx} ${sy}, ${mx} ${ty}, ${x2} ${ty}`;

          return (
            <path
              key={i}
              d={path}
              fill="none"
              stroke={color}
              strokeWidth={thickness}
              opacity={0.35}
              className="cursor-pointer transition-opacity hover:opacity-70"
              onMouseEnter={(e) => {
                const rect = (e.target as SVGElement).closest('svg')!.getBoundingClientRect();
                setTooltip({
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top,
                  source: link.source,
                  target: link.target,
                  value: link.value,
                });
              }}
              onMouseMove={(e) => {
                const rect = (e.target as SVGElement).closest('svg')!.getBoundingClientRect();
                setTooltip(prev => prev ? { ...prev, x: e.clientX - rect.left, y: e.clientY - rect.top } : null);
              }}
              onMouseLeave={() => setTooltip(null)}
            />
          );
        })}

        {exporters.map((region) => {
          const y = exporterYMap.get(region) ?? 0;
          const color = regionColorMap.get(region) ?? '#6b7280';
          return (
            <g key={`exp-${region}`}>
              <rect x={leftNodeX} y={y} width={nodeW} height={nodeH} fill={color} rx={6} />
              <text
                x={leftNodeX + nodeW / 2}
                y={y + nodeH / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize={12}
                fontWeight={600}
              >
                {region.length > 18 ? region.slice(0, 16) + '…' : region}
              </text>
            </g>
          );
        })}

        {importers.map((region) => {
          const y = importerYMap.get(region) ?? 0;
          const color = regionColorMap.get(region) ?? '#6b7280';
          return (
            <g key={`imp-${region}`}>
              <rect x={rightNodeX} y={y} width={nodeW} height={nodeH} fill={color} rx={6} />
              <text
                x={rightNodeX + nodeW / 2}
                y={y + nodeH / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize={12}
                fontWeight={600}
              >
                {region.length > 18 ? region.slice(0, 16) + '…' : region}
              </text>
            </g>
          );
        })}

        <text
          x={leftNodeX + nodeW / 2}
          y={topPadding - 10}
          textAnchor="middle"
          fontSize={12}
          fontWeight={700}
          fill={isDark ? '#9ca3af' : '#6b7280'}
        >
          Exporter Regions
        </text>
        <text
          x={rightNodeX + nodeW / 2}
          y={topPadding - 10}
          textAnchor="middle"
          fontSize={12}
          fontWeight={700}
          fill={isDark ? '#9ca3af' : '#6b7280'}
        >
          Importer Regions
        </text>

        {tooltip && (
          <g>
            <rect
              x={Math.min(tooltip.x + 12, svgWidth - 200)}
              y={Math.max(tooltip.y - 44, 4)}
              width={188}
              height={52}
              rx={8}
              fill={isDark ? '#1f2937' : '#ffffff'}
              stroke={isDark ? '#374151' : '#e5e7eb'}
              strokeWidth={1}
              filter="drop-shadow(0 2px 6px rgba(0,0,0,0.15))"
            />
            <text
              x={Math.min(tooltip.x + 20, svgWidth - 192)}
              y={Math.max(tooltip.y - 27, 19)}
              fontSize={11}
              fontWeight={600}
              fill={isDark ? '#f9fafb' : '#111827'}
            >
              {tooltip.source} → {tooltip.target}
            </text>
            <text
              x={Math.min(tooltip.x + 20, svgWidth - 192)}
              y={Math.max(tooltip.y - 9, 37)}
              fontSize={11}
              fill={isDark ? '#9ca3af' : '#6b7280'}
            >
              {formatCompactNumber(tooltip.value)}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
