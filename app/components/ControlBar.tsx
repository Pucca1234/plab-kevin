import { FilterOption, MeasurementUnit, Metric, PeriodUnit } from "../types";
import SegmentedButtonGroup from "./SegmentedButtonGroup";

type ControlBarProps = {
  periodUnit: PeriodUnit;
  periodRangeValue: string;
  periodRangeOptions: { label: string; value: string }[];
  onPeriodRangeChange: (value: string) => void;
  measurementUnit: MeasurementUnit;
  onMeasurementUnitChange: (value: MeasurementUnit) => void;
  filterOptions: FilterOption[];
  filterValue: string;
  onFilterChange: (value: string) => void;
  selectedMetrics: Metric[];
  onRemoveSelectedMetric: (metricId: string) => void;
  onClearSelectedMetrics: () => void;
  onOpenMetricPicker: () => void;
  onSearch: () => void;
  isSearchDisabled?: boolean;
};

export default function ControlBar({
  periodUnit,
  periodRangeValue,
  periodRangeOptions,
  onPeriodRangeChange,
  measurementUnit,
  onMeasurementUnitChange,
  filterOptions,
  filterValue,
  onFilterChange,
  selectedMetrics,
  onRemoveSelectedMetric,
  onClearSelectedMetrics,
  onOpenMetricPicker,
  onSearch,
  isSearchDisabled
}: ControlBarProps) {
  return (
    <div className="search-panel card">
      <div className="search-row search-row-main">
        <label className="field search-field search-field-period-unit">
          <span className="field-label">기간단위</span>
          <select value={periodUnit} disabled>
            <option value="week">주</option>
          </select>
        </label>
        <label className="field search-field search-field-period-range">
          <span className="field-label">기간범위</span>
          <select value={periodRangeValue} onChange={(event) => onPeriodRangeChange(event.target.value)}>
            {periodRangeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <SegmentedButtonGroup
          className="measurement search-field-measurement"
          label="측정단위"
          value={measurementUnit}
          onChange={onMeasurementUnitChange}
          options={[
            { value: "all", label: "전체" },
            { value: "area_group", label: "지역 그룹" },
            { value: "area", label: "지역" },
            { value: "stadium_group", label: "구장 그룹" },
            { value: "stadium", label: "구장" }
          ]}
        />
        <label className="field search-field search-field-filter">
          <span className="field-label">필터</span>
          <select value={filterValue} onChange={(event) => onFilterChange(event.target.value)}>
            {filterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div className="search-action-group">
          <button type="button" className="btn-primary search-submit-btn" onClick={onSearch} disabled={isSearchDisabled}>
            조회 및 AI 자동 분석
          </button>
        </div>
      </div>

      <div className="search-row search-row-metrics">
        <button type="button" className="btn-secondary search-metric-picker-btn" onClick={onOpenMetricPicker}>
          지표 선택
        </button>
        <span className="field-label">활성 지표:</span>
        <div className="selected-metric-chips">
          {selectedMetrics.map((metric) => (
            <button
              key={metric.id}
              type="button"
              className="selected-metric-chip is-active"
              title={`${metric.description || metric.name} (클릭 시 비활성)`}
              onClick={() => onRemoveSelectedMetric(metric.id)}
              aria-pressed
            >
              {metric.name}
            </button>
          ))}
        </div>
        <button type="button" className="clear-metrics-btn" onClick={onClearSelectedMetrics}>
          전체 해제
        </button>
      </div>
    </div>
  );
}

