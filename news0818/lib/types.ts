export type SortOption = "date" | "sim";

export interface NewsItem {
  id: string;
  rank: number;
  titleHtml: string;
  descriptionHtml: string;
  titleText: string;
  press: string;
  link: string;
  originallink: string;
  publishedAt: string;
}

export interface NewsSuccessResponse {
  ok: true;
  items: NewsItem[];
  total: number;
  reachable: number;
  start: number;
  display: number;
  nextStart: number | null;
  sort: SortOption;
  query: string;
}

export type ErrorCode =
  | "NO_CREDENTIALS"
  | "BAD_CREDENTIALS"
  | "EMPTY_QUERY"
  | "QUERY_TOO_LONG"
  | "RANGE_EXCEEDED"
  | "QUOTA_EXCEEDED"
  | "UPSTREAM_ERROR"
  | "NETWORK_ERROR";

export interface NewsErrorResponse {
  ok: false;
  code: ErrorCode;
  message: string;
}

export type NewsResponse = NewsSuccessResponse | NewsErrorResponse;
