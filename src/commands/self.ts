import { cellText, guard, json, print } from "../lib.ts";
import { selfInfo } from "../api/resolve-org.ts";

export type SelfOptions = { json: boolean };

export const runSelf = guard(async (o: SelfOptions) => {
  const s = await selfInfo();
  if (o.json) {
    json(s);
    return 0;
  }
  const rec = s as unknown as Record<string, unknown>;
  const id = rec.user_id ?? rec.service_user_id ?? rec.devin_id;
  const name = rec.user_name ?? rec.service_user_name;
  print("principal_type\tid\tname\torg_id\tdevin_sessions_org_id\tprimary_billing_org_id");
  print(
    [
      cellText(rec.principal_type),
      cellText(id),
      cellText(name),
      cellText(rec.org_id),
      cellText(rec.devin_sessions_org_id),
      cellText(rec.primary_billing_org_id),
    ].join("\t"),
  );
  return 0;
});
