import { formatIsoUtc } from "../dates.ts";
import {
  createSecurityProfile,
  deleteSecurityProfile,
  securityProfile,
  securityProfiles,
  updateSecurityProfile,
  type SecurityProfile,
  type SecurityProfileItem,
} from "../api/endpoints.ts";
import type {
  SecurityProfileCreateRequest,
  SecurityProfileUpdateRequest,
} from "../generated/api.schemas.ts";
import { resolveOrgId } from "../api/resolve-org.ts";
import { cellText, die, guard, json, print } from "../lib.ts";

export type SecurityProfilesListOptions = { limit?: number; org?: string; json: boolean };
export type SecurityProfileGetOptions = { profileId: string; org?: string; json: boolean };
export type SecurityProfileWriteOptions = {
  name?: string;
  enforcementLevel?: string;
  gitAccessLevel?: string;
  devinMcpReadOnly?: boolean;
  removeGithubCliToken?: boolean;
  mcpServer?: string[];
  clearMcpConfig?: boolean;
  netPolicyJson?: string;
  slackChannelAccessJson?: string;
  teamsChannelAccessJson?: string;
  slackDmScope?: string;
  teamsDmScope?: string;
  teamsGroupChatScope?: string;
  org?: string;
  json: boolean;
};
export type SecurityProfileUpdateOptions = SecurityProfileWriteOptions & { profileId: string };

const profileLine = (p: SecurityProfileItem | SecurityProfile): string =>
  [
    cellText(p.profile_id),
    cellText(p.name),
    cellText(p.enforcement_level),
    cellText(p.git_access_level),
    cellText(p.devin_mcp_read_only),
    cellText(p.remove_github_cli_token),
    formatIsoUtc(p.created_at),
    formatIsoUtc(p.updated_at),
  ].join("\t");

const PROFILE_HEADER =
  "profile_id\tname\tenforcement_level\tgit_access_level\tdevin_mcp_read_only\tremove_github_cli_token\tcreated_at\tupdated_at";

const emitProfile = (p: SecurityProfileItem | SecurityProfile, asJson: boolean): number => {
  if (asJson) {
    json(p);
    return 0;
  }
  print(PROFILE_HEADER);
  print(profileLine(p));
  return 0;
};

// --- write (create / update) ---
// update は PATCH なので指定した項目だけを送る。JSON object 系の項目は 'null' で解除できる
function jsonField(label: string, raw: string | undefined): unknown {
  if (raw === undefined) return undefined;
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch (e) {
    return die(`--${label} を JSON として読めない: ${(e as Error).message}`, 2);
  }
  if (v !== null && (typeof v !== "object" || Array.isArray(v)))
    return die(`--${label} は JSON object か null にする`, 2);
  return v;
}

const scopeField = (raw: string | undefined): string | null | undefined =>
  raw === undefined ? undefined : raw === "null" ? null : raw;

function profileBody(o: SecurityProfileWriteOptions): SecurityProfileUpdateRequest {
  const body: SecurityProfileUpdateRequest = {};
  if (o.name !== undefined) {
    if (o.name === "") return die("--name が空", 2);
    body.name = o.name;
  }
  if (o.enforcementLevel !== undefined)
    body.enforcement_level =
      o.enforcementLevel as SecurityProfileUpdateRequest["enforcement_level"];
  if (o.gitAccessLevel !== undefined)
    body.git_access_level = o.gitAccessLevel as SecurityProfileUpdateRequest["git_access_level"];
  if (o.devinMcpReadOnly !== undefined) body.devin_mcp_read_only = o.devinMcpReadOnly;
  if (o.removeGithubCliToken !== undefined) body.remove_github_cli_token = o.removeGithubCliToken;
  if (o.mcpServer !== undefined && o.mcpServer.length > 0)
    body.mcp_config = { servers: o.mcpServer };
  if (o.clearMcpConfig) {
    if (o.mcpServer !== undefined && o.mcpServer.length > 0)
      return die("--mcp-server と --clear-mcp-config は併用できない", 2);
    body.mcp_config = null;
  }
  const net = jsonField("net-policy-json", o.netPolicyJson);
  if (net !== undefined) body.net_policy = net as SecurityProfileUpdateRequest["net_policy"];
  const slack = jsonField("slack-channel-access-json", o.slackChannelAccessJson);
  if (slack !== undefined)
    body.slack_channel_access = slack as SecurityProfileUpdateRequest["slack_channel_access"];
  const teams = jsonField("teams-channel-access-json", o.teamsChannelAccessJson);
  if (teams !== undefined)
    body.teams_channel_access = teams as SecurityProfileUpdateRequest["teams_channel_access"];
  const slackDm = scopeField(o.slackDmScope);
  if (slackDm !== undefined)
    body.slack_dm_scope = slackDm as SecurityProfileUpdateRequest["slack_dm_scope"];
  const teamsDm = scopeField(o.teamsDmScope);
  if (teamsDm !== undefined)
    body.teams_dm_scope = teamsDm as SecurityProfileUpdateRequest["teams_dm_scope"];
  const teamsGc = scopeField(o.teamsGroupChatScope);
  if (teamsGc !== undefined)
    body.teams_group_chat_scope = teamsGc as SecurityProfileUpdateRequest["teams_group_chat_scope"];
  return body;
}

export const runSecurityProfilesList = guard(async (o: SecurityProfilesListOptions) => {
  const orgId = await resolveOrgId(o.org);
  const res = await securityProfiles(orgId, o.limit);
  if (o.json) {
    json(res);
    return 0;
  }
  print(PROFILE_HEADER);
  for (const p of res.items) print(profileLine(p));
  return 0;
});

export const runSecurityProfileGet = guard(async (o: SecurityProfileGetOptions) => {
  const orgId = await resolveOrgId(o.org);
  const p = await securityProfile(orgId, o.profileId);
  return emitProfile(p, o.json);
});

export const runSecurityProfileCreate = guard(async (o: SecurityProfileWriteOptions) => {
  if (o.name === undefined || o.name === "") return die("create には --name が必須", 2);
  const orgId = await resolveOrgId(o.org);
  const body = profileBody(o) as SecurityProfileCreateRequest;
  const p = await createSecurityProfile(orgId, body);
  return emitProfile(p, o.json);
});

export const runSecurityProfileUpdate = guard(async (o: SecurityProfileUpdateOptions) => {
  const orgId = await resolveOrgId(o.org);
  const p = await updateSecurityProfile(orgId, o.profileId, profileBody(o));
  return emitProfile(p, o.json);
});

export const runSecurityProfileDelete = guard(async (o: SecurityProfileGetOptions) => {
  const orgId = await resolveOrgId(o.org);
  await deleteSecurityProfile(orgId, o.profileId);
  if (o.json) {
    json({ profile_id: o.profileId, deleted: true });
    return 0;
  }
  print(`deleted\t${cellText(o.profileId)}`);
  return 0;
});
