"use client";

import { useEffect, useRef } from "react";

const MAX_LENGTH = 80;

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

export default function SearchBar({ value, onChange, onSubmit, disabled }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const canSubmit = value.trim().length > 0 && !disabled;

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (e.key !== "/") return;
      const active = document.activeElement;
      const isFormField =
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        (active instanceof HTMLElement && active.isContentEditable);
      if (isFormField) return;
      e.preventDefault();
      inputRef.current?.focus();
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit();
  }

  return (
    <form className="searchBar" onSubmit={handleSubmit} role="search">
      <input
        ref={inputRef}
        type="text"
        className="searchInput"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={MAX_LENGTH}
        placeholder="키워드를 입력하세요"
        aria-label="검색어"
        disabled={disabled}
      />
      {value.length > 0 ? (
        <button
          type="button"
          className="searchClear"
          onClick={() => onChange("")}
          aria-label="검색어 지우기"
        >
          ×
        </button>
      ) : (
        <span className="searchKeycap" aria-hidden="true">
          /
        </span>
      )}
      <button type="submit" className="searchSubmit" disabled={!canSubmit}>
        검색
      </button>
    </form>
  );
}
