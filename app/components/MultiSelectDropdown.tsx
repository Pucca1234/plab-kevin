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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const lower = search.toLowerCase();
    return options.filter((option) => option.label.toLowerCase().includes(lower));
  }, [options, search]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((option) => selectedValues.includes(option.value));

  const toggleFiltered = () => {
    if (allFilteredSelected) {
      const filteredSet = new Set(filtered.map((option) => option.value));
      onChange(selectedValues.filter((value) => !filteredSet.has(value)));
      return;
    }

    const next = new Set(selectedValues);
    filtered.forEach((option) => next.add(option.value));
    onChange(Array.from(next));
  };

  const toggleValue = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((candidate) => candidate !== value));
      return;
    }
    onChange([...selectedValues, value]);
  };

  return (
    <div className="ms-dropdown" ref={ref}>
      <button
        type="button"
        className="ms-trigger"
        onClick={() => {
          setIsOpen((open) => !open);
          setSearch("");
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
                <label key={option.value} className="ms-option">
                  <input
                    type="checkbox"
                    checked={selectedValues.includes(option.value)}
                    onChange={() => toggleValue(option.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
