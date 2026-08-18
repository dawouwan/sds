import { NextRequest, NextResponse } from "next/server";
import { getPressName } from "@/lib/press";
import { makeStableId, sanitizeNaverHtml, stripTagsToText } from "@/lib/sanitize";
import type { ErrorCode, NewsItem, NewsResponse, SortOption } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NAVER_ENDPOINT = "https://openapi.naver.com/v1/search/news.json";
const CACHE_TTL_MS = 60_000;
const CACHE_MAX_ENTRIES = 150;
const FETCH_TIMEOUT_MS = 8_000;

interface NaverRawItem {
  title: string;
  originallink: string;
  link: string;
  description: string;
  pubDate: string;
}

interface NaverApiResponse {
  lastBuildDate: string;
  total: number;
  start: number;
  display: number;
  items: NaverRawItem[];
}

const cache = new Map<string, { expiresAt: number; body: NewsResponse }>();

function cacheKey(query: string, sort: SortOption, start: number, display: number): string {
  return `${sort}|${display}|${start}|${query}`;
}

function cacheTouch(key: string, entry: { expiresAt: number; body: NewsResponse }): void {
  cache.delete(key);
  cache.set(key, entry);
  if (cache.size > CACHE_MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }
}

function err(code: ErrorCode, status: number, message: string): NextResponse<NewsResponse> {
  const body: NewsResponse = { ok: false, code, message };
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function parseSort(value: string | null): SortOption {
  return value === "date" ? "date" : "sim";
}

function parseStart(value: string | null): number {
  const n = Number.parseInt(value ?? "1", 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return n;
}

function parseDisplay(value: string | null): number {
  const n = Number.parseInt(value ?? "20", 10);
  if (!Number.isFinite(n)) return 20;
  return Math.min(100, Math.max(1, n));
}

export async function GET(req: NextRequest): Promise<NextResponse<NewsResponse>> {
  const sp = req.nextUrl.searchParams;

  const rawQuery = (sp.get("query") ?? "").trim();
  if (rawQuery.length === 0) return err("EMPTY_QUERY", 400, "검색어를 입력하세요.");
  if (rawQuery.length > 80) return err("QUERY_TOO_LONG", 400, "검색어는 80자 이내여야 합니다.");

  const sort = parseSort(sp.get("sort"));

  const start = parseStart(sp.get("start"));
  if (start > 1000) return err("RANGE_EXCEEDED", 400, "start는 1000을 넘을 수 없습니다.");

  const display = parseDisplay(sp.get("display"));

  const key = cacheKey(rawQuery, sort, start, display);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    cacheTouch(key, cached);
    return NextResponse.json(cached.body, { headers: { "Cache-Control": "no-store" } });
  }

  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return err("NO_CREDENTIALS", 500, "서버에 네이버 API 키가 설정되지 않았습니다.");
  }

  const url = `${NAVER_ENDPOINT}?${new URLSearchParams({
    query: rawQuery,
    display: String(display),
    start: String(start),
    sort,
  })}`;

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      headers: {
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret,
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (e) {
    console.error("[api/news] fetch failed:", e);
    return err("NETWORK_ERROR", 504, "네이버 응답이 지연되고 있습니다. 잠시 후 다시 시도하세요.");
  }

  if (upstream.status === 401 || upstream.status === 403) {
    console.error("[api/news] upstream credential error:", upstream.status, await safeText(upstream));
    return err("BAD_CREDENTIALS", 502, "네이버 API 키가 유효하지 않습니다.");
  }
  if (upstream.status === 429) {
    console.error("[api/news] upstream quota exceeded:", await safeText(upstream));
    return err("QUOTA_EXCEEDED", 502, "오늘의 호출 한도를 초과했습니다.");
  }
  if (!upstream.ok) {
    console.error("[api/news] upstream error:", upstream.status, await safeText(upstream));
    return err("UPSTREAM_ERROR", 502, "네이버 뉴스 검색에 실패했습니다.");
  }

  let data: NaverApiResponse;
  try {
    data = (await upstream.json()) as NaverApiResponse;
  } catch (e) {
    console.error("[api/news] failed to parse upstream JSON:", e);
    return err("UPSTREAM_ERROR", 502, "네이버 뉴스 검색에 실패했습니다.");
  }

  const items: NewsItem[] = data.items.map((raw, i) => ({
    id: makeStableId(raw.link, raw.originallink),
    rank: start + i,
    titleHtml: sanitizeNaverHtml(raw.title),
    descriptionHtml: sanitizeNaverHtml(raw.description),
    titleText: stripTagsToText(raw.title),
    press: getPressName(raw.originallink || raw.link),
    link: raw.link,
    originallink: raw.originallink,
    publishedAt: new Date(raw.pubDate).toISOString(),
  }));

  const reachable = Math.min(data.total, 1000);
  const nextStart = start + display <= reachable ? start + display : null;

  const body: NewsResponse = {
    ok: true,
    items,
    total: data.total,
    reachable,
    start,
    display,
    nextStart,
    sort,
    query: rawQuery,
  };

  cacheTouch(key, { expiresAt: Date.now() + CACHE_TTL_MS, body });
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "<unreadable body>";
  }
}
