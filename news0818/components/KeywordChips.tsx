"use client";

import { KEYWORD_GROUPS } from "@/lib/keywords";

interface KeywordChipsProps {
  onSelect: (keyword: string) => void;
  activeKeyword?: string;
}

export default function KeywordChips({ onSelect, activeKeyword }: KeywordChipsProps) {
  return (
    <div className="keywordChips">
      {KEYWORD_GROUPS.map((group) => (
        <div key={group.label} className="chipGroup">
          <span className="chipGroupLabel">{group.label}</span>
          <div className="chipRow">
            {group.keywords.map((keyword) => (
              <button
                key={keyword}
                type="button"
                className="chip"
                aria-pressed={keyword === activeKeyword}
                onClick={() => onSelect(keyword)}
              >
                {keyword}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
