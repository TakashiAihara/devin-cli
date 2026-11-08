import { consumptionWindow, formatDateUtc8 } from "../dates.ts";
import {
  consumptionDaily,
  consumptionDailyServiceUser,
  consumptionDailySession,
  consumptionDailyUser,
  type ConsumptionResponse,
} from "../api/endpoints.ts";
import { resolveOrgId, selfInfo, userIdFromSelf } from "../api/resolve-org.ts";
import { cellText, die, guard, json, print } from "../lib.ts";

export type ConsumptionOptions = { days: number; org?: string; json: boolean };

// 日別 TSV。billing の日別セクションとも共用する
export function dailyLines(res: ConsumptionResponse): string[] {
  const lines = ["date\tacus\tdevin\tcascade\tterminal\tautomation\treview"];
  const rows = res.consumption_by_date.toSorted((a, b) => a.date - b.date);
  for (const d of rows) {
    const p = d.acus_by_product;
    lines.push(
      [
        formatDateUtc8(d.date),
        d.acus,
        p.devin,
        p.cascade,
        p.terminal,
        cellText(p.automation),
        cellText(p.review),
      ].join("\t"),
    );
  }
  return lines;
}

function emit(res: ConsumptionResponse, asJson: boolean): number {
  if (asJson) {
    json(res);
    return 0;
  }
  for (const line of dailyLines(res)) print(line);
  return 0;
}

export const runConsumptionDaily = guard(async (o: ConsumptionOptions) => {
  const orgId = await resolveOrgId(o.org);
  const res = await consumptionDaily(orgId, consumptionWindow(o.days, new Date()));
  return emit(res, o.json);
});

export const runConsumptionUser = guard(async (o: ConsumptionOptions & { userId?: string }) => {
  const orgId = await resolveOrgId(o.org);
  const userId =
    o.userId ??
    userIdFromSelf(await selfInfo()) ??
    die("user_id を引数で指定する (self の応答に user_id が無い)", 2);
  const res = await consumptionDailyUser(orgId, userId, consumptionWindow(o.days, new Date()));
  return emit(res, o.json);
});

export const runConsumptionServiceUser = guard(
  async (o: ConsumptionOptions & { serviceUserId: string }) => {
    const orgId = await resolveOrgId(o.org);
    const res = await consumptionDailyServiceUser(
      orgId,
      o.serviceUserId,
      consumptionWindow(o.days, new Date()),
    );
    return emit(res, o.json);
  },
);

export const runConsumptionSession = guard(
  async (o: ConsumptionOptions & { sessionId: string }) => {
    const orgId = await resolveOrgId(o.org);
    const res = await consumptionDailySession(
      orgId,
      o.sessionId,
      consumptionWindow(o.days, new Date()),
    );
    return emit(res, o.json);
  },
);
