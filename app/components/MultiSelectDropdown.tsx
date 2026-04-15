"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type Option = { label: string; value: string };

type MultiSelectDropdownProps = {
  options: Option[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  label: string;
  searchPlaceholder?: string;
  menuHeader?: ReactNode;
};

const arraysEqual = (left: string[], right: string[]) =>
  left.length === right.length && left.every((value, index) => value === right[index]);

export default function MultiSelectDropdown({
  options,
  selectedValues,
  onChange,
  label,
  searchPlaceholder = "검색...",
  menuHeader
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [draftSelectedValues, setDraftSelectedValues] = useState<string[]>(selectedValues);
  const ref = useRef<HTMLDivElement>(null);

  const optionValues = useMemo(() => options.map((option) => option.value), [options]);

  const normalizeValues = (values: string[]) => {
    const selectedSet = new Set(values);
    return optionValues.filter((value) => selectedSet.has(value));
  };

  const appliedValues = useMemo(() => normalizeValues(selectedValues), [optionValues, selectedValues]);

  useEffect(() => {
    if (!isOpen) {
      setDraftSelectedValues(appliedValues);
    }
  }, [appliedValues, isOpen]);

  const closeMenu = (applyDraft: boolean) => {
    setIsOpen(false);
    setSearch("");

    if (!applyDraft) {
      setDraftSelectedValues(appliedValues);
      return;
    }

    if (draftSelectedValues.length === 0) {
      setDraftSelectedValues(appliedValues);
      return;
    }

    const nextValues = normalizeValues(draftSelectedValues);
    if (!arraysEqual(nextValues, appliedValues)) {
      onChange(nextValues);
    }
  };

  useEffect(() => {
    const handle = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        closeMenu(true);
      }
    };

    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const lower = search.toLowerCase();
    return options.filter((option) => option.label.toLowerCase().includes(lower));
  }, [options, search]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((option) => draftSelectedValues.includes(option.value));

  const toggleFiltered = () => {
    if (allFilteredSelected) {
      const filteredSet = new Set(filtered.map((option) => option.value));
      setDraftSelectedValues(draftSelectedValues.filter((value) => !filteredSet.has(value)));
      return;
    }

    const next = new Set(draftSelectedValues);
    filtered.forEach((option) => next.add(option.value));
    setDraftSelectedValues(normalizeValues(Array.from(next)));
  };

  const toggleValue = (value: string) => {
    if (draftSelectedValues.includes(value)) {
      if (draftSelectedValues.length === 1) {
        setDraftSelectedValues(optionValues);
        return;
      }
      setDraftSelectedValues(draftSelectedValues.filter((candidate) => candidate !== value));
      return;
    }

    setDraftSelectedValues(normalizeValues([...draftSelectedValues, value]));
  };

  const applyOnlyValue = (value: string) => {
    setDraftSelectedValues([value]);
    setIsOpen(false);
    setSearch("");
    onChange([value]);
  };

  return (
    <div className="ms-dropdown" ref={ref}>
      <button
        type="button"
        className="ms-trigger"
        onClick={() => {
          if (isOpen) {
            closeMenu(true);
            return;
          }

          setDraftSelectedValues(appliedValues);
          setSearch("");
          setIsOpen(true);
        }}
      >
        <span className="ms-trigger-label">{label}</span>
        <svg
          className="ms-chevron"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          style={{ transform: isOpen ? "rotate(180deg)" : undefined }}
        >
          <path
            d="M6 9L12 15L18 9"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="ms-menu">
          {menuHeader}
          <div className="ms-search-wrap">
            <input
              type="text"
              className="ms-search"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              autoFocus
            />
          </div>
          <button type="button" className="ms-select-all" onClick={toggleFiltered}>
            {allFilteredSelected ? "전체 해제" : "전체 선택"}
          </button>
          <div className="ms-options">
            {filtered.length === 0 ? (
              <div className="ms-empty">검색 결과가 없습니다.</div>
            ) : (
              filtered.map((option) => (
                <div key={option.value} className="ms-option">
                  <label className="ms-option-main">
                    <input
                      type="checkbox"
                      checked={draftSelectedValues.includes(option.value)}
                      onChange={() => toggleValue(option.value)}
                    />
                    <span className="ms-option-label">{option.label}</span>
                  </label>
                  <button
                    type="button"
                    className="ms-option-only"
                    onClick={() => applyOnlyValue(option.value)}
                  >
                    지정된 값만 보기
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
