export const ALL_LABEL = "전체";
export const RETIRED_MEASUREMENT_UNITS = new Set(["yoil_and_hour", "yoil_group_and_hour"]);

export const MEASUREMENT_UNIT_LABEL_OVERRIDES: Record<string, string> = {
  all: ALL_LABEL,
  area_group: "지역그룹",
  area: "지역",
  stadium_group: "구장",
  stadium: "면",
  stadium_group_and_time: "구장 타임",
  stadium_and_time: "면 타임",
  time: "타임",
  hour: "시간",
  yoil: "요일",
  yoil_group: "요일그룹",
  match_grade: "등급",
  match_level: "레벨",
  match_player_cnt: "인원",
  match_sex: "성별",
  plab_stadium: "직영 여부",
  plaber_match: "플래버 매치",
  ai_report_match: "AI 리포트 매치"
};

export const MEASUREMENT_UNIT_SORT_ORDER = [
  "all",
  "area_group",
  "area",
  "area_group_and_time",
  "area_and_time",
  "stadium_group",
  "stadium",
  "stadium_group_and_time",
  "stadium_and_time",
  "match_grade",
  "match_level",
  "match_player_cnt",
  "match_sex",
  "plab_stadium",
  "plaber_match",
  "ai_report_match",
  "yoil_group",
  "yoil",
  "time",
  "hour",
  "yoil_and_hour",
  "yoil_group_and_hour"
];

export const UNIT_CONFIG_BY_UNIT: Record<string, { dimensionType: string; entityColumns: string[] }> = {
  area_group: { dimensionType: "area_group", entityColumns: ["area_group"] },
  area: { dimensionType: "area", entityColumns: ["area"] },
  area_group_and_time: { dimensionType: "area_group_and_time", entityColumns: ["area_group", "time"] },
  area_and_time: { dimensionType: "area_and_time", entityColumns: ["area", "time"] },
  stadium_group: { dimensionType: "stadium_group", entityColumns: ["stadium_group"] },
  stadium: { dimensionType: "stadium", entityColumns: ["stadium"] },
  stadium_group_and_time: { dimensionType: "stadium_group_and_time", entityColumns: ["stadium_group", "time"] },
  stadium_and_time: { dimensionType: "stadium_and_time", entityColumns: ["stadium", "time"] },
  match_grade: { dimensionType: "match_grade", entityColumns: ["match_grade"] },
  match_level: { dimensionType: "match_level", entityColumns: ["match_level"] },
  match_player_cnt: { dimensionType: "match_player_cnt", entityColumns: ["match_player_cnt"] },
  match_sex: { dimensionType: "match_sex", entityColumns: ["match_sex"] },
  plab_stadium: { dimensionType: "plab_stadium", entityColumns: ["plab_stadium"] },
  plaber_match: { dimensionType: "plaber_match", entityColumns: ["plaber_match"] },
  ai_report_match: { dimensionType: "ai_report_match", entityColumns: ["ai_report_match"] },
  yoil: { dimensionType: "yoil", entityColumns: ["yoil"] },
  yoil_group: { dimensionType: "yoil_group", entityColumns: ["yoil_group"] },
  time: { dimensionType: "time", entityColumns: ["time"] },
  hour: { dimensionType: "hour", entityColumns: ["hour"] },
  yoil_and_hour: { dimensionType: "yoil_and_hour", entityColumns: ["yoil", "hour"] },
  yoil_group_and_hour: { dimensionType: "yoil_group_and_hour", entityColumns: ["yoil_group", "hour"] }
};

export const LEGACY_MV_UNITS = new Set(["all", "area_group", "area", "stadium_group", "stadium"]);

export const TIME_JOINED_QUERY_UNIT_BY_TARGET: Record<string, string> = {
  area_group: "area_group_and_time",
  area: "area_and_time",
  stadium_group: "stadium_group_and_time",
  stadium: "stadium_and_time",
  area_group_and_time: "area_group_and_time",
  area_and_time: "area_and_time",
  stadium_group_and_time: "stadium_group_and_time",
  stadium_and_time: "stadium_and_time",
  time: "time"
};

export const COLUMN_BY_UNIT: Record<string, string> = {
  area_group: "area_group",
  area: "area",
  stadium_group: "stadium_group",
  stadium: "stadium",
  match_grade: "match_grade",
  match_level: "match_level",
  match_player_cnt: "match_player_cnt",
  match_sex: "match_sex",
  plab_stadium: "plab_stadium",
  plaber_match: "plaber_match",
  ai_report_match: "ai_report_match",
  yoil: "yoil",
  yoil_group: "yoil_group"
};

export const ENTITY_LABEL_SEPARATOR = " | ";

export const getUnitConfig = (unit: string) => {
  if (unit === "all") return null;
  return UNIT_CONFIG_BY_UNIT[unit] ?? null;
};

export const getEntityColumnsForUnit = (unit: string) => getUnitConfig(unit)?.entityColumns ?? [];

export const getSupportedFilterUnitIds = () =>
  Object.keys(UNIT_CONFIG_BY_UNIT).filter((unit) => !RETIRED_MEASUREMENT_UNITS.has(unit));

export const buildEntityLabel = (unit: string, row: Record<string, unknown>) => {
  if (unit === "all") return ALL_LABEL;
  const columns = getEntityColumnsForUnit(unit);
  if (columns.length === 0) return "";
  const parts = columns.map((column) => String(row[column] ?? "").trim());
  return parts.some((part) => part.length === 0) ? "" : parts.join(ENTITY_LABEL_SEPARATOR);
};

export const parseEntityLabel = (unit: string, entityLabel: string) => {
  const columns = getEntityColumnsForUnit(unit);
  if (columns.length === 0) return {} as Record<string, string>;
  const parts =
    columns.length === 1
      ? [entityLabel.trim()]
      : entityLabel.split(ENTITY_LABEL_SEPARATOR).map((part) => part.trim());
  if (parts.length !== columns.length || parts.some((part) => part.length === 0)) {
    return {} as Record<string, string>;
  }
  return Object.fromEntries(columns.map((column, index) => [column, parts[index]]));
};

export const resolveQueryUnitForDrilldownStrict = (
  measureUnit: string,
  parentUnit?: string | null
) => {
  if (!parentUnit) return measureUnit;

  const targetColumns = getEntityColumnsForUnit(measureUnit);
  const parentColumns = getEntityColumnsForUnit(parentUnit);
  if (targetColumns.length === 0 || parentColumns.length === 0) {
    return LEGACY_MV_UNITS.has(measureUnit) && LEGACY_MV_UNITS.has(parentUnit) ? measureUnit : null;
  }

  const requiredColumns = new Set([...targetColumns, ...parentColumns]);
  const candidates = Object.entries(UNIT_CONFIG_BY_UNIT)
    .filter(([, config]) => Array.from(requiredColumns).every((column) => config.entityColumns.includes(column)))
    .sort((a, b) => a[1].entityColumns.length - b[1].entityColumns.length);

  if (candidates[0]?.[0]) {
    return candidates[0][0];
  }

  if (parentColumns.includes("time")) {
    return TIME_JOINED_QUERY_UNIT_BY_TARGET[measureUnit] ?? null;
  }

  return LEGACY_MV_UNITS.has(measureUnit) && LEGACY_MV_UNITS.has(parentUnit) ? measureUnit : null;
};

export const sortMeasurementUnits = <T extends { value: string; label: string }>(units: T[]) =>
  units.slice().sort((a, b) => {
    const aIndex = MEASUREMENT_UNIT_SORT_ORDER.indexOf(a.value);
    const bIndex = MEASUREMENT_UNIT_SORT_ORDER.indexOf(b.value);
    if (aIndex !== -1 || bIndex !== -1) {
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    }
    return a.label.localeCompare(b.label, "ko");
  });
