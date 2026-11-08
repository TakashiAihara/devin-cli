import { formatTimestamp, metricsWindow } from "../dates.ts";
import {
  codeScanFindings,
  codeScanMetrics,
  codeScanProfile,
  codeScanProfiles,
  codeScanScans,
  collectPages,
  type CodeScanFindingPage,
  type CodeScanMetrics,
  type CodeScanPage,
  type CodeScanProfileDetail,
  type CodeScanProfilePage,
} from "../api/endpoints.ts";
import { resolveOrgId } from "../api/resolve-org.ts";
import { cell, cellText, guard, json, print } from "../lib.ts";

// generated の params 型を endpoints 経由で引く (commands から generated を直接触らない)
type FindingsParams = NonNullable<Parameters<typeof codeScanFindings>[1]>;
type ScansParams = NonNullable<Parameters<typeof codeScanScans>[1]>;

export type FindingsOptions = {
  limit?: number;
  org?: string;
  json: boolean;
  repo?: string;
  scan?: string;
  q?: string;
  severity: string[];
  status: string[];
  payoff: string[];
};
export type ScanMetricsOptions = { days: number; org?: string; json: boolean };
export type ScansOptions = {
  limit?: number;
  org?: string;
  json: boolean;
  repo?: string;
  type?: string;
  days?: number;
};
export type ProfilesOptions = { profileId?: string; limit?: number; org?: string; json: boolean };

// findings / scans / profiles の first 上限は 200 (OpenAPI の maximum)
const FIRST = 200;

const emitPage = (asJson: boolean, body: unknown, lines: string[]) => {
  if (asJson) {
    json(body);
    return 0;
  }
  for (const line of lines) print(line);
  return 0;
};

// cli.ts の argParser で値域は検査済み。ここでは generated の union 型に合わせるだけ
const typed = <T>(values: string[]) => (values.length > 0 ? (values as T[]) : null);

function findingLines(res: CodeScanFindingPage): string[] {
  const lines = [
    "finding_id\tscan_id\trepo_name\tseverity\tstatus\tpayoff\ttitle\tcategory\tcreated_at\tupdated_at\tpr_url",
  ];
  for (const f of res.items) {
    lines.push(
      [
        cellText(f.finding_id),
        cellText(f.scan_id),
        cellText(f.repo_name),
        cellText(f.severity),
        cellText(f.status),
        cell(f.payoff),
        cellText(f.title),
        cellText(f.category),
        formatTimestamp(f.created_at),
        formatTimestamp(f.updated_at),
        cellText(f.pr_url),
      ].join("\t"),
    );
  }
  return lines;
}

const METRICS_FIELDS = [
  "scans_count",
  "repos_scanned_count",
  "open_critical_findings_count",
  "open_high_findings_count",
  "open_medium_findings_count",
  "open_low_findings_count",
  "prs_created_count",
  "prs_open_count",
  "prs_merged_count",
  "prs_closed_count",
  "avg_pr_time_to_merge_seconds",
  "avg_pr_open_duration_seconds",
] as const;

function metricsLines(m: CodeScanMetrics): string[] {
  const rec = m as unknown as Record<string, unknown>;
  return [METRICS_FIELDS.join("\t"), METRICS_FIELDS.map((f) => cellText(rec[f])).join("\t")];
}

function scanLines(res: CodeScanPage): string[] {
  const lines = [
    "scan_id\trepo_name\trepo_full_name\tscan_type\tstatus\teffort\tcreated_at\tprofile\turl",
  ];
  for (const s of res.items) {
    lines.push(
      [
        cellText(s.scan_id),
        cellText(s.repo_name),
        cellText(s.repo_full_name),
        cellText(s.scan_type),
        cellText(s.status),
        cellText(s.effort),
        formatTimestamp(s.created_at),
        cellText(s.profile?.name),
        cellText(s.url),
      ].join("\t"),
    );
  }
  return lines;
}

function profileSummaryLines(res: CodeScanProfilePage): string[] {
  const lines = ["profile_id\tname\tscan_type\tmode\tvisibility\torg_id\tcreated_at\tdescription"];
  for (const p of res.items) {
    lines.push(
      [
        cellText(p.profile_id),
        cellText(p.name),
        cellText(p.scan_type),
        cellText(p.mode),
        cellText(p.visibility),
        cellText(p.org_id),
        formatTimestamp(p.created_at),
        cellText(p.description),
      ].join("\t"),
    );
  }
  return lines;
}

const joinList = (v: readonly string[] | null | undefined) =>
  v && v.length > 0 ? v.join(",") : null;

// profile 詳細は項目が多いので key/value のロング形式。配列はカンマ連結、オブジェクトは JSON
function profileDetailLines(p: CodeScanProfileDetail): string[] {
  const entries: [string, unknown][] = [
    ["profile_id", p.profile_id],
    ["name", p.name],
    ["scan_type", p.scan_type],
    ["mode", p.mode],
    ["visibility", p.visibility],
    ["org_id", p.org_id],
    ["created_at", formatTimestamp(p.created_at)],
    ["description", p.description],
    ["batch_size", p.batch_size],
    ["include_globs", joinList(p.include_globs)],
    ["exclude_globs", joinList(p.exclude_globs)],
    ["scan_paths", joinList(p.scan_paths)],
    ["validation_severities", joinList(p.validation_severities)],
    [
      "type_config",
      p.type_config === null || p.type_config === undefined ? null : JSON.stringify(p.type_config),
    ],
    ["threat_model_guidance", p.threat_model_guidance],
    ["investigation_guidance", p.investigation_guidance],
    ["triage_guidance", p.triage_guidance],
    ["validation_guidance", p.validation_guidance],
    ["remediation_guidance", p.remediation_guidance],
    ["report_guidance", p.report_guidance],
    ["communication_guidance", p.communication_guidance],
    ["post_ingestion_guidance", p.post_ingestion_guidance],
    ["ingestion_source_guidance", p.ingestion_source_guidance],
  ];
  const lines = ["key\tvalue"];
  for (const [k, v] of entries) lines.push([k, cellText(v)].join("\t"));
  return lines;
}

export const runCodeScanFindings = guard(async (o: FindingsOptions) => {
  const orgId = await resolveOrgId(o.org);
  const page = await collectPages(FIRST, o.limit, (after, first) =>
    codeScanFindings(orgId, {
      after,
      first,
      q: o.q ?? null,
      scan_id: o.scan ?? null,
      repo_name: o.repo ?? null,
      severity: typed<NonNullable<FindingsParams["severity"]>[number]>(o.severity),
      status: typed<NonNullable<FindingsParams["status"]>[number]>(o.status),
      payoff: typed<NonNullable<FindingsParams["payoff"]>[number]>(o.payoff),
    }),
  );
  return emitPage(o.json, page, findingLines(page));
});

export const runCodeScanMetrics = guard(async (o: ScanMetricsOptions) => {
  const orgId = await resolveOrgId(o.org);
  const win = metricsWindow(o.days, new Date());
  const res = await codeScanMetrics(orgId, {
    time_after: win.time_after,
    time_before: win.time_before,
  });
  if (o.json) {
    json(res);
    return 0;
  }
  for (const line of metricsLines(res)) print(line);
  return 0;
});

export const runCodeScanScans = guard(async (o: ScansOptions) => {
  const orgId = await resolveOrgId(o.org);
  // --days 指定時だけ作成日時の窓を付ける (metrics と同じ UTC 日境界)。未指定は全期間
  const win = o.days === undefined ? undefined : metricsWindow(o.days, new Date());
  const page = await collectPages(FIRST, o.limit, (after, first) => {
    const params: ScansParams = { after, first };
    if (o.repo) params.repo_name = o.repo;
    if (o.type) params.scan_type = o.type as NonNullable<ScansParams["scan_type"]>;
    if (win) {
      params.time_after = win.time_after;
      params.time_before = win.time_before;
    }
    return codeScanScans(orgId, params);
  });
  return emitPage(o.json, page, scanLines(page));
});

export const runCodeScanProfiles = guard(async (o: ProfilesOptions) => {
  const orgId = await resolveOrgId(o.org);
  if (o.profileId) {
    const res = await codeScanProfile(orgId, o.profileId);
    if (o.json) {
      json(res);
      return 0;
    }
    for (const line of profileDetailLines(res)) print(line);
    return 0;
  }
  const page = await collectPages(FIRST, o.limit, (after, first) =>
    codeScanProfiles(orgId, { after, first }),
  );
  return emitPage(o.json, page, profileSummaryLines(page));
});
