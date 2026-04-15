"use client";

import { useEffect, useRef, useState } from "react";
import {
  FilterOption,
  FilterTemplate,
  MeasurementUnit,
  MeasurementUnitOption,
  Metric,
  PeriodUnit
} from "../types";
import MultiSelectDropdown from "./MultiSelectDropdown";

type FilterGroup = {
  unit: MeasurementUnit;
  label: string;
  options: FilterOption[];
  selectedValues: string[];
};

type ControlBarProps = {
  periodUnit: PeriodUnit;
  periodUnitOptions: { label: string; value: PeriodUnit }[];
  periodRangeValue: string;
  periodRangeOptions: { label: string; value: string }[];
  onPeriodUnitChange: (value: PeriodUnit) => void;
  onPeriodRangeChange: (value: string) => void;
  periodFilterGroups: FilterGroup[];
  measurementUnit: MeasurementUnit;
  measurementUnitOptions: MeasurementUnitOption[];
  onMeasurementUnitChange: (value: MeasurementUnit) => void;
  filterGroups: FilterGroup[];
  onFilterChange: (unit: MeasurementUnit, values: string[]) => void;
  selectedMetrics: Metric[];
  onRemoveSelectedMetric: (metricId: string) => void;
  onClearSelectedMetrics: () => void;
  onOpenMetricPicker: () => void;
  onSearch: () => void;
  isSearchDisabled?: boolean;
  templates: FilterTemplate[];
  activeTemplateId: string | null;
  onApplyTemplate: (template: FilterTemplate) => void;
  onSaveTemplate: (name: string, isShared: boolean, isDefault: boolean) => void;
  onCreateEmptyTab: (name: string) => void;
  onUpdateTemplateConfig: (id: string) => void;
  onDeleteTemplate: (id: string) => void;
  onRenameTemplate: (id: string, name: string) => void;
  onSetDefaultTemplate: (id: string) => void;
  onSaveDefaultConfig: () => void;
  onResetFilters: () => void;
  onApplyDefault: () => void;
  onExport?: () => void;
  isExporting?: boolean;
};

const getFilterSummaryLabel = (group: FilterGroup) => {
  if (group.options.length === 0) return "없음";
  if (group.selectedValues.length === 0) return "선택";
  if (group.selectedValues.length === group.options.length) return "전체";

  const selectedLabels = group.options
    .filter((option) => group.selectedValues.includes(option.value))
    .map((option) => option.label);

  if (selectedLabels.length === 0) return "선택";
  if (selectedLabels.length === 1) return selectedLabels[0];
  return `${selectedLabels[0]} 외 ${selectedLabels.length - 1}`;
};

const getDisplayFilterSummaryLabel = (group: FilterGroup, groups: FilterGroup[]) => {
  const selectedLabels = group.options
    .filter((option) => group.selectedValues.includes(option.value))
    .map((option) => option.label);

  const hasOtherActiveFilter = groups.some((candidate) => {
    if (candidate.unit === group.unit) return false;
    if (candidate.options.length === 0) return false;
    return candidate.selectedValues.length !== candidate.options.length;
  });

  if (selectedLabels.length >= 3) {
    return `${selectedLabels[0]} 외 ${selectedLabels.length - 1} (${selectedLabels.length}/${group.options.length})`;
  }

  if (group.selectedValues.length === group.options.length && hasOtherActiveFilter) {
    if (selectedLabels.length <= 2) {
      return selectedLabels.join(", ");
    }
    return `${selectedLabels[0]} 외 ${selectedLabels.length - 1}`;
  }

  if (selectedLabels.length === 1 && group.selectedValues.length === group.options.length) {
    return selectedLabels[0];
  }

  return getFilterSummaryLabel(group);
};

export default function ControlBar({
  periodUnit,
  periodUnitOptions,
  periodRangeValue,
  periodRangeOptions,
  onPeriodUnitChange,
  onPeriodRangeChange,
  periodFilterGroups,
  measurementUnit,
  measurementUnitOptions,
  onMeasurementUnitChange,
  filterGroups,
  onFilterChange,
  selectedMetrics,
  onRemoveSelectedMetric,
  onClearSelectedMetrics,
  onOpenMetricPicker,
  onSearch,
  isSearchDisabled,
  templates,
  activeTemplateId,
  onApplyTemplate,
  onSaveTemplate,
  onCreateEmptyTab,
  onUpdateTemplateConfig,
  onDeleteTemplate,
  onRenameTemplate,
  onSetDefaultTemplate,
  onSaveDefaultConfig,
  onResetFilters,
  onApplyDefault,
  onExport,
  isExporting
}: ControlBarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingDefault, setEditingDefault] = useState(false);
  const [defaultTabName, setDefaultTabName] = useState("템플릿");
  const [contextMenuId, setContextMenuId] = useState<string | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const [saveToast, setSaveToast] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenuId(null);
      }
    };
    if (contextMenuId) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [contextMenuId]);

  const handleRename = (id: string) => {
    if (!editingName.trim()) return;
    onRenameTemplate(id, editingName.trim());
    setEditingId(null);
    setEditingName("");
  };

  const allFilterGroups = [...periodFilterGroups, ...filterGroups];

  return (
    <div className="control-bar-wrap">
      <div className="template-tabs">
        {editingDefault ? (
          <div className="template-tab-edit">
            <input
              type="text"
              className="template-tab-edit-input"
              value={defaultTabName}
              onChange={(event) => setDefaultTabName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === "Escape") setEditingDefault(false);
              }}
              onBlur={() => setEditingDefault(false)}
              autoFocus
            />
          </div>
        ) : (
          <button
            type="button"
            className={`template-tab template-tab-default ${activeTemplateId === null ? "is-active" : ""}`}
            onClick={onApplyDefault}
            onDoubleClick={() => setEditingDefault(true)}
            title="더블클릭: 이름 수정"
          >
            {defaultTabName}
          </button>
        )}

        {templates.map((template) => (
          <div key={template.id} className="template-tab-wrap" style={{ position: "relative" }}>
            {editingId === template.id ? (
              <div className="template-tab-edit">
                <input
                  type="text"
                  className="template-tab-edit-input"
                  value={editingName}
                  onChange={(event) => setEditingName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleRename(template.id);
                    if (event.key === "Escape") setEditingId(null);
                  }}
                  autoFocus
                />
                <button type="button" className="template-tab-edit-ok" onClick={() => handleRename(template.id)}>
                  OK
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={`template-tab ${template.id === activeTemplateId ? "is-active" : ""}`}
                onClick={() => onApplyTemplate(template)}
                onDoubleClick={() => {
                  setEditingId(template.id);
                  setEditingName(template.name);
                }}
                onContextMenu={(event) => {
                  event.preventDefault();
                  setContextMenuId(template.id);
                }}
                title={`${template.name}${template.is_default ? " (기본)" : ""}${template.is_shared ? " (공유)" : ""}`}
              >
                <span className="template-tab-name">{template.name}</span>
                {template.is_default && <span className="template-tab-badge">기본</span>}
                <span
                  className="template-tab-delete"
                  role="button"
                  tabIndex={0}
                  onClick={(event) => {
                    event.stopPropagation();
                    onDeleteTemplate(template.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.stopPropagation();
                      onDeleteTemplate(template.id);
                    }
                  }}
                  title="템플릿 삭제"
                >
                  ×
                </span>
              </button>
            )}

            {contextMenuId === template.id && (
              <div className="template-tab-context" ref={contextMenuRef}>
                {!template.is_default && (
                  <button
                    type="button"
                    onClick={() => {
                      onSetDefaultTemplate(template.id);
                      setContextMenuId(null);
                    }}
                  >
                    기본 설정
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(template.id);
                    setEditingName(template.name);
                    setContextMenuId(null);
                  }}
                >
                  이름 수정
                </button>
                <button
                  type="button"
                  className="template-tab-context-delete"
                  onClick={() => {
                    onDeleteTemplate(template.id);
                    setContextMenuId(null);
                  }}
                >
                  삭제
                </button>
              </div>
            )}
          </div>
        ))}

        <button
          type="button"
          className="template-tab template-tab-add"
          onClick={() => onCreateEmptyTab(`템플릿${templates.length + 2}`)}
          title="새 템플릿 추가"
        >
          +
        </button>
        <div className="template-tabs-spacer" />
      </div>

      <div className="search-panel card control-bar-body">
        <div className="search-row search-row-metrics">
          <button type="button" className="btn-secondary search-metric-picker-btn" onClick={onOpenMetricPicker}>
            지표 선택
          </button>
          <div className="selected-metric-chips">
            {selectedMetrics.map((metric) => (
              <button
                key={metric.id}
                type="button"
                className="selected-metric-chip is-active"
                title={`${metric.description || metric.name} (클릭 시 제거)`}
                onClick={() => onRemoveSelectedMetric(metric.id)}
                aria-pressed
              >
                {metric.name}
              </button>
            ))}
          </div>
        </div>

        <div className="search-row search-row-main">
          <div className="filter-group-period">
            <label className="field search-field search-field-period-unit">
              <span className="field-label">기간단위</span>
              <select value={periodUnit} onChange={(event) => onPeriodUnitChange(event.target.value as PeriodUnit)}>
                {periodUnitOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
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
          </div>

          {periodFilterGroups.map((group) => (
            <div key={group.unit} className="field search-field search-field-filter">
              <span className="field-label">{group.label}</span>
              <MultiSelectDropdown
                options={group.options}
                selectedValues={group.selectedValues}
                onChange={(values) => onFilterChange(group.unit, values)}
                label={getDisplayFilterSummaryLabel(group, allFilterGroups)}
                searchPlaceholder={`${group.label} 검색`}
              />
            </div>
          ))}
        </div>

        <div className="search-row search-row-main search-row-secondary">
          <label className="field search-field search-field-measurement-select">
            <span className="field-label">측정단위</span>
            <select value={measurementUnit} onChange={(event) => onMeasurementUnitChange(event.target.value)}>
              {measurementUnitOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {filterGroups.map((group) => (
            <div key={group.unit} className="field search-field search-field-filter">
              <span className="field-label">{group.label}</span>
              <MultiSelectDropdown
                options={group.options}
                selectedValues={group.selectedValues}
                onChange={(values) => onFilterChange(group.unit, values)}
                label={getDisplayFilterSummaryLabel(group, allFilterGroups)}
                searchPlaceholder={`${group.label} 검색`}
              />
            </div>
          ))}

          <div className="search-actions-stack">
              <button type="button" className="template-save-btn btn-icon" onClick={onResetFilters} title="필터 초기화">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              </button>
              <button
                type="button"
                className="template-save-btn btn-icon"
                onClick={() => {
                  if (activeTemplateId) {
                    onUpdateTemplateConfig(activeTemplateId);
                  } else {
                    onSaveDefaultConfig();
                  }
                  setSaveToast(true);
                  setTimeout(() => setSaveToast(false), 1500);
                }}
                title={activeTemplateId ? "현재 템플릿에 필터 상태 저장" : "기본 템플릿에 현재 상태 저장"}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              </button>
              {saveToast && <span className="save-toast">저장 완료</span>}
              {onExport && (
                <button type="button" className="template-save-btn btn-icon" onClick={onExport} disabled={isExporting} title="내보내기">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                </button>
              )}
              <button type="button" className="btn-primary search-submit-btn btn-icon" onClick={onSearch} disabled={isSearchDisabled}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </button>
          </div>
        </div>
      </div>
    </div>
  );
}
