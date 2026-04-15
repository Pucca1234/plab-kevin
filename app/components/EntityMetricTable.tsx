"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Entity, FilterOption, MeasurementUnitOption, Metric } from "../types";
import Sparkline from "./Sparkline";
import { formatValue } from "../lib/format";
import { measureMetricLabelColumnMinWidth } from "../lib/tableSizing";

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
  // — cool blues & teals —
  [66, 133, 244],  // google blue
  [56, 114, 181],  // steel blue
  [41, 98, 166],   // cobalt
  [0, 150, 199],   // cerulean
  [0, 172, 193],   // dark cyan
  [38, 166, 154],  // teal
  // — greens —
  [76, 175, 80],   // green
  [56, 142, 60],   // forest
  [104, 159, 56],  // olive green
  [124, 179, 66],  // light green
  // — warm earth —
  [175, 137, 80],  // sand
  [161, 110, 60],  // sienna
  // — oranges & ambers —
  [230, 147, 68],  // marigold
  [211, 124, 48],  // burnt orange
  [194, 107, 41],  // copper
  // — reds & roses —
  [198, 85, 90],   // dusty rose
  [183, 58, 74],   // berry
  [168, 56, 56],   // brick
  // — purples —
  [126, 87, 194],  // amethyst
  [103, 58, 183],  // deep purple
  [136, 71, 152],  // plum
  [156, 85, 170],  // orchid
  // — pinks & magentas —
  [186, 104, 137], // mauve
  [171, 71, 120],  // raspberry
  // — neutrals —
  [120, 130, 150], // cool gray
  [130, 120, 110], // warm gray
  [108, 117, 125], // graphite
  // — unique accents —
  [78, 150, 120],  // sage
  [90, 130, 80],   // moss
  [145, 120, 180], // lavender
  [180, 140, 100], // camel
  [100, 140, 160], // slate blue
  [160, 100, 80],  // clay
  [80, 145, 145],  // arctic
  [140, 95, 115],  // mulberry
  [110, 155, 95],  // fern
];

// 초기 추천: 색상환에서 최대한 떨어진 순서로 배치 (세련된 조합)
const RECOMMENDED_COLOR_ORDER = [0, 18, 6, 16, 12, 27, 3, 20, 9, 23, 14, 24, 29, 5, 22, 10, 30, 17, 1, 28, 7, 19, 13, 25, 31, 4, 21, 8, 15, 26, 32, 2, 11, 33, 34, 35];

const getMetricHeatColor = (
  metricIndex: number,
  min: number,
  max: number,
  value: number
) => {
  const [r, g, b] = METRIC_HEAT_COLORS[metricIndex % METRIC_HEAT_COLORS.length];
  if (min === max) return `rgba(${r}, ${g}, ${b}, 0.35)`;
  const ratio = (value - min) / (max - min);
  const intensity = 0.05 + ratio * 0.65;
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

  const getActiveColorIndex = (metricId: string, _defaultIndex: number) => {
    if (metricId in heatmapColorMap) return heatmapColorMap[metricId];
    return 0;
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
  const [periodSort, setPeriodSort] = useState<{ weekIndex: number; metricId: string; order: "asc" | "desc" } | null>(null);
  const [periodSortOpen, setPeriodSortOpen] = useState<number | null>(null);
  const [periodSortPos, setPeriodSortPos] = useState<{ top: number; left: number } | null>(null);
  const periodSortRef = useRef<HTMLDivElement>(null);
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
      if (periodSortRef.current && !periodSortRef.current.contains(event.target as Node)) {
        setPeriodSortOpen(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [expandedEntityName, onDrilldownClose, periodSortOpen]);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const rows = Array.from(grid.querySelectorAll(".data-row")) as HTMLElement[];
    if (!rows.length) return;
    const metricCells = Array.from(grid.querySelectorAll(".data-cell.data-metric")) as HTMLElement[];
    const metricNameEls = Array.from(grid.querySelectorAll(".data-metric .name-title")) as HTMLElement[];
    // 측정 전: flex/ellipsis 제약을 해제해 실제 텍스트 폭을 읽는다.
    const overflowEls = Array.from(grid.querySelectorAll(".data-metric, .data-metric .name-title")) as HTMLElement[];
    const restoreStyles = overflowEls.map((el) => ({
      el,
      overflow: el.style.overflow,
      textOverflow: el.style.textOverflow,
      flexShrink: el.style.flexShrink,
      minWidth: el.style.minWidth,
      maxWidth: el.style.maxWidth,
      width: el.style.width,
      display: el.style.display,
      flex: el.style.flex
    }));
    overflowEls.forEach((el) => {
      el.style.overflow = "visible";
      el.style.textOverflow = "clip";
      el.style.flexShrink = "0";
      el.style.minWidth = "max-content";
      el.style.maxWidth = "none";
    });
    metricNameEls.forEach((el) => {
      el.style.display = "inline-block";
      el.style.width = "max-content";
      el.style.flex = "0 0 auto";
    });
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
    const metricNameColumnMinWidth = measureMetricLabelColumnMinWidth(
      metricCells,
      metrics.map((metric) => metric.name)
    );
    restoreStyles.forEach(({ el, overflow, textOverflow, flexShrink, minWidth, maxWidth, width, display, flex }) => {
      el.style.overflow = overflow;
      el.style.textOverflow = textOverflow;
      el.style.flexShrink = flexShrink;
      el.style.minWidth = minWidth;
      el.style.maxWidth = maxWidth;
      el.style.width = width;
      el.style.display = display;
      el.style.flex = flex;
    });

    setColumnWidths((prev) => {
      const next = maxW.map((w, i) =>
        manualResized.current.has(i) ? (prev[i] ?? w) : Math.max(w, 40)
      );
      if (!manualResized.current.has(1)) {
        next[1] = Math.max(next[1] ?? 0, metricNameColumnMinWidth);
      }
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
    let result = entities;
    if (entitySortOrder) {
      result = [...result].sort((a, b) => {
        const cmp = a.name.localeCompare(b.name, "ko-KR");
        return entitySortOrder === "asc" ? cmp : -cmp;
      });
    }
    if (periodSort) {
      const { weekIndex, metricId, order } = periodSort;
      result = [...result].sort((a, b) => {
        const aVal = (seriesByEntity[a.id] ?? {})[metricId]?.[weekIndex] ?? 0;
        const bVal = (seriesByEntity[b.id] ?? {})[metricId]?.[weekIndex] ?? 0;
        return order === "asc" ? aVal - bVal : bVal - aVal;
      });
    }
    return result;
  }, [entities, entitySortOrder, periodSort, seriesByEntity]);

  const toggleEntitySort = () => {
    setEntitySortOrder((prev) => {
      if (prev === null) return "asc";
      if (prev === "asc") return "desc";
      return null;
    });
  };

  const openPeriodSortMenu = (weekIndex: number, e: React.MouseEvent) => {
    if (periodSortOpen === weekIndex) { setPeriodSortOpen(null); return; }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPeriodSortPos({ top: rect.bottom + 4, left: rect.left });
    setPeriodSortOpen(weekIndex);
  };

  const togglePeriodSort = (weekIndex: number, metricId: string) => {
    if (periodSort && periodSort.weekIndex === weekIndex && periodSort.metricId === metricId) {
      if (periodSort.order === "asc") {
        setPeriodSort({ weekIndex, metricId, order: "desc" });
      } else {
        setPeriodSort(null);
      }
    } else {
      setPeriodSort({ weekIndex, metricId, order: "asc" });
    }
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
              <div key={week} className={`data-cell data-week is-resizable${periodSort?.weekIndex === weekIndex ? " is-sorted" : ""}`}>
                <button
                  type="button"
                  className="week-sort-trigger"
                  onClick={(e) => openPeriodSortMenu(weekIndex, e)}
                  title="기간별 정렬"
                >
                  {week}
                  {periodSort?.weekIndex === weekIndex && (
                    <svg className="week-sort-icon" width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                      {periodSort.order === "asc"
                        ? <polygon points="8 3 14 11 2 11" />
                        : <polygon points="8 13 2 5 14 5" />}
                    </svg>
                  )}
                </button>
                {periodSortOpen === weekIndex && periodSortPos && createPortal(
                  <div className="period-sort-menu" ref={periodSortRef} style={{ top: periodSortPos.top, left: periodSortPos.left }}>
                    {metrics.map((m) => {
                      const isActive = periodSort?.weekIndex === weekIndex && periodSort.metricId === m.id;
                      const currentOrder = isActive ? periodSort!.order : null;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          className={`period-sort-metric${isActive ? " is-active" : ""}`}
                          onClick={() => togglePeriodSort(weekIndex, m.id)}
                        >
                          <span className="period-sort-metric-name">{m.name}</span>
                          <span className={`period-sort-toggle${isActive ? " is-active" : ""}`}>
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                              <polygon points="8 2 12 7 4 7" opacity={currentOrder === "asc" ? 1 : 0.25} />
                              <polygon points="8 14 4 9 12 9" opacity={currentOrder === "desc" ? 1 : 0.25} />
                            </svg>
                          </span>
                        </button>
                      );
                    })}
                  </div>,
                  document.body
                )}
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
                              title={`색상 ${ci + 1}`}
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
