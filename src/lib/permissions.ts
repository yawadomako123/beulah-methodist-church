import type { Role } from "@/db/schema";

const STAFF: Role[] = ["admin", "pastor", "secretary"];

export const PERMISSIONS = {
  "members:view": [...STAFF, "treasurer"],
  "members:edit": STAFF,
  "members:delete": ["admin"],
  "groups:view": [...STAFF, "treasurer", "leader"],
  "groups:manage": STAFF,
  "events:manage": STAFF,
  "attendance:record": [...STAFF, "leader"],
  "giving:view": ["admin", "pastor", "treasurer"],
  "giving:edit": ["admin", "treasurer"],
  "announcements:manage": STAFF,
  "messages:send": STAFF,
  "reports:view": [...STAFF, "treasurer"],
  "users:manage": ["admin"],
  "settings:manage": ["admin"],
  "audit:view": ["admin"],
} satisfies Record<string, Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as Role[]).includes(role);
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrator",
  pastor: "Minister / Pastor",
  secretary: "Church Secretary",
  treasurer: "Treasurer / Finance",
  leader: "Class / Group Leader",
  member: "Member",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  admin: "Full access, including users, roles, settings and the audit log.",
  pastor: "Members, groups, events, announcements, messages, reports; can view giving.",
  secretary: "Members, households, groups, events, attendance, announcements and messages.",
  treasurer: "Records and reports giving; can look up members.",
  leader: "Sees their own groups and records attendance for them.",
  member: "Sees announcements, events, their own profile and giving history.",
};
