"use client";

import { useEffect, useRef, useState } from "react";
import Dispatch from "@/components/Dispatch";
import KeywordChips from "@/components/KeywordChips";
import SearchBar from "@/components/SearchBar";
import SortTabs from "@/components/SortTabs";
import { EmptyState, ErrorState, LoadingSkeleton, MoreErrorPanel } from "@/components/States";
import {
  formatDateDivider,
  formatResultCount,
  toKstDateKey,
  todayKstKey,
} from "@/lib/format";
import type { ErrorCode, NewsItem, NewsResponse, SortOption } from "@/lib/types";

type Status = "idle" | "loading" | "ready" | "empty" | "error";

interface Meta {
  total: number;
  reachable: number;
  nextStart: number | null;
  appliedSort: SortOption;
  query: string;
}

const DISPLAY = 20;

export default function Home() {
  const [status, setStatus] = useState<Status>("idle");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOption>("date");
  const [items, setItems] = useState<NewsItem[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [errorInfo, setErrorInfo] = useState<{ code: ErrorCode; message: string } | null>(null);
  const [moreError, setMoreError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const ticketRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const metaRef = useRef<Meta | null>(null);
  metaRef.current = meta;

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const q = sp.get("q")?.trim();
    const s: SortOption = sp.get("sort") === "sim" ? "sim" : "date";
    if (q) {
      runSearch(q, s, { syncInputs: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function syncUrl(q: string, s: SortOption) {
    const params = new URLSearchParams({ q, sort: s });
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }

  async function runSearch(
    rawQuery: string,
    s: SortOption,
    opts: { append?: boolean; syncInputs?: boolean } = {},
  ) {
    const trimmed = rawQuery.trim();
    if (!trimmed) return;

    if (opts.syncInputs) {
      setQuery(trimmed);
      setSort(s);
    }

    const startParam = opts.append && metaRef.current?.nextStart ? metaRef.current.nextStart : 1;

    const myTicket = ++ticketRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (opts.append) {
      setLoadingMore(true);
      setMoreError(null);
    } else {
      setStatus("loading");
      setErrorInfo(null);
    }

    try {
      const url = `/api/news?query=${encodeURIComponent(trimmed)}&sort=${s}&start=${startParam}&display=${DISPLAY}`;
      const res = await fetch(url, { signal: controller.signal });
      const data: NewsResponse = await res.json();

      if (myTicket !== ticketRef.current) return;

      if (!data.ok) {
        if (opts.append) {
          setMoreError(data.message);
          setLoadingMore(false);
        } else {
          setErrorInfo({ code: data.code, message: data.message });
          setStatus("error");
        }
        return;
      }

      const nextMeta: Meta = {
        total: data.total,
        reachable: data.reachable,
        nextStart: data.nextStart,
        appliedSort: data.sort,
        query: data.query,
      };
      setMeta(nextMeta);

      setItems((prev) => {
        if (!opts.append) return data.items;
        const seen = new Set(prev.map((i) => i.id));
        return [...prev, ...data.items.filter((i) => !seen.has(i.id))];
      });

      if (opts.append) {
        setLoadingMore(false);
      } else {
        setStatus(data.items.length === 0 ? "empty" : "ready");
        syncUrl(trimmed, s);
      }
    } catch (e) {
      if (myTicket !== ticketRef.current) return;
      if (e instanceof Error && e.name === "AbortError") return;
      if (opts.append) {
        setMoreError("네트워크 오류가 발생했습니다.");
        setLoadingMore(false);
      } else {
        setErrorInfo({ code: "NETWORK_ERROR", message: "네트워크 오류가 발생했습니다." });
        setStatus("error");
      }
    }
  }

  function handleSubmit() {
    runSearch(query, sort);
  }

  function handleSortChange(next: SortOption) {
    setSort(next);
    runSearch(query, next);
  }

  function handleKeywordSelect(keyword: string) {
    setQuery(keyword);
    runSearch(keyword, sort);
  }

  function handleMore() {
    runSearch(query, sort, { append: true });
  }

  function handleRetry() {
    runSearch(query, sort);
  }

  function handleMoreRetry() {
    runSearch(query, sort, { append: true });
  }

  const isLoading = status === "loading";
  const hasMore = meta ? meta.nextStart !== null : false;
  const hitThousandCap = meta ? !hasMore && meta.total > 1000 : false;

  const todayKey = todayKstKey();
  let dividerCursor = "";

  return (
    <div className="page">
      <header className="topBar">
        <h1 className="brand">WIRE</h1>
        <SearchBar value={query} onChange={setQuery} onSubmit={handleSubmit} disabled={isLoading} />
      </header>

      {status === "idle" ? (
        <section className="idleSection">
          <h2 className="headline">키워드를 넣으면 네이버 뉴스 색인을 훑어봅니다.</h2>
          <KeywordChips onSelect={handleKeywordSelect} />
        </section>
      ) : (
        <>
          <div className="sortBar">
            <SortTabs sort={sort} onChange={handleSortChange} disabled={isLoading || !query.trim()} />
            {meta ? (
              <p className="resultCount" aria-live="polite">
                &quot;{meta.query}&quot; 전체 {formatResultCount(meta.total)}건 중{" "}
                {formatResultCount(meta.reachable)}건 열람 가능
              </p>
            ) : null}
            <p className="railLabel">{sort === "date" ? "레일 = 송고 시각" : "레일 = 검색 순위"}</p>
          </div>

          {status === "loading" ? <LoadingSkeleton /> : null}

          {status === "error" && errorInfo ? (
            <ErrorState code={errorInfo.code} message={errorInfo.message} onRetry={handleRetry} />
          ) : null}

          {status === "empty" ? (
            <EmptyState query={meta?.query ?? query} onSelectKeyword={handleKeywordSelect} />
          ) : null}

          {status === "ready" && meta ? (
            <>
              <div className="dispatchList" data-sort={meta.appliedSort}>
                {items.map((item, index) => {
                  let dividerLabel: string | undefined;
                  if (meta.appliedSort === "date") {
                    const key = toKstDateKey(item.publishedAt);
                    if (key !== dividerCursor) {
                      dividerCursor = key;
                      dividerLabel = formatDateDivider(item.publishedAt, todayKey);
                    }
                  }
                  return (
                    <Dispatch
                      key={item.id}
                      item={item}
                      appliedSort={meta.appliedSort}
                      index={index}
                      dividerLabel={dividerLabel}
                    />
                  );
                })}
              </div>

              <div className="moreSection">
                {hasMore ? (
                  <button type="button" className="moreButton" onClick={handleMore} disabled={loadingMore}>
                    {loadingMore ? "불러오는 중…" : "더 보기"}
                  </button>
                ) : hitThousandCap ? (
                  <p className="moreEndMessage">
                    여기까지입니다. 네이버는 검색어당 1,000건까지만 열어 줍니다.
                  </p>
                ) : (
                  <p className="moreEndMessage">마지막 기사입니다.</p>
                )}
                {moreError ? <MoreErrorPanel message={moreError} onRetry={handleMoreRetry} /> : null}
              </div>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
