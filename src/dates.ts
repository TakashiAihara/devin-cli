// consumption API の日境界 (docs の "midnight PST") は UTC-8 固定。
// metrics API のバケットは実測で UTC 日 (00:00:00Z〜23:59:59Z) と確認したので別系統で扱う
const UTC8_OFFSET_SEC = 8 * 3600;
const DAY_SEC = 86400;

export function utc8DayStart(nowSec: number): number {
  return Math.floor((nowSec - UTC8_OFFSET_SEC) / DAY_SEC) * DAY_SEC + UTC8_OFFSET_SEC;
}

export function utcDayStart(nowSec: number): number {
  return Math.floor(nowSec / DAY_SEC) * DAY_SEC;
}

export type Window = { time_after: number; time_before: number };

// 今日を含む days 暦日分。time_after は今日(UTC-8)0時の (days-1) 日前、time_before は現在時刻
export function consumptionWindow(days: number, now: Date): Window {
  const nowSec = Math.floor(now.getTime() / 1000);
  return {
    time_after: utc8DayStart(nowSec) - (days - 1) * DAY_SEC,
    time_before: nowSec,
  };
}

// metrics 用。バケットが UTC 日なので窓も UTC 0 時に揃え、--days N でちょうど N バケット返るようにする
export function metricsWindow(days: number, now: Date): Window {
  const nowSec = Math.floor(now.getTime() / 1000);
  return {
    time_after: utcDayStart(nowSec) - (days - 1) * DAY_SEC,
    time_before: nowSec,
  };
}

// Unix 秒を UTC-8 の YYYY-MM-DD にする
export function formatDateUtc8(unixSec: number): string {
  return new Date((unixSec - UTC8_OFFSET_SEC) * 1000).toISOString().slice(0, 10);
}

// Unix 秒を UTC の YYYY-MM-DD にする (metrics のバケット日付用)
export function formatDateUtc(unixSec: number): string {
  return new Date(unixSec * 1000).toISOString().slice(0, 10);
}

// Unix 秒を UTC の ISO 8601 にする (repositories / snapshot 等の時刻フィールド用)
export function formatTimestamp(unixSec: number): string {
  return new Date(unixSec * 1000).toISOString();
}
