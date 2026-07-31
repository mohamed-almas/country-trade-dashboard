interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

export function Sparkline({ data, width = 80, height = 24, color = '#2E8B8B' }: SparklineProps) {
  if (!data || data.length === 0) {
    return <div style={{ width, height }} />;
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const barWidth = width / data.length;
  const padding = 2;

  return (
    <svg width={width} height={height} className="inline-block">
      {data.map((value, index) => {
        const barHeight = ((value - min) / range) * (height - padding);
        const x = index * barWidth + padding / 2;
        const y = height - barHeight;

        return (
          <rect
            key={index}
            x={x}
            y={y}
            width={barWidth - padding}
            height={barHeight}
            fill={color}
          />
        );
      })}
    </svg>
  );
}
