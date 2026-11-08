// Devin API の消費日は UTC-8 (docs の "midnight PST" = 08:00 UTC) の 0 時で区切られる。
// America/Los_Angeles の夏時間 (PDT=UTC-7) には従わず、UTC-8 固定で計算する
const UTC8_OFFSET_SEC = 8 * 3600;
const DAY_SEC = 86400;

export function utc8DayStart(nowSec: number): number {
  return Math.floor((nowSec - UTC8_OFFSET_SEC) / DAY_SEC) * DAY_SEC + UTC8_OFFSET_SEC;
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

// Unix 秒を UTC-8 の YYYY-MM-DD にする
export function formatDateUtc8(unixSec: number): string {
  return new Date((unixSec - UTC8_OFFSET_SEC) * 1000).toISOString().slice(0, 10);
}
