const KST = "Asia/Seoul";
const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];

function kstParts(iso: string): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
} {
  const d = new Date(iso);
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: KST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const parts = dtf.formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekdayShort = get("weekday");
  const weekdayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekdayShort);
  let hour = Number(get("hour"));
  if (hour === 24) hour = 0;
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour,
    minute: Number(get("minute")),
    weekday: weekdayIndex,
  };
}

export function toKstDateKey(iso: string): string {
  const { year, month, day } = kstParts(iso);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function formatTimeStamp(iso: string): string {
  const { hour, minute } = kstParts(iso);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function formatRankStamp(rank: number): string {
  return String(rank).padStart(3, "0");
}

export function formatFullKoreanDateTime(iso: string): string {
  const { year, month, day, hour, minute } = kstParts(iso);
  return `${year}년 ${month}월 ${day}일 ${hour}시 ${minute}분`;
}

export function formatDateDivider(iso: string, todayKey: string): string {
  const key = toKstDateKey(iso);
  const { month, day, weekday } = kstParts(iso);
  const label = `${String(month).padStart(2, "0")}.${String(day).padStart(2, "0")} ${WEEKDAY[weekday]}`;
  return key === todayKey ? `오늘 · ${label}` : label;
}

export function formatResultCount(n: number): string {
  return n.toLocaleString("ko-KR");
}

export function todayKstKey(): string {
  return toKstDateKey(new Date().toISOString());
}
