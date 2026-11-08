import { defaultPlatform, setDefaultPlatform, type DefaultPlatform } from "../api/endpoints.ts";
import { resolveOrgId } from "../api/resolve-org.ts";
import { cellText, die, guard, json, print } from "../lib.ts";

export type DefaultPlatformGetOptions = { org?: string; json: boolean };
export type DefaultPlatformSetOptions = {
  platform?: string;
  outpostPoolId?: string;
  clear?: boolean;
  org?: string;
  json: boolean;
};

const PLATFORM_HEADER = "platform\toutpost_pool_id\toutpost_pool_name";

const emitPlatform = (p: DefaultPlatform, asJson: boolean): number => {
  if (asJson) {
    json(p);
    return 0;
  }
  print(PLATFORM_HEADER);
  print(
    [cellText(p.platform), cellText(p.outpost_pool_id), cellText(p.outpost_pool_name)].join("\t"),
  );
  return 0;
};

export const runDefaultPlatformGet = guard(async (o: DefaultPlatformGetOptions) => {
  const orgId = await resolveOrgId(o.org);
  const p = await defaultPlatform(orgId);
  return emitPlatform(p, o.json);
});

// PUT は {platform} か {outpost_pool_id} のどちらか 1 つ。両方 null / 空で default を解除
export const runDefaultPlatformSet = guard(async (o: DefaultPlatformSetOptions) => {
  const given = [o.platform !== undefined, o.outpostPoolId !== undefined, o.clear === true].filter(
    Boolean,
  ).length;
  if (given !== 1)
    return die("--platform / --outpost-pool-id / --clear のどれか 1 つだけ指定する", 2);
  const body =
    o.clear === true
      ? {}
      : o.platform !== undefined
        ? { platform: o.platform }
        : { outpost_pool_id: o.outpostPoolId };
  const orgId = await resolveOrgId(o.org);
  const p = await setDefaultPlatform(orgId, body);
  return emitPlatform(p, o.json);
});
