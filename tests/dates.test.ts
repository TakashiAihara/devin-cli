import { describe, expect, test } from "bun:test";
import { consumptionWindow, formatDateUtc8, utc8DayStart } from "../src/dates.ts";

const at = (iso: string) => Math.floor(Date.parse(iso) / 1000);

describe("utc8DayStart", () => {
  test("UTC-8 の 0 時 = 08:00 UTC に切り下げる", () => {
    // 2026-11-06T05:00:00Z は UTC-8 では 2026-11-05 21:00 → 当日開始は 2026-11-05T08:00:00Z
    expect(new Date(utc8DayStart(at("2026-11-06T05:00:00Z")) * 1000).toISOString()).toBe(
      "2026-11-05T08:00:00.000Z",
    );
  });

  test("境界ちょうど (08:00 UTC) はその日を開始とする", () => {
    expect(new Date(utc8DayStart(at("2026-11-05T08:00:00Z")) * 1000).toISOString()).toBe(
      "2026-11-05T08:00:00.000Z",
    );
    // 1 秒前は前日の開始
    expect(new Date(utc8DayStart(at("2026-11-05T07:59:59Z")) * 1000).toISOString()).toBe(
      "2026-11-04T08:00:00.000Z",
    );
  });

  test("夏時間中でも境界は 08:00 UTC のまま (PDT=UTC-7 に従わない)", () => {
    // 2026-07-15T12:00:00Z は UTC-8 では 2026-07-15 04:00 → 開始は 2026-07-15T08:00:00Z
    expect(new Date(utc8DayStart(at("2026-07-15T12:00:00Z")) * 1000).toISOString()).toBe(
      "2026-07-15T08:00:00.000Z",
    );
  });
});

describe("consumptionWindow", () => {
  const now = new Date("2026-11-06T05:00:00Z");
  const dayStart = at("2026-11-05T08:00:00Z");

  test("days=1 は今日 0 時 (UTC-8) 〜 現在", () => {
    const w = consumptionWindow(1, now);
    expect(w.time_after).toBe(dayStart);
    expect(w.time_before).toBe(at("2026-11-06T05:00:00Z"));
  });

  test("days=30 は今日を含む 30 暦日", () => {
    const w = consumptionWindow(30, now);
    expect(w.time_after).toBe(dayStart - 29 * 86400);
    expect(w.time_before).toBe(at("2026-11-06T05:00:00Z"));
  });
});

describe("formatDateUtc8", () => {
  test("Unix 秒を UTC-8 の YYYY-MM-DD にする", () => {
    // 2026-01-01T08:00:00Z = UTC-8 の 2026-01-01 0 時
    expect(formatDateUtc8(at("2026-01-01T08:00:00Z"))).toBe("2026-01-01");
    // 2026-01-01T07:59:59Z = UTC-8 の 2025-12-31 23:59:59
    expect(formatDateUtc8(at("2026-01-01T07:59:59Z"))).toBe("2025-12-31");
  });
});
