"use client";

import { useMemo, useState } from "react";
import ControlBar from "../components/ControlBar";
import EntityMetricTable from "../components/EntityMetricTable";
import MetricTable from "../components/MetricTable";
import type {
  Entity,
  FilterOption,
  FilterTemplate,
  MeasurementUnit,
  MeasurementUnitOption,
  Metric,
  PeriodUnit
} from "../types";
import styles from "./prototype.module.css";

const ALL_LABEL = "전체";
const ALL_VALUE = "all";

type DrilldownParent = { unit: MeasurementUnit; value: string } | null;
type DrilldownHistoryItem = {
  measurementUnit: MeasurementUnit;
  filterValue: string;
  parent: DrilldownParent;
};
type PeriodMeta = {
  key: string;
  label: string;
  startDate: string;
  endDate: string;
  meta: Partial<Record<PeriodUnit, string>>;
};
type PeriodDrilldownItem = {
  parentUnit: PeriodUnit;
  parentLabel: string;
  childUnit: PeriodUnit;
  startDate: string;
  endDate: string;
};
type LeafVenue = {
  area_group: string;
  area: string;
  stadium_group: string;
  stadium: string;
  intensity: number;
};

const metrics: Metric[] = [
  { id: "total_match_cnt", name: "전체 매치 수", description: "Mock metric", format: "number" },
  { id: "setting_match_cnt", name: "세팅 매치 수", description: "Mock metric", format: "number" },
  { id: "progress_match_rate", name: "진행률", description: "Mock metric", format: "percent" },
  { id: "match_open_rate", name: "매치 공개율", description: "Mock metric", format: "percent" }
];

const measurementUnitOptions: MeasurementUnitOption[] = [
  { value: "all", label: ALL_LABEL },
  { value: "area_group", label: "지역그룹" },
  { value: "area", label: "지역" },
  { value: "stadium_group", label: "구장" },
  { value: "stadium", label: "면" }
];

const periodUnitOptions: { label: string; value: PeriodUnit }[] = [
  { label: "연", value: "year" },
  { label: "분기", value: "quarter" },
  { label: "월", value: "month" },
  { label: "주", value: "week" },
  { label: "일", value: "day" }
];

const periodRangeOptionsByUnit: Record<PeriodUnit, { label: string; value: string }[]> = {
  year: [{ label: "전체", value: "all" }, { label: "최근 3년", value: "recent_3" }],
  quarter: [{ label: "전체", value: "all" }, { label: "최근 4분기", value: "recent_4" }],
  month: [{ label: "전체", value: "all" }, { label: "최근 6개월", value: "recent_6" }],
  week: [{ label: "전체", value: "all" }, { label: "최근 8주", value: "recent_8" }],
  day: [{ label: "전체", value: "all" }, { label: "최근 14일", value: "recent_14" }]
};

const defaultPeriodRangeValueByUnit: Record<PeriodUnit, string> = {
  year: "recent_3",
  quarter: "recent_4",
  month: "recent_6",
  week: "recent_8",
  day: "recent_14"
};

const periodRangeSizeMapByUnit: Record<PeriodUnit, Record<string, number | undefined>> = {
  year: { all: undefined, recent_3: 3 },
  quarter: { all: undefined, recent_4: 4 },
  month: { all: undefined, recent_6: 6 },
  week: { all: undefined, recent_8: 8 },
  day: { all: undefined, recent_14: 14 }
};

const periodFilterLabelMap: Record<PeriodUnit, string> = {
  year: "연",
  quarter: "분기",
  month: "월",
  week: "주",
  day: "일"
};

const periodFilterUnitsByUnit: Record<PeriodUnit, PeriodUnit[]> = {
  year: ["year"],
  quarter: ["year", "quarter"],
  month: ["year", "quarter", "month"],
  week: ["year", "quarter", "month", "week"],
  day: ["year", "quarter", "month", "week", "day"]
};

const periodDrilldownOptionsMap: Record<PeriodUnit, { label: string; value: PeriodUnit }[]> = {
  year: [{ label: "분기", value: "quarter" }, { label: "월", value: "month" }],
  quarter: [{ label: "월", value: "month" }, { label: "주", value: "week" }],
  month: [{ label: "주", value: "week" }, { label: "일", value: "day" }],
  week: [{ label: "일", value: "day" }],
  day: []
};

const drilldownTargetMap: Record<string, MeasurementUnitOption[]> = {
  all: [{ value: "area_group", label: "지역그룹" }],
  area_group: [{ value: "area", label: "지역" }],
  area: [{ value: "stadium_group", label: "구장" }],
  stadium_group: [{ value: "stadium", label: "면" }],
  stadium: []
};

const leaves: LeafVenue[] = [
  { area_group: "수도권", area: "강남", stadium_group: "강남 센터", stadium: "A면", intensity: 1.2 },
  { area_group: "수도권", area: "강남", stadium_group: "강남 센터", stadium: "B면", intensity: 1.1 },
  { area_group: "수도권", area: "잠실", stadium_group: "잠실 스타디움", stadium: "메인", intensity: 1.15 },
  { area_group: "수도권", area: "마포", stadium_group: "홍대 파크", stadium: "루프탑", intensity: 0.95 },
  { area_group: "충청", area: "대전", stadium_group: "대전 돔", stadium: "실내", intensity: 0.9 },
  { area_group: "영남", area: "부산", stadium_group: "해운대 필드", stadium: "비치", intensity: 1.05 }
];

const templates: FilterTemplate[] = [
  {
    id: "mock-template",
    user_id: "prototype",
    name: "이번달 운영안",
    config: {
      periodUnit: "month",
      periodRangeValue: "recent_6",
      measurementUnit: "area",
      filterValue: ALL_VALUE,
      selectedMetricIds: ["total_match_cnt", "progress_match_rate", "match_open_rate"]
    },
    is_default: false,
    is_shared: true,
    created_at: "",
    updated_at: ""
  }
];

const themes = [
  {
    id: "classic",
    name: "Classic",
    wrapperClassName: styles.classic,
    vars: {
      ["--bg" as string]: "#eef3f8",
      ["--card" as string]: "#ffffff",
      ["--ink" as string]: "#102033",
      ["--muted" as string]: "#6f7f93",
      ["--secondary" as string]: "#415165",
      ["--border" as string]: "rgba(16, 32, 51, 0.08)",
      ["--border-subtle" as string]: "rgba(16, 32, 51, 0.06)",
      ["--primary" as string]: "#1e63ff",
      ["--primary-hover" as string]: "#144fd0",
      ["--primary-soft" as string]: "rgba(30, 99, 255, 0.1)",
      ["--primary-muted" as string]: "#dbe7ff",
      ["--primary-ring" as string]: "rgba(30, 99, 255, 0.22)",
      ["--primary-glow" as string]: "rgba(30, 99, 255, 0.18)",
      ["--accent" as string]: "#16b37a",
      ["--success" as string]: "#16a34a",
      ["--warning" as string]: "#df8b19",
      ["--shadow" as string]: "0 18px 42px rgba(24, 42, 72, 0.08)",
      ["--shadow-soft" as string]: "0 10px 24px rgba(24, 42, 72, 0.06)",
      ["--radius" as string]: "20px",
      ["--radius-sm" as string]: "12px",
      ["--radius-md" as string]: "14px",
      ["--radius-lg" as string]: "20px",
      ["--radius-xl" as string]: "28px"
    }
  },
  {
    id: "modern",
    name: "New",
    wrapperClassName: styles.modern,
    vars: {
      ["--bg" as string]: "#f4efe7",
      ["--card" as string]: "#fffdf8",
      ["--ink" as string]: "#1b1712",
      ["--muted" as string]: "#786b5d",
      ["--secondary" as string]: "#3f342a",
      ["--border" as string]: "rgba(27, 23, 18, 0.1)",
      ["--border-subtle" as string]: "rgba(27, 23, 18, 0.08)",
      ["--primary" as string]: "#0d8f73",
      ["--primary-hover" as string]: "#0a745d",
      ["--primary-soft" as string]: "rgba(13, 143, 115, 0.12)",
      ["--primary-muted" as string]: "#d5f0e7",
      ["--primary-ring" as string]: "rgba(13, 143, 115, 0.24)",
      ["--primary-glow" as string]: "rgba(13, 143, 115, 0.16)",
      ["--accent" as string]: "#ff8f3d",
      ["--success" as string]: "#1f8a57",
      ["--warning" as string]: "#d77f1f",
      ["--shadow" as string]: "0 20px 40px rgba(64, 48, 34, 0.12)",
      ["--shadow-soft" as string]: "0 12px 24px rgba(64, 48, 34, 0.08)",
      ["--radius" as string]: "24px",
      ["--radius-sm" as string]: "14px",
      ["--radius-md" as string]: "18px",
      ["--radius-lg" as string]: "24px",
      ["--radius-xl" as string]: "30px"
    }
  }
] as const;

const monthPeriods: PeriodMeta[] = [
  { key: "25.12", label: "25.12", startDate: "2025-12-01", endDate: "2025-12-31", meta: { year: "25", quarter: "25.4", month: "25.12" } },
  { key: "26.01", label: "26.01", startDate: "2026-01-01", endDate: "2026-01-31", meta: { year: "26", quarter: "26.1", month: "26.01" } },
  { key: "26.02", label: "26.02", startDate: "2026-02-01", endDate: "2026-02-28", meta: { year: "26", quarter: "26.1", month: "26.02" } },
  { key: "26.03", label: "26.03", startDate: "2026-03-01", endDate: "2026-03-31", meta: { year: "26", quarter: "26.1", month: "26.03" } },
  { key: "26.04", label: "26.04", startDate: "2026-04-01", endDate: "2026-04-30", meta: { year: "26", quarter: "26.2", month: "26.04" } },
  { key: "26.05", label: "26.05", startDate: "2026-05-01", endDate: "2026-05-31", meta: { year: "26", quarter: "26.2", month: "26.05" } },
  { key: "26.06", label: "26.06", startDate: "2026-06-01", endDate: "2026-06-30", meta: { year: "26", quarter: "26.2", month: "26.06" } }
];

const allPeriods: Record<PeriodUnit, PeriodMeta[]> = {
  year: [
    { key: "24", label: "24", startDate: "2024-01-01", endDate: "2024-12-31", meta: { year: "24" } },
    { key: "25", label: "25", startDate: "2025-01-01", endDate: "2025-12-31", meta: { year: "25" } },
    { key: "26", label: "26", startDate: "2026-01-01", endDate: "2026-12-31", meta: { year: "26" } }
  ],
  quarter: [
    { key: "25.4", label: "25.4", startDate: "2025-10-01", endDate: "2025-12-31", meta: { year: "25", quarter: "25.4" } },
    { key: "26.1", label: "26.1", startDate: "2026-01-01", endDate: "2026-03-31", meta: { year: "26", quarter: "26.1" } },
    { key: "26.2", label: "26.2", startDate: "2026-04-01", endDate: "2026-06-30", meta: { year: "26", quarter: "26.2" } }
  ],
  month: monthPeriods,
  week: [
    { key: "26.03.30 - 04.05", label: "26.03.30 - 04.05", startDate: "2026-03-30", endDate: "2026-04-05", meta: { year: "26", quarter: "26.2", month: "26.04", week: "26.03.30 - 04.05" } },
    { key: "26.04.06 - 04.12", label: "26.04.06 - 04.12", startDate: "2026-04-06", endDate: "2026-04-12", meta: { year: "26", quarter: "26.2", month: "26.04", week: "26.04.06 - 04.12" } },
    { key: "26.04.13 - 04.19", label: "26.04.13 - 04.19", startDate: "2026-04-13", endDate: "2026-04-19", meta: { year: "26", quarter: "26.2", month: "26.04", week: "26.04.13 - 04.19" } },
    { key: "26.04.20 - 04.26", label: "26.04.20 - 04.26", startDate: "2026-04-20", endDate: "2026-04-26", meta: { year: "26", quarter: "26.2", month: "26.04", week: "26.04.20 - 04.26" } },
    { key: "26.04.27 - 05.03", label: "26.04.27 - 05.03", startDate: "2026-04-27", endDate: "2026-05-03", meta: { year: "26", quarter: "26.2", month: "26.05", week: "26.04.27 - 05.03" } },
    { key: "26.05.04 - 05.10", label: "26.05.04 - 05.10", startDate: "2026-05-04", endDate: "2026-05-10", meta: { year: "26", quarter: "26.2", month: "26.05", week: "26.05.04 - 05.10" } },
    { key: "26.05.11 - 05.17", label: "26.05.11 - 05.17", startDate: "2026-05-11", endDate: "2026-05-17", meta: { year: "26", quarter: "26.2", month: "26.05", week: "26.05.11 - 05.17" } },
    { key: "26.05.18 - 05.24", label: "26.05.18 - 05.24", startDate: "2026-05-18", endDate: "2026-05-24", meta: { year: "26", quarter: "26.2", month: "26.05", week: "26.05.18 - 05.24" } }
  ],
  day: Array.from({ length: 14 }, (_, index) => {
    const day = index + 1;
    const label = `26.05.${String(day).padStart(2, "0")}`;
    return {
      key: label,
      label,
      startDate: `2026-05-${String(day).padStart(2, "0")}`,
      endDate: `2026-05-${String(day).padStart(2, "0")}`,
      meta: { year: "26", quarter: "26.2", month: "26.05", day: label }
    };
  })
};

const buildFilterOptions = (values: string[]) =>
  Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, "ko")).map((value) => ({ label: value, value }));

const formatPeriodLabel = (period: string, periodUnit: PeriodUnit) => {
  if (periodUnit === "quarter") {
    const [year, quarter] = period.split(".");
    return `${year}년 ${quarter}분기`;
  }
  return period;
};

const getMetricValue = (metric: Metric, leaf: LeafVenue, periodIndex: number) => {
  const wave = Math.sin((periodIndex + 1) / 2.1) * 0.09;
  if (metric.format === "number") {
    const base = metric.id === "total_match_cnt" ? 72 : 48;
    return Math.round(base * leaf.intensity * (1 + wave));
  }
  const base = metric.id === "progress_match_rate" ? 0.58 : 0.69;
  return Number(Math.max(0.05, Math.min(0.96, base + (leaf.intensity - 1) * 0.18 + wave * 0.45)).toFixed(3));
};

const getGroupingField = (measurementUnit: MeasurementUnit) => {
  if (measurementUnit === "all") return null;
  if (measurementUnit === "area_group") return "area_group";
  if (measurementUnit === "area") return "area";
  if (measurementUnit === "stadium_group") return "stadium_group";
  return "stadium";
};

const getMeasurementFilterUnits = (measurementUnit: MeasurementUnit) => {
  if (measurementUnit === "all") return [] as MeasurementUnit[];
  if (measurementUnit === "area_group") return ["area_group"] as MeasurementUnit[];
  if (measurementUnit === "area") return ["area_group", "area"] as MeasurementUnit[];
  if (measurementUnit === "stadium_group") return ["area_group", "area", "stadium_group"] as MeasurementUnit[];
  return ["area_group", "area", "stadium_group", "stadium"] as MeasurementUnit[];
};

const getBasePeriods = (periodUnit: PeriodUnit, periodRangeValue: string, history: PeriodDrilldownItem[]) => {
  const effectiveUnit = history[history.length - 1]?.childUnit ?? periodUnit;
  const count = periodRangeSizeMapByUnit[effectiveUnit][periodRangeValue];
  const source = allPeriods[effectiveUnit];
  const ranged = typeof count === "number" ? source.slice(-count) : source.slice();
  const active = history[history.length - 1];
  return active
    ? { effectiveUnit, entries: ranged.filter((entry) => entry.startDate >= active.startDate && entry.endDate <= active.endDate) }
    : { effectiveUnit, entries: ranged };
};

export default function PrototypePage() {
  const [themeId, setThemeId] = useState<(typeof themes)[number]["id"]>("classic");
  const [periodUnit, setPeriodUnit] = useState<PeriodUnit>("month");
  const [periodRangeValue, setPeriodRangeValue] = useState("recent_6");
  const [measurementUnit, setMeasurementUnit] = useState<MeasurementUnit>("area");
  const [selectedMetricIds, setSelectedMetricIds] = useState(["total_match_cnt", "progress_match_rate", "match_open_rate"]);
  const [filterSelections, setFilterSelections] = useState<Record<string, string[]>>({});
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [defaultTabName, setDefaultTabName] = useState("프로토타입");
  const [entityFilterValue, setEntityFilterValue] = useState(ALL_VALUE);
  const [drilldownParent, setDrilldownParent] = useState<DrilldownParent>(null);
  const [drilldownHistory, setDrilldownHistory] = useState<DrilldownHistoryItem[]>([{ measurementUnit: "area", filterValue: ALL_LABEL, parent: null }]);
  const [periodDrilldownHistory, setPeriodDrilldownHistory] = useState<PeriodDrilldownItem[]>([]);
  const [metricPickerOpen, setMetricPickerOpen] = useState(false);
  const [expandedEntityName, setExpandedEntityName] = useState<string | null>(null);

  const theme = themes.find((item) => item.id === themeId) ?? themes[0];
  const selectedMetrics = metrics.filter((metric) => selectedMetricIds.includes(metric.id));
  const periodData = useMemo(() => getBasePeriods(periodUnit, periodRangeValue, periodDrilldownHistory), [periodDrilldownHistory, periodRangeValue, periodUnit]);
  const currentPeriodUnit = periodData.effectiveUnit;

  const periodFilterGroups = useMemo(
    () =>
      periodFilterUnitsByUnit[currentPeriodUnit].map((unit) => {
        const options = buildFilterOptions(periodData.entries.map((entry) => entry.meta[unit] ?? "").filter(Boolean));
        return {
          unit,
          label: periodFilterLabelMap[unit],
          options,
          selectedValues: filterSelections[unit] && filterSelections[unit].length > 0 ? filterSelections[unit] : options.map((option) => option.value)
        };
      }),
    [currentPeriodUnit, filterSelections, periodData.entries]
  );

  const measurementFilterGroups = useMemo(
    () =>
      getMeasurementFilterUnits(measurementUnit).map((unit) => {
        const options = buildFilterOptions(leaves.map((leaf) => String(leaf[unit as keyof LeafVenue] ?? "")));
        return {
          unit,
          label: measurementUnitOptions.find((option) => option.value === unit)?.label ?? unit,
          options,
          selectedValues: filterSelections[unit] && filterSelections[unit].length > 0 ? filterSelections[unit] : options.map((option) => option.value)
        };
      }),
    [filterSelections, measurementUnit]
  );

  const visiblePeriods = useMemo(
    () =>
      periodData.entries.filter((entry) =>
        periodFilterGroups.every((group) => {
          const value = entry.meta[group.unit as PeriodUnit];
          return !value || group.selectedValues.includes(value);
        })
      ),
    [periodData.entries, periodFilterGroups]
  );

  const filteredLeaves = useMemo(
    () =>
      leaves.filter((leaf) =>
        measurementFilterGroups.every((group) => group.selectedValues.includes(String(leaf[group.unit as keyof LeafVenue] ?? "")))
      ),
    [measurementFilterGroups]
  );

  const scopedLeaves = useMemo(
    () =>
      !drilldownParent
        ? filteredLeaves
        : filteredLeaves.filter((leaf) => String(leaf[drilldownParent.unit as keyof LeafVenue] ?? "") === drilldownParent.value),
    [drilldownParent, filteredLeaves]
  );

  const dataset = useMemo(() => {
    const groupingField = getGroupingField(measurementUnit);
    const groups = new Map<string, LeafVenue[]>();
    if (!groupingField) groups.set(ALL_LABEL, scopedLeaves);
    else {
      for (const leaf of scopedLeaves) {
        const key = String(leaf[groupingField as keyof LeafVenue]);
        groups.set(key, [...(groups.get(key) ?? []), leaf]);
      }
    }

    const entities: Entity[] = [];
    const seriesByEntity: Record<string, Record<string, number[]>> = {};
    const aggregateSeries: Record<string, number[]> = {};

    for (const [entityName, groupLeaves] of groups.entries()) {
      entities.push({ id: entityName, name: entityName, unit: measurementUnit });
      seriesByEntity[entityName] = {};
      for (const metric of selectedMetrics) {
        seriesByEntity[entityName][metric.id] = visiblePeriods.map((_, periodIndex) => {
          const values = groupLeaves.map((leaf) => getMetricValue(metric, leaf, periodIndex));
          return metric.format === "percent"
            ? Number((values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1)).toFixed(3))
            : values.reduce((sum, value) => sum + value, 0);
        });
      }
    }

    for (const metric of selectedMetrics) {
      aggregateSeries[metric.id] = visiblePeriods.map((_, periodIndex) => {
        const values = scopedLeaves.map((leaf) => getMetricValue(metric, leaf, periodIndex));
        return metric.format === "percent"
          ? Number((values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1)).toFixed(3))
          : values.reduce((sum, value) => sum + value, 0);
      });
    }

    seriesByEntity[ALL_LABEL] = aggregateSeries;
    return { entities, seriesByEntity, aggregateSeries };
  }, [measurementUnit, scopedLeaves, selectedMetrics, visiblePeriods]);

  const entityFilterOptions = useMemo<FilterOption[]>(
    () => [{ label: ALL_LABEL, value: ALL_VALUE }, ...dataset.entities.map((entity) => ({ label: entity.name, value: entity.id }))],
    [dataset.entities]
  );
  const displayedEntities = useMemo(
    () => (entityFilterValue === ALL_VALUE ? dataset.entities : dataset.entities.filter((entity) => entity.id === entityFilterValue)),
    [dataset.entities, entityFilterValue]
  );
  const drilldownPathItems = useMemo(
    () =>
      drilldownHistory.map((item, index) => ({
        label: `${measurementUnitOptions.find((option) => option.value === item.measurementUnit)?.label ?? item.measurementUnit}(${item.parent?.value ?? ALL_LABEL})`,
        targetIndex: index,
        isCurrent: index === drilldownHistory.length - 1
      })),
    [drilldownHistory]
  );
  const displayedWeeks = visiblePeriods.map((entry) => formatPeriodLabel(entry.label, currentPeriodUnit));

  const applyDefault = () => {
    setActiveTemplateId(null);
    setPeriodUnit("month");
    setPeriodRangeValue("recent_6");
    setMeasurementUnit("area");
    setSelectedMetricIds(["total_match_cnt", "progress_match_rate", "match_open_rate"]);
    setFilterSelections({});
    setEntityFilterValue(ALL_VALUE);
    setDrilldownParent(null);
    setDrilldownHistory([{ measurementUnit: "area", filterValue: ALL_LABEL, parent: null }]);
    setPeriodDrilldownHistory([]);
  };

  const handlePeriodDrilldown = (periodLabel: string, targetUnit: PeriodUnit) => {
    const sourceEntry = visiblePeriods.find(
      (entry) => entry.label === periodLabel || formatPeriodLabel(entry.label, currentPeriodUnit) === periodLabel
    );
    if (!sourceEntry) return;
    setPeriodDrilldownHistory((current) => [
      ...current,
      {
        parentUnit: currentPeriodUnit,
        parentLabel: periodLabel,
        childUnit: targetUnit,
        startDate: sourceEntry.startDate,
        endDate: sourceEntry.endDate
      }
    ]);
  };

  return (
    <main className={styles.page}>
      <section className={`${styles.dashboardFrame} ${theme.wrapperClassName}`} style={theme.vars}>
        <div className="app-shell">
          <header className="app-header">
            <div className="brand">
              <a className="brand-link" href="/prototypes">
                <h1>KEVIN Prototype</h1>
              </a>
            </div>
            <div className={styles.themeSwitch}>
              {themes.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`${styles.themeSwitchButton} ${themeId === item.id ? styles.themeSwitchButtonActive : ""}`}
                  onClick={() => setThemeId(item.id)}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </header>

          <div className={styles.prototypeLayout}>
            <ControlBar
              periodUnit={periodUnit}
              periodUnitOptions={periodUnitOptions}
              periodRangeValue={periodRangeValue}
              periodRangeOptions={periodRangeOptionsByUnit[periodUnit]}
              onPeriodUnitChange={(value) => {
                setPeriodUnit(value);
                setPeriodRangeValue(defaultPeriodRangeValueByUnit[value]);
                setPeriodDrilldownHistory([]);
              }}
              onPeriodRangeChange={setPeriodRangeValue}
              periodFilterGroups={periodFilterGroups}
              measurementUnit={measurementUnit}
              measurementUnitOptions={measurementUnitOptions}
              onMeasurementUnitChange={(value) => {
                setMeasurementUnit(value);
                setEntityFilterValue(ALL_VALUE);
                setExpandedEntityName(null);
                setDrilldownParent(null);
                setDrilldownHistory([{ measurementUnit: value, filterValue: ALL_LABEL, parent: null }]);
              }}
              filterGroups={measurementFilterGroups}
              onFilterChange={(unit, values) => setFilterSelections((current) => ({ ...current, [unit]: values }))}
              selectedMetrics={selectedMetrics}
              onRemoveSelectedMetric={(metricId) => setSelectedMetricIds((current) => current.filter((item) => item !== metricId))}
              onClearSelectedMetrics={() => setSelectedMetricIds(["total_match_cnt"])}
              onOpenMetricPicker={() => setMetricPickerOpen(true)}
              onSearch={() => undefined}
              templates={templates}
              activeTemplateId={activeTemplateId}
              onApplyTemplate={(template) => {
                setActiveTemplateId(template.id);
                setPeriodUnit((template.config.periodUnit ?? "month") as PeriodUnit);
                setPeriodRangeValue(template.config.periodRangeValue);
                setMeasurementUnit(template.config.measurementUnit);
                setSelectedMetricIds(template.config.selectedMetricIds);
                setFilterSelections(template.config.filterSelections ?? {});
                setPeriodDrilldownHistory([]);
                setDrilldownParent(null);
                setDrilldownHistory([{ measurementUnit: template.config.measurementUnit, filterValue: ALL_LABEL, parent: null }]);
              }}
              onSaveTemplate={() => undefined}
              onCreateEmptyTab={(name) => setDefaultTabName(name)}
              onDuplicateTemplate={() => undefined}
              onOpenAiChat={() => undefined}
              onUpdateTemplateConfig={() => undefined}
              onDeleteTemplate={(id) => {
                if (activeTemplateId === id) setActiveTemplateId(null);
              }}
              onRenameTemplate={() => undefined}
              onSetDefaultTemplate={setActiveTemplateId}
              onSaveDefaultConfig={() => undefined}
              onResetFilters={applyDefault}
              onApplyDefault={applyDefault}
              defaultTabName={defaultTabName}
              onRenameDefaultTab={setDefaultTabName}
            />

            <div className={styles.resultWrap}>
              {periodDrilldownHistory.length > 0 && (
                <div className={styles.breadcrumbRow}>
                  {periodDrilldownHistory.map((item, index) => (
                    <button
                      key={`${item.parentLabel}-${index}`}
                      type="button"
                      className={styles.breadcrumb}
                      onClick={() => setPeriodDrilldownHistory(periodDrilldownHistory.slice(0, index))}
                    >
                      {`${periodFilterLabelMap[item.parentUnit]}(${item.parentLabel})`}
                    </button>
                  ))}
                  <button type="button" className={styles.breadcrumbReset} onClick={() => setPeriodDrilldownHistory([])}>
                    기간 드릴다운 해제
                  </button>
                </div>
              )}

              {measurementUnit === "all" ? (
                <MetricTable
                  weeks={displayedWeeks}
                  metrics={selectedMetrics}
                  series={dataset.aggregateSeries}
                  periodDrilldownOptions={periodDrilldownOptionsMap[currentPeriodUnit] ?? []}
                  onPeriodDrilldownSelect={handlePeriodDrilldown}
                />
              ) : (
                <EntityMetricTable
                  weeks={displayedWeeks}
                  entities={displayedEntities}
                  metrics={selectedMetrics}
                  seriesByEntity={dataset.seriesByEntity}
                  onEntitySelect={(entityName) => {
                    if ((drilldownTargetMap[measurementUnit] ?? []).length > 0) {
                      setExpandedEntityName((current) => (current === entityName ? null : entityName));
                    }
                  }}
                  entityFilterOptions={entityFilterOptions}
                  entityFilterValue={entityFilterValue}
                  onEntityFilterSelect={setEntityFilterValue}
                  drilldownPathItems={drilldownPathItems}
                  onDrilldownNavigate={(targetIndex) => {
                    const nextHistory = drilldownHistory.slice(0, targetIndex + 1);
                    const target = nextHistory[nextHistory.length - 1];
                    setDrilldownHistory(nextHistory);
                    setMeasurementUnit(target.measurementUnit);
                    setDrilldownParent(target.parent);
                    setExpandedEntityName(null);
                    setEntityFilterValue(ALL_VALUE);
                  }}
                  expandedEntityName={expandedEntityName}
                  drilldownUnitOptions={drilldownTargetMap[measurementUnit] ?? []}
                  onDrilldownSelect={(value) => {
                    if (!expandedEntityName) return;
                    const parent = measurementUnit === "all" ? null : { unit: measurementUnit, value: expandedEntityName };
                    setMeasurementUnit(value);
                    setDrilldownParent(parent);
                    setDrilldownHistory((current) => [...current, { measurementUnit: value, filterValue: expandedEntityName, parent }]);
                    setExpandedEntityName(null);
                    setEntityFilterValue(ALL_VALUE);
                  }}
                  onDrilldownClose={() => setExpandedEntityName(null)}
                  periodDrilldownOptions={periodDrilldownOptionsMap[currentPeriodUnit] ?? []}
                  onPeriodDrilldownSelect={handlePeriodDrilldown}
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {metricPickerOpen && (
        <div className={styles.modalOverlay} role="presentation" onClick={() => setMetricPickerOpen(false)}>
          <div className={styles.metricPanel} role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className={styles.metricPanelHeader}>
              <h2>지표 선택</h2>
              <button type="button" className={styles.modalClose} onClick={() => setMetricPickerOpen(false)}>
                닫기
              </button>
            </div>
            <div className={styles.metricPanelBody}>
              {metrics.map((metric) => (
                <label key={metric.id} className={styles.metricOption}>
                  <div>
                    <strong>{metric.name}</strong>
                    <p>{metric.description}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedMetricIds.includes(metric.id)}
                    onChange={() =>
                      setSelectedMetricIds((current) =>
                        current.includes(metric.id)
                          ? current.length === 1
                            ? current
                            : current.filter((item) => item !== metric.id)
                          : [...current, metric.id]
                      )
                    }
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
