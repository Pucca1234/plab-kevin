"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type SparklineProps = {
  values: (number | null)[];
  width?: number;
  height?: number;
  stroke?: string;
  labels?: string[];
  formatValue?: (value: number) => string;
};

export default function Sparkline({
  values,
  width = 120,
  height = 28,
  stroke = "#000000",
  labels = [],
  formatValue
}: SparklineProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const completeValues = useMemo(
    () => values.filter((v): v is number => v !== null),
    [values]
  );

  const points = useMemo(() => {
    if (!values.length) return [] as ({ x: number; y: number } | null)[];
    const min = completeValues.length ? Math.min(...completeValues) : 0;
    const max = completeValues.length ? Math.max(...completeValues) : 0;
    const range = max - min || 1;
    return values.map((value, index) => {
      if (value === null) return null;
      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return { x, y };
    });
  }, [values, completeValues, width, height]);

  const path = useMemo(() => {
    const validPoints = points.filter((p): p is { x: number; y: number } => p !== null);
    if (!validPoints.length) return "";
    return validPoints.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  }, [points]);

  const trend = useMemo(() => {
    if (completeValues.length < 2) return { path: "", slope: 0 };
    const indexed = values
      .map((v, i) => ({ v, i }))
      .filter((e): e is { v: number; i: number } => e.v !== null);
    const n = indexed.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;
    for (const { v, i } of indexed) {
      sumX += i;
      sumY += v;
      sumXY += i * v;
      sumXX += i * i;
    }
    const denominator = n * sumXX - sumX * sumX;
    const slope = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;

    const firstIdx = indexed[0].i;
    const lastIdx = indexed[indexed.length - 1].i;
    const y0 = slope * firstIdx + intercept;
    const yN = slope * lastIdx + intercept;

    const min = Math.min(...completeValues);
    const max = Math.max(...completeValues);
    const range = max - min || 1;
    const mapY = (v: number) => height - ((v - min) / range) * height;

    const x0 = values.length === 1 ? width / 2 : (firstIdx / (values.length - 1)) * width;
    const xN = values.length === 1 ? width / 2 : (lastIdx / (values.length - 1)) * width;

    return { path: `M ${x0} ${mapY(y0)} L ${xN} ${mapY(yN)}`, slope };
  }, [completeValues, values, width, height]);

  const trendPath = trend.path;
  const trendColor = trend.slope < 0 ? "#D94444" : "#000000";

  useEffect(() => {
    setHoverIndex(null);
  }, [values]);

  const handleMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || points.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const index = Math.max(0, Math.min(points.length - 1, Math.round((x / rect.width) * (points.length - 1))));
    setHoverIndex(index);
    setTooltipPos({ x, y: event.clientY - rect.top });
  };

  const handleLeave = () => setHoverIndex(null);

  const hoveredValue = hoverIndex !== null ? values[hoverIndex] : undefined;
  const tooltipContent =
    hoverIndex !== null && hoveredValue !== undefined && hoveredValue !== null
      ? {
          label: labels[hoverIndex] ?? "",
          value: formatValue ? formatValue(hoveredValue) : hoveredValue.toString()
        }
      : null;

  return (
    <div
      className="sparkline-wrap"
      ref={containerRef}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="sparkline">
        {path && <path d={path} fill="none" strokeWidth="1.2" strokeLinecap="round" stroke={stroke} />}
        {trendPath && (
          <path d={trendPath} fill="none" strokeWidth="1.4" strokeLinecap="round" stroke={trendColor} strokeDasharray="3 3" />
        )}
        {hoverIndex !== null && points[hoverIndex] != null && (
          <circle cx={points[hoverIndex]!.x} cy={points[hoverIndex]!.y} r="3.5" fill={stroke} />
        )}
      </svg>
      {tooltipContent && (
        <div className="sparkline-tooltip" style={{ left: tooltipPos.x, top: tooltipPos.y }}>
          <div className="sparkline-tooltip-label">{tooltipContent.label}</div>
          <div className="sparkline-tooltip-value">{tooltipContent.value}</div>
        </div>
      )}
    </div>
  );
}
