"use client";

import KeywordChips from "@/components/KeywordChips";
import type { ErrorCode } from "@/lib/types";

const NO_RETRY_CODES: ErrorCode[] = ["NO_CREDENTIALS", "BAD_CREDENTIALS"];

export function LoadingSkeleton() {
  return (
    <div className="skeletonList" role="status" aria-busy="true">
      <span className="srOnly">불러오는 중…</span>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="skeletonRow">
          <div className="skeletonBar" style={{ width: "70%", height: "17px" }} />
          <div className="skeletonBar" style={{ width: "95%", height: "14px", marginTop: "8px" }} />
          <div className="skeletonBar" style={{ width: "40%", height: "12px", marginTop: "8px" }} />
        </div>
      ))}
    </div>
  );
}

interface EmptyStateProps {
  query: string;
  onSelectKeyword: (keyword: string) => void;
}

export function EmptyState({ query, onSelectKeyword }: EmptyStateProps) {
  return (
    <div className="statePanel emptyPanel">
      <p className="statePanelTitle">
        &quot;{query}&quot; 수신 0건입니다.
      </p>
      <p className="statePanelBody">다른 키워드를 시도해 보세요.</p>
      <KeywordChips onSelect={onSelectKeyword} activeKeyword={query} />
    </div>
  );
}

interface ErrorStateProps {
  code: ErrorCode;
  message: string;
  onRetry: () => void;
}

export function ErrorState({ code, message, onRetry }: ErrorStateProps) {
  const showRetry = !NO_RETRY_CODES.includes(code);
  return (
    <div className="statePanel errorPanel" role="alert">
      <span className="errorCode">{code}</span>
      <p className="statePanelBody">{message}</p>
      {showRetry ? (
        <button type="button" className="retryButton" onClick={onRetry}>
          다시 시도
        </button>
      ) : null}
    </div>
  );
}

export function MoreErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="statePanel moreErrorPanel" role="alert">
      <p className="statePanelBody">{message}</p>
      <button type="button" className="retryButton" onClick={onRetry}>
        다시 시도
      </button>
    </div>
  );
}
