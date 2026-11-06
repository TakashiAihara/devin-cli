import { consumptionWindow, formatDateUtc8 } from "../dates.ts";
import {
  metricsActiveUsers,
  metricsDau,
  metricsMau,
  metricsPrs,
  metricsSearches,
  metricsSessions,
  metricsUsage,
  metricsWau,
  type ActiveUserMetrics,
  type PrMetricsResponse,
  type SearchMetricsResponse,
  type SessionMetricsResponse,
  type UsageMetrics,
} from "../api/endpoints.ts";
import { resolveOrgId } from "../api/resolve-org.ts";
import { cellText, guard, json, print } from "../lib.ts";

export const METRICS = [
  "usage",
  "sessions",
  "prs",
  "searches",
  "dau",
  "wau",
  "mau",
  "active-users",
] as const;
export type MetricsName = (typeof METRICS)[number];

export type MetricsOptions = { name: MetricsName; days: number; org?: string; json: boolean };

const emit = (lines: string[], asJson: boolean, body: unknown): number => {
  if (asJson) {
    json(body);
    return 0;
  }
  for (const line of lines) print(line);
  return 0;
};

const usageLines = (u: UsageMetrics): string[] => [
  "sessions_count\tsearches_count\tprs_created_count\tprs_merged_count",
  [u.sessions_count, u.searches_count, u.prs_created_count, u.prs_merged_count].join("\t"),
];

const searchesLines = (s: SearchMetricsResponse): string[] => [
  "searches_created_count",
  String(s.searches_created_count),
];

const PRS_FIELDS = [
  "prs_created_count",
  "prs_opened_count",
  "prs_merged_count",
  "prs_closed_count",
  "prs_taken_over_count",
  "prs_taken_over_opened_count",
  "prs_taken_over_merged_count",
  "prs_taken_over_closed_count",
] as const;

const prsLines = (p: PrMetricsResponse): string[] => {
  const rec = p as unknown as Record<string, unknown>;
  return [PRS_FIELDS.join("\t"), PRS_FIELDS.map((f) => cellText(rec[f])).join("\t")];
};

// sessions はネストした応答なので section/key/value のロング形式で平坦化する
const sessionsLines = (s: SessionMetricsResponse): string[] => {
  const lines = ["section\tkey\tvalue"];
  const rec = s as unknown as Record<string, unknown>;
  const scalars = [
    "sessions_created_count",
    "sessions_created_with_playbook_count",
    "sessions_created_with_search_count",
    "sessions_with_merged_prs_count",
    "avg_acus_per_session",
  ];
  for (const k of scalars) lines.push(["scalar", k, cellText(rec[k])].join("\t"));
  const groups: [string, string][] = [
    ["by_origin", "sessions_created_by_origin"],
    ["by_size_created", "sessions_created_by_size"],
    ["by_size_merged_prs", "sessions_with_merged_prs_by_size"],
  ];
  for (const [section, field] of groups) {
    const obj = rec[field];
    if (obj && typeof obj === "object") {
      for (const [k, v] of Object.entries(obj as Record<string, unknown>))
        lines.push([section, k, cellText(v)].join("\t"));
    }
  }
  return lines;
};

const activeUserLines = (rows: ActiveUserMetrics[]): string[] => {
  const lines = ["start_time\tend_time\tactive_users"];
  for (const r of rows)
    lines.push(
      [formatDateUtc8(r.start_time), formatDateUtc8(r.end_time), r.active_users].join("\t"),
    );
  return lines;
};

export const runMetrics = guard(async (o: MetricsOptions) => {
  const orgId = await resolveOrgId(o.org);
  const win = consumptionWindow(o.days, new Date());
  switch (o.name) {
    case "usage": {
      const res = await metricsUsage(orgId, win);
      return emit(usageLines(res), o.json, res);
    }
    case "searches": {
      const res = await metricsSearches(orgId, win);
      return emit(searchesLines(res), o.json, res);
    }
    case "prs": {
      const res = await metricsPrs(orgId, win);
      return emit(prsLines(res), o.json, res);
    }
    case "sessions": {
      const res = await metricsSessions(orgId, win);
      return emit(sessionsLines(res), o.json, res);
    }
    case "dau":
    case "wau":
    case "mau": {
      const res =
        o.name === "dau"
          ? await metricsDau(orgId, win)
          : o.name === "wau"
            ? await metricsWau(orgId, win)
            : await metricsMau(orgId, win);
      return emit(activeUserLines(res), o.json, res);
    }
    case "active-users": {
      const res = await metricsActiveUsers(orgId, win);
      return emit(activeUserLines([res]), o.json, res);
    }
  }
});
