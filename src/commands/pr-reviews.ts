import { createPrReview, prReview, type PrReview } from "../api/endpoints.ts";
import { resolveOrgId } from "../api/resolve-org.ts";
import { cellText, guard, json, print } from "../lib.ts";

export type PrReviewGetOptions = {
  prUrl: string;
  commitSha?: string;
  org?: string;
  json: boolean;
};
export type PrReviewCreateOptions = { prUrl: string; org?: string; json: boolean };

// GET は一覧ではなく PR 単位の最新 review 参照 (pr_url 必須、未指定は API が 422)
const PR_REVIEW_HEADER = "commit_sha\tcreated_at\tpr_number\trepo_path\tstatus";

const prReviewLine = (r: PrReview): string =>
  [
    cellText(r.commit_sha),
    cellText(r.created_at),
    cellText(r.pr_number),
    cellText(r.repo_path),
    cellText(r.status),
  ].join("\t");

const emit = (r: PrReview, asJson: boolean): number => {
  if (asJson) {
    json(r);
    return 0;
  }
  print(PR_REVIEW_HEADER);
  print(prReviewLine(r));
  return 0;
};

export const runPrReviewGet = guard(async (o: PrReviewGetOptions) => {
  const orgId = await resolveOrgId(o.org);
  const r = await prReview(orgId, o.prUrl, o.commitSha);
  return emit(r, o.json);
});

export const runPrReviewCreate = guard(async (o: PrReviewCreateOptions) => {
  const orgId = await resolveOrgId(o.org);
  const r = await createPrReview(orgId, { pr_url: o.prUrl });
  return emit(r, o.json);
});
