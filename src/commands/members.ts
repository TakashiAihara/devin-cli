import {
  memberUser,
  membersIdpUsers,
  membersUsers,
  type Member,
  type MemberDetail,
} from "../api/endpoints.ts";
import { resolveOrgId } from "../api/resolve-org.ts";
import { cellText, guard, json, print } from "../lib.ts";

export type MembersListOptions = { limit?: number; org?: string; json: boolean };
export type MemberGetOptions = { userId: string; org?: string; json: boolean };

const rolesText = (assignments: Member["role_assignments"] | undefined): string =>
  (assignments ?? []).map((a) => cellText(a.role?.role_name)).join(",");

const idpRolesText = (
  assignments: { idp_group_name: string; role: { role_name: string } }[] | undefined,
): string =>
  (assignments ?? [])
    .map((a) => `${cellText(a.idp_group_name)}:${cellText(a.role?.role_name)}`)
    .join(",");

const memberLine = (u: Member | MemberDetail, withIdp: boolean): string => {
  const cols = [
    cellText(u.user_id),
    cellText(u.email),
    cellText(u.name),
    rolesText(u.role_assignments),
  ];
  if (withIdp) cols.push(idpRolesText((u as MemberDetail).idp_role_assignments));
  return cols.join("\t");
};

export const runMembersList = guard(async (o: MembersListOptions) => {
  const orgId = await resolveOrgId(o.org);
  const res = await membersUsers(orgId, o.limit);
  if (o.json) {
    json(res);
    return 0;
  }
  print("user_id\temail\tname\troles");
  for (const u of res.items) print(memberLine(u, false));
  return 0;
});

export const runMembersGet = guard(async (o: MemberGetOptions) => {
  const orgId = await resolveOrgId(o.org);
  const u = await memberUser(orgId, o.userId);
  if (o.json) {
    json(u);
    return 0;
  }
  print("user_id\temail\tname\troles\tidp_roles");
  print(memberLine(u, true));
  return 0;
});

export const runMembersIdpUsers = guard(async (o: MembersListOptions) => {
  const orgId = await resolveOrgId(o.org);
  const res = await membersIdpUsers(orgId, o.limit);
  if (o.json) {
    json(res);
    return 0;
  }
  print("user_id\temail\tname\tidp_roles");
  for (const u of res.items)
    print(
      [
        cellText(u.user_id),
        cellText(u.email),
        cellText(u.name),
        idpRolesText(u.idp_role_assignments),
      ].join("\t"),
    );
  return 0;
});
