import { consumptionWindow } from "../dates.ts";
import { consumptionDaily } from "../api/endpoints.ts";
import { resolveOrgId } from "../api/resolve-org.ts";
import { guard, json, print } from "../lib.ts";
import { dailyLines } from "./consumption.ts";

export type BillingOptions = { days: number; org?: string; json: boolean };

export const runBilling = guard(async (o: BillingOptions) => {
  const orgId = await resolveOrgId(o.org);
  const win = consumptionWindow(o.days, new Date());
  const res = await consumptionDaily(orgId, win);
  if (o.json) {
    json({ days: o.days, window: win, ...res });
    return 0;
  }
  const sums = { devin: 0, cascade: 0, terminal: 0, automation: 0, review: 0 };
  const seen = { automation: false, review: false };
  for (const d of res.consumption_by_date) {
    const p = d.acus_by_product;
    sums.devin += p.devin;
    sums.cascade += p.cascade;
    sums.terminal += p.terminal;
    if (p.automation !== null && p.automation !== undefined) {
      sums.automation += p.automation;
      seen.automation = true;
    }
    if (p.review !== null && p.review !== undefined) {
      sums.review += p.review;
      seen.review = true;
    }
  }
  print("metric\tvalue");
  print(`days\t${o.days}`);
  print(`total_acus\t${res.total_acus}`);
  print(`acus_devin\t${sums.devin}`);
  print(`acus_cascade\t${sums.cascade}`);
  print(`acus_terminal\t${sums.terminal}`);
  print(`acus_automation\t${seen.automation ? sums.automation : "-"}`);
  print(`acus_review\t${seen.review ? sums.review : "-"}`);
  for (const line of dailyLines(res)) print(line);
  return 0;
});
