"use client";

import type { SortOption } from "@/lib/types";

interface SortTabsProps {
  sort: SortOption;
  onChange: (sort: SortOption) => void;
  disabled?: boolean;
}

const TABS: { value: SortOption; label: string }[] = [
  { value: "date", label: "최신순" },
  { value: "sim", label: "정확도순" },
];

export default function SortTabs({ sort, onChange, disabled }: SortTabsProps) {
  return (
    <div className="sortTabs" role="group" aria-label="정렬">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          type="button"
          className="sortTab"
          aria-pressed={sort === tab.value}
          disabled={disabled}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
