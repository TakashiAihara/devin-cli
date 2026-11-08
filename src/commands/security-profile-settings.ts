import {
  securityProfileSettings,
  updateSecurityProfileSettings,
  type SecurityProfileSettings,
} from "../api/endpoints.ts";
import type {
  SecurityProfileDefaultSelection,
  SecurityProfileDefaultSelectionSelection,
  SecurityProfileSettingsUpdateRequest,
} from "../generated/api.schemas.ts";
import { resolveOrgId } from "../api/resolve-org.ts";
import { cellText, die, guard, json, print } from "../lib.ts";

export type SecurityProfileSettingsGetOptions = { org?: string; json: boolean };
export type SecurityProfileSettingsUpdateOptions = {
  default?: string;
  defaultProfile?: string;
  automationsDefault?: string;
  automationsDefaultProfile?: string;
  org?: string;
  json: boolean;
};

// SecurityProfileDefaultState: {selection: inherit|none|profile, profile_id?, profile_scope?}
const SETTINGS_HEADER = "scope\tselection\tprofile_id\tprofile_scope";

const stateLine = (scope: string, s: SecurityProfileSettings["default"]): string =>
  [scope, cellText(s.selection), cellText(s.profile_id), cellText(s.profile_scope)].join("\t");

const emitSettings = (s: SecurityProfileSettings, asJson: boolean): number => {
  if (asJson) {
    json(s);
    return 0;
  }
  print(SETTINGS_HEADER);
  print(stateLine("default", s.default));
  print(stateLine("automations_default", s.automations_default));
  return 0;
};

// {selection, profile_id?} を組み立てる。profile を選ぶときだけ profile_id が必須で、
// inherit/none に profile_id は付けられない (spec の PATCH 意味論)
function selection(
  scope: string | undefined,
  profile: string | undefined,
  label: string,
): SecurityProfileDefaultSelection | undefined {
  if (scope === undefined) {
    if (profile !== undefined) return die(`--${label}-profile は --${label} と併用する`, 2);
    return undefined;
  }
  if (scope === "profile") {
    if (profile === undefined || profile === "")
      return die(`--${label} が profile のとき --${label}-profile は必須`, 2);
    return { selection: "profile", profile_id: profile };
  }
  if (profile !== undefined)
    return die(`--${label} が ${scope} のとき --${label}-profile は付けない`, 2);
  return { selection: scope as SecurityProfileDefaultSelectionSelection };
}

export const runSecurityProfileSettingsGet = guard(async (o: SecurityProfileSettingsGetOptions) => {
  const orgId = await resolveOrgId(o.org);
  const s = await securityProfileSettings(orgId);
  return emitSettings(s, o.json);
});

export const runSecurityProfileSettingsUpdate = guard(
  async (o: SecurityProfileSettingsUpdateOptions) => {
    const def = selection(o.default, o.defaultProfile, "default");
    const automations = selection(
      o.automationsDefault,
      o.automationsDefaultProfile,
      "automations-default",
    );
    if (def === undefined && automations === undefined)
      return die("--default か --automations-default のどちらかは必須", 2);
    const body: SecurityProfileSettingsUpdateRequest = {};
    if (def !== undefined) body.default = def;
    if (automations !== undefined) body.automations_default = automations;
    const orgId = await resolveOrgId(o.org);
    const s = await updateSecurityProfileSettings(orgId, body);
    return emitSettings(s, o.json);
  },
);
