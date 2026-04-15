"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Metric } from "../types";
import { formatValue } from "../lib/format";
import Sparkline from "./Sparkline";

type MetricTableProps = {
  title?: string;
  weeks: string[];
  metrics: Metric[];
  series: Record<string, number[]>;
  primaryMetricId?: string;
  showHeader?: boolean;
  dense?: boolean;
  indent?: boolean;
  scrollable?: boolean;
  embedded?: boolean;
  hiddenDeltaMetrics?: Set<string>;
  onToggleDeltaMetric?: (metricId: string) => void;
  partialIndices?: Set<number>;
};

const formatDelta = (metric: Metric, delta: number | null) => {
  if (delta === null) return "-";
  if (metric.format === "percent") {
    const sign = delta >= 0 ? "+" : "";
    return `${sign}${(delta * 100).toFixed(1)}%p`;
  }
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${delta.toLocaleString("ko-KR")}`;
};

const METRIC_HEAT_COLORS: [number, number, number][] = [
  [59, 130, 246],  // blue
  [16, 185, 129],  // emerald
  [245, 158, 11],  // amber
  [139, 92, 246],  // violet
  [236, 72, 153],  // pink
  [234, 88, 12],   // orange
  [100, 116, 139], // slate
];

const getMetricHeatColor = (
  metricIndex: number,
  min: number,
  max: number,
  value: number
) => {
  const [r, g, b] = METRIC_HEAT_COLORS[metricIndex % METRIC_HEAT_COLORS.length];
  if (min === max) return `rgba(${r}, ${g}, ${b}, 0.55)`;
  const ratio = (value - min) / (max - min);
  const intensity = 0.1 + ratio * 0.9;
  return `rgba(${r}, ${g}, ${b}, ${intensity})`;
};

export default function MetricTable({
  title,
  weeks,
  metrics,
  series,
  primaryMetricId,
  showHeader = true,
  dense = false,
  indent = false,
  scrollable = true,
  embedded = false,
  hiddenDeltaMetrics = new Set(),
  onToggleDeltaMetric,
  partialIndices = new Set()
}: MetricTableProps) {
  const weekColumnCount = weeks.length;
  const colCount = 2 + weekColumnCount;
  const [columnWidths, setColumnWidths] = useState<number[]>([180, 100, ...Array(weekColumnCount).fill(100)]);
  const [heatmapColorMap, setHeatmapColorMap] = useState<Record<string, number | null>>({});
  const [colorPickerOpen, setColorPickerOpen] = useState<string | null>(null);
  const [pickerPos, setPickerPos] = useState<{ top: number; left: number } | null>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setColorPickerOpen(null);
      }
    };
    if (colorPickerOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [colorPickerOpen]);

  const openColorPicker = (key: string, e: React.MouseEvent) => {
    if (colorPickerOpen === key) { setColorPickerOpen(null); return; }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPickerPos({ top: rect.bottom + 4, left: rect.left + rect.width / 2 });
    setColorPickerOpen(key);
  };

  const getActiveColorIndex = (metricId: string, defaultIndex: number) => {
    if (metricId in heatmapColorMap) return heatmapColorMap[metricId];
    return defaultIndex;
  };

  const selectHeatmapColor = (metricId: string, colorIndex: number | null) => {
    setHeatmapColorMap((prev) => ({ ...prev, [metricId]: colorIndex }));
    setColorPickerOpen(null);
  };
  const [periodSort, setPeriodSort] = useState<{ weekIndex: number; order: "asc" | "desc" } | null>(null);
  const resizeIndexRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const manualResized = useRef(new Set<number>());
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setColumnWidths([180, 100, ...Array(weekColumnCount).fill(100)]);
    manualResized.current.clear();
  }, [weekColumnCount]);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const rows = Array.from(grid.querySelectorAll(".data-row")) as HTMLElement[];
    if (!rows.length) return;
    const maxContentStr = Array(colCount).fill("max-content").join(" ");
    const origStyles = rows.map((r) => r.style.gridTemplateColumns);
    rows.forEach((r) => { r.style.gridTemplateColumns = maxContentStr; });
    const maxW = new Array(colCount).fill(0);
    rows.forEach((r) => {
      for (let i = 0; i < Math.min(r.children.length, colCount); i++) {
        const w = (r.children[i] as HTMLElement).offsetWidth;
        if (w > maxW[i]) maxW[i] = w;
      }
    });
    rows.forEach((r, idx) => { r.style.gridTemplateColumns = origStyles[idx]; });

    setColumnWidths((prev) => {
      const next = maxW.map((w, i) =>
        manualResized.current.has(i) ? (prev[i] ?? w) : Math.max(w, 40)
      );
      if (prev.length === next.length && prev.every((v, i) => v === next[i])) return prev;
      return next;
    });
  }, [weeks, metrics, series, hiddenDeltaMetrics, colCount]);

  const startResize = (index: number, clientX: number) => {
    resizeIndexRef.current = index;
    startXRef.current = clientX;
    startWidthRef.current = columnWidths[index] ?? 100;
    manualResized.current.add(index);
  };

  useEffect(() => {
    const handleMove = (event: MouseEvent) => {
      const index = resizeIndexRef.current;
      if (index === null) return;
      const delta = event.clientX - startXRef.current;
      const nextWidth = Math.max(72, startWidthRef.current + delta);
      setColumnWidths((prev) => prev.map((width, widthIndex) => (widthIndex === index ? nextWidth : width)));
    };
    const handleUp = () => {
      resizeIndexRef.current = null;
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, []);

  const gridTemplateColumns = useMemo(
    () => columnWidths.map((width) => `${Math.round(width)}px`).join(" "),
    [columnWidths]
  );

  const togglePeriodSort = (weekIndex: number) => {
    if (periodSort && periodSort.weekIndex === weekIndex) {
      if (periodSort.order === "asc") {
        setPeriodSort({ weekIndex, order: "desc" });
      } else {
        setPeriodSort(null);
      }
    } else {
      setPeriodSort({ weekIndex, order: "asc" });
    }
  };

  const sortedMetrics = useMemo(() => {
    if (!periodSort) return metrics;
    const { weekIndex, order } = periodSort;
    return [...metrics].sort((a, b) => {
      const aVal = (series[a.id] ?? [])[weekIndex] ?? 0;
      const bVal = (series[b.id] ?? [])[weekIndex] ?? 0;
      return order === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [metrics, periodSort, series]);

  const grid = (
    <div className="data-grid" ref={gridRef}>
      {showHeader && (
        <div className="data-row data-header" style={{ gridTemplateColumns } as CSSProperties}>
          <div className="data-cell data-name is-resizable">
            지표
            <button
              type="button"
              className="col-resizer"
              aria-label="Resize 지표 column"
              onMouseDown={(event) => startResize(0, event.clientX)}
            />
          </div>
          <div className="data-cell data-spark is-resizable">
            추이
            <button
              type="button"
              className="col-resizer"
              aria-label="Resize 추이 column"
              onMouseDown={(event) => startResize(1, event.clientX)}
            />
          </div>
          {weeks.map((week, weekIndex) => {
            const isActive = periodSort?.weekIndex === weekIndex;
            const currentOrder = isActive ? periodSort!.order : null;
            return (
              <div key={week} className={`data-cell data-week is-resizable${isActive ? " is-sorted" : ""}`}>
                <button
                  type="button"
                  className="week-sort-trigger"
                  onClick={() => togglePeriodSort(weekIndex)}
                  title="기간별 정렬"
                >
                  {week}
                  <span className={`period-sort-toggle${isActive ? " is-active" : ""}`}>
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                      <polygon points="8 2 12 7 4 7" opacity={currentOrder === "asc" ? 1 : 0.25} />
                      <polygon points="8 14 4 9 12 9" opacity={currentOrder === "desc" ? 1 : 0.25} />
                    </svg>
                  </span>
                </button>
                <button
                  type="button"
                  className="col-resizer"
                  aria-label={`Resize ${week} column`}
                  onMouseDown={(event) => startResize(2 + weekIndex, event.clientX)}
                />
              </div>
            );
          })}
        </div>
      )}
      {sortedMetrics.map((metric, metricIndex) => {
        const values = series[metric.id] ?? Array(weeks.length).fill(0);
        const completeValues = values.filter((_, i) => !partialIndices.has(i));
        const min = completeValues.length ? Math.min(...completeValues) : 0;
        const max = completeValues.length ? Math.max(...completeValues) : 0;
        const sparkValues = values.map((v, i) => partialIndices.has(i) ? null : v);
        return (
          <div
            key={metric.id}
            className={`data-row ${metric.id === primaryMetricId ? "is-primary" : ""}`}
            style={{ gridTemplateColumns } as CSSProperties}
          >
            <div className="data-cell data-name">
              <span className="name-title">{metric.name}</span>
              <div className="heatmap-color-picker-wrap">
                <button
                  type="button"
                  className="heatmap-toggle-dot"
                  title="히트맵 색상 선택"
                  onClick={(e) => openColorPicker(metric.id, e)}
                  style={{
                    backgroundColor: getActiveColorIndex(metric.id, metricIndex) === null
                      ? "var(--border)"
                      : `rgb(${METRIC_HEAT_COLORS[(getActiveColorIndex(metric.id, metricIndex) ?? metricIndex) % METRIC_HEAT_COLORS.length].join(",")})`,
                  }}
                />
                {colorPickerOpen === metric.id && pickerPos && createPortal(
                  <div className="heatmap-color-dropdown" ref={colorPickerRef} style={{ top: pickerPos.top, left: pickerPos.left }}>
                    {METRIC_HEAT_COLORS.map((color, ci) => (
                      <button
                        key={ci}
                        type="button"
                        className={`heatmap-color-option${getActiveColorIndex(metric.id, metricIndex) === ci ? " is-active" : ""}`}
                        onClick={() => selectHeatmapColor(metric.id, ci)}
                        style={{ backgroundColor: `rgb(${color.join(",")})` }}
                        title={["파랑", "초록", "노랑", "보라", "핑크", "주황", "회색"][ci]}
                      />
                    ))}
                    <button
                      type="button"
                      className={`heatmap-color-option heatmap-color-off${getActiveColorIndex(metric.id, metricIndex) === null ? " is-active" : ""}`}
                      onClick={() => selectHeatmapColor(metric.id, null)}
                      title="색상 끄기"
                    >
                      ✕
                    </button>
                  </div>,
                  document.body
                )}
              </div>
              {onToggleDeltaMetric && (
                <button
                  type="button"
                  className={`delta-toggle-icon${hiddenDeltaMetrics.has(metric.id) ? " is-off" : ""}`}
                  onClick={() => onToggleDeltaMetric(metric.id)}
                  title={hiddenDeltaMetrics.has(metric.id) ? "증감 노출" : "증감 숨기기"}
                >
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                    <polygon points="8 1 14 7 2 7" />
                    <polygon points="8 15 2 9 14 9" />
                  </svg>
                </button>
              )}
            </div>
            <div className="data-cell data-spark">
              <Sparkline values={sparkValues} labels={weeks} formatValue={(value) => formatValue(value, metric)} />
            </div>
            {values.map((value, index) => {
              const isPartial = partialIndices.has(index);
              const delta = index > 0 ? value - values[index - 1] : null;
              const deltaLabel = formatDelta(metric, delta);
              const activeColor = getActiveColorIndex(metric.id, metricIndex);
              const bgColor = activeColor === null || isPartial
                ? undefined
                : getMetricHeatColor(activeColor, min, max, value);
              return (
                <div
                  key={`${metric.id}-${index}`}
                  className={`data-cell data-value${isPartial ? " is-partial" : ""}`}
                  style={{ backgroundColor: bgColor }}
                >
                  <span className="value-main">{formatValue(value, metric)}</span>
                  {!hiddenDeltaMetrics.has(metric.id) && (
                    <span
                      className={`value-delta ${delta !== null ? "has-delta" : ""} ${
                        delta !== null && delta < 0 ? "is-negative" : ""
                      }`}
                    >
                      {delta !== null ? `(${deltaLabel})` : "-"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );

  const wrapperClass = `${embedded ? "table-embedded" : "card"} table-card ${dense ? "is-dense" : ""} ${
    indent ? "is-indent" : ""
  }`.trim();

  return (
    <div className={wrapperClass}>
      {title && (
        <div className="table-head-row">
          <div className="card-title">{title}</div>
        </div>
      )}
      {scrollable ? <div className="table-scroll">{grid}</div> : grid}
    </div>
  );
}
