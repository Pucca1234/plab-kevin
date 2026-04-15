"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Entity, FilterOption, MeasurementUnitOption, Metric } from "../types";
import Sparkline from "./Sparkline";
import { formatValue } from "../lib/format";

type EntityMetricTableProps = {
  weeks: string[];
  entities: Entity[];
  metrics: Metric[];
  seriesByEntity: Record<string, Record<string, number[]>>;
  hiddenDeltaMetrics?: Set<string>;
  onToggleDeltaMetric?: (metricId: string) => void;
  onEntitySelect?: (entityName: string) => void;
  entityFilterOptions?: FilterOption[];
  entityFilterValue?: string;
  onEntityFilterSelect?: (value: string) => void;
  drilldownPathItems?: { label: string; targetIndex: number; isCurrent: boolean }[];
  onDrilldownNavigate?: (targetIndex: number) => void;
  expandedEntityName?: string | null;
  drilldownUnitOptions?: MeasurementUnitOption[];
  isDrilldownOptionsLoading?: boolean;
  onDrilldownSelect?: (value: string) => void;
  onDrilldownClose?: () => void;
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
  [219, 68, 55],   // red
  [230, 126, 34],  // orange
  [241, 196, 15],  // yellow
  [46, 204, 113],  // green
  [26, 188, 156],  // teal
  [52, 152, 219],  // blue
  [142, 68, 173],  // purple
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

export default function EntityMetricTable({
  weeks,
  entities,
  metrics,
  seriesByEntity,
  hiddenDeltaMetrics = new Set(),
  onToggleDeltaMetric,
  onEntitySelect,
  entityFilterOptions = [],
  entityFilterValue,
  onEntityFilterSelect,
  drilldownPathItems = [],
  onDrilldownNavigate,
  expandedEntityName,
  drilldownUnitOptions = [],
  isDrilldownOptionsLoading = false,
  onDrilldownSelect,
  onDrilldownClose,
  partialIndices = new Set()
}: EntityMetricTableProps) {
  const weekColumnCount = weeks.length;
  const colCount = 3 + weekColumnCount;
  const [columnWidths, setColumnWidths] = useState<number[]>([140, 100, 90, ...Array(weekColumnCount).fill(100)]);
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

  const globalMinMax = useMemo(() => {
    const result: Record<string, { min: number; max: number }> = {};
    for (const metric of metrics) {
      let min = Infinity;
      let max = -Infinity;
      for (const entity of entities) {
        const values = (seriesByEntity[entity.id] ?? {})[metric.id];
        if (!values) continue;
        for (let i = 0; i < values.length; i++) {
          if (partialIndices.has(i)) continue;
          const v = values[i];
          if (v < min) min = v;
          if (v > max) max = v;
        }
      }
      if (min === Infinity) { min = 0; max = 0; }
      result[metric.id] = { min, max };
    }
    return result;
  }, [metrics, entities, seriesByEntity, partialIndices]);

  const selectHeatmapColor = (metricId: string, colorIndex: number | null) => {
    setHeatmapColorMap((prev) => ({ ...prev, [metricId]: colorIndex }));
    setColorPickerOpen(null);
  };
  const resizeIndexRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const manualResized = useRef(new Set<number>());
  const gridRef = useRef<HTMLDivElement>(null);
  const [entitySortOrder, setEntitySortOrder] = useState<"asc" | "desc" | null>(null);
  const drilldownMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setColumnWidths([140, 100, 90, ...Array(weekColumnCount).fill(100)]);
    manualResized.current.clear();
  }, [weekColumnCount]);

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (expandedEntityName && drilldownMenuRef.current && !drilldownMenuRef.current.contains(event.target as Node)) {
        onDrilldownClose?.();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [expandedEntityName, onDrilldownClose]);

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
  }, [weeks, metrics, entities, seriesByEntity, hiddenDeltaMetrics, colCount]);

  const startResize = (index: number, clientX: number) => {
    resizeIndexRef.current = index;
    startXRef.current = clientX;
    startWidthRef.current = columnWidths[index] ?? 100;
    manualResized.current.add(index);
  };

  const gridTemplateColumns = useMemo(
    () => columnWidths.map((width) => `${Math.round(width)}px`).join(" "),
    [columnWidths]
  );

  const sortedEntities = useMemo(() => {
    if (!entitySortOrder) return entities;
    return [...entities].sort((a, b) => {
      const cmp = a.name.localeCompare(b.name, "ko-KR");
      return entitySortOrder === "asc" ? cmp : -cmp;
    });
  }, [entities, entitySortOrder]);

  const toggleEntitySort = () => {
    setEntitySortOrder((prev) => {
      if (prev === null) return "asc";
      if (prev === "asc") return "desc";
      return null;
    });
  };

  return (
    <div className="card table-card">
      <div className="table-head-row">
        {drilldownPathItems.length > 0 ? (
          <div className="drilldown-path" aria-label="드릴다운 경로">
            {drilldownPathItems.map((item, index) => (
              <span key={`${item.label}-${index}`} className="drilldown-path-item">
                {item.isCurrent || !onDrilldownNavigate ? (
                  <span className={`drilldown-node ${item.isCurrent ? "is-current" : ""}`}>{item.label}</span>
                ) : (
                  <button
                    type="button"
                    className="drilldown-node is-link"
                    onClick={() => onDrilldownNavigate(item.targetIndex)}
                  >
                    {item.label}
                  </button>
                )}
                {index < drilldownPathItems.length - 1 && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="drilldown-sep-icon">
                    <polyline points="9 6 15 12 9 18" />
                  </svg>
                )}
              </span>
            ))}
          </div>
        ) : (
          <div />
        )}
      </div>
      <div className="table-scroll">
        <div className="data-grid entity-grid" ref={gridRef}>
          <div className="data-row data-header" style={{ gridTemplateColumns } as CSSProperties}>
            <div className="data-cell data-entity is-resizable entity-header-cell">
              <button
                type="button"
                className="entity-sort-trigger"
                onClick={toggleEntitySort}
              >
                측정단위
              </button>
              <button
                type="button"
                className="col-resizer"
                aria-label="Resize entity column"
                onMouseDown={(event) => startResize(0, event.clientX)}
              />
            </div>
            <div className="data-cell data-metric is-resizable">
              지표
              <button
                type="button"
                className="col-resizer"
                aria-label="Resize metric column"
                onMouseDown={(event) => startResize(1, event.clientX)}
              />
            </div>
            <div className="data-cell data-spark is-resizable">
              추이
              <button
                type="button"
                className="col-resizer"
                aria-label="Resize spark column"
                onMouseDown={(event) => startResize(2, event.clientX)}
              />
            </div>
            {weeks.map((week, weekIndex) => (
              <div key={week} className="data-cell data-week is-resizable">
                {week}
                <button
                  type="button"
                  className="col-resizer"
                  aria-label={`Resize ${week} column`}
                  onMouseDown={(event) => startResize(3 + weekIndex, event.clientX)}
                />
              </div>
            ))}
          </div>
          {sortedEntities.flatMap((entity) => {
            const series = seriesByEntity[entity.id] ?? {};
            return metrics.map((metric, index) => {
              const values = series[metric.id] ?? Array(weeks.length).fill(0);
              const isFirst = index === 0;
              const isExpanded = isFirst && expandedEntityName === entity.name;

              return (
                <div key={`${entity.id}-${metric.id}`} className="data-row" style={{ gridTemplateColumns } as CSSProperties}>
                  <div
                    className={`data-cell data-entity ${isFirst ? "is-clickable" : "is-empty"} ${isExpanded ? "is-expanded" : ""}`}
                    onClick={isFirst && onEntitySelect ? () => onEntitySelect(entity.name) : undefined}
                    role={isFirst && onEntitySelect ? "button" : undefined}
                    tabIndex={isFirst && onEntitySelect ? 0 : undefined}
                    onKeyDown={
                      isFirst && onEntitySelect
                        ? (event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              onEntitySelect(entity.name);
                            }
                          }
                        : undefined
                    }
                  >
                    {isFirst && onEntitySelect ? (
                      <div className="entity-cell-wrap" ref={isExpanded ? drilldownMenuRef : undefined}>
                        <span className="name-title">
                          {entity.name}
                        </span>
                        {isExpanded && (
                          <div
                            className="entity-drilldown-menu entity-filter-menu"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {isDrilldownOptionsLoading ? (
                              <div className="entity-drilldown-empty">드릴다운 옵션 확인 중...</div>
                            ) : drilldownUnitOptions.length > 0 ? (
                              drilldownUnitOptions.map((option) => (
                                <button
                                  key={option.value}
                                  type="button"
                                  className="entity-filter-option"
                                  onClick={() => onDrilldownSelect?.(option.value)}
                                >
                                  {option.label}
                                </button>
                              ))
                            ) : (
                              <div className="entity-drilldown-empty">선택 가능한 측정단위가 없습니다.</div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="name-title">{entity.name}</span>
                    )}
                  </div>
                  <div className="data-cell data-metric">
                    <span className="name-title">{metric.name}</span>
                    <div className="heatmap-color-picker-wrap">
                      <button
                        type="button"
                        className="heatmap-toggle-dot"
                        title="히트맵 색상 선택"
                        onClick={(e) => openColorPicker(`${entity.id}-${metric.id}`, e)}
                        style={{
                          backgroundColor: getActiveColorIndex(metric.id, index) === null
                            ? "var(--border)"
                            : `rgb(${METRIC_HEAT_COLORS[(getActiveColorIndex(metric.id, index) ?? index) % METRIC_HEAT_COLORS.length].join(",")})`,
                        }}
                      />
                      {colorPickerOpen === `${entity.id}-${metric.id}` && pickerPos && createPortal(
                        <div className="heatmap-color-dropdown" ref={colorPickerRef} style={{ top: pickerPos.top, left: pickerPos.left }}>
                          {METRIC_HEAT_COLORS.map((color, ci) => (
                            <button
                              key={ci}
                              type="button"
                              className={`heatmap-color-option${getActiveColorIndex(metric.id, index) === ci ? " is-active" : ""}`}
                              onClick={() => selectHeatmapColor(metric.id, ci)}
                              style={{ backgroundColor: `rgb(${color.join(",")})` }}
                              title={["빨강", "주황", "노랑", "초록", "청록", "파랑", "보라"][ci]}
                            />
                          ))}
                          <button
                            type="button"
                            className={`heatmap-color-option heatmap-color-off${getActiveColorIndex(metric.id, index) === null ? " is-active" : ""}`}
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
                    <Sparkline values={values.map((v, i) => partialIndices.has(i) ? null : v)} labels={weeks} formatValue={(value) => formatValue(value, metric)} />
                  </div>
                  {values.map((value, indexValue) => {
                    const isPartial = partialIndices.has(indexValue);
                    const delta = indexValue > 0 ? value - values[indexValue - 1] : null;
                    const deltaLabel = formatDelta(metric, delta);
                    const { min, max } = globalMinMax[metric.id] ?? { min: 0, max: 0 };
                    const activeColor = getActiveColorIndex(metric.id, index);
                    const bgColor = activeColor === null || isPartial
                      ? undefined
                      : getMetricHeatColor(activeColor, min, max, value);
                    return (
                      <div
                        key={`${entity.id}-${metric.id}-${indexValue}`}
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
            });
          })}
        </div>
      </div>
    </div>
  );
}
