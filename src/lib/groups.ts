import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { groupMembers } from "@/db/schema";
import { can } from "./permissions";
import type { CurrentUser } from "./session";

/** Group ids the user leads (as leader or assistant) through their linked member record. */
export async function ledGroupIds(user: CurrentUser): Promise<number[]> {
  if (!user.memberId) return [];
  const rows = await db
    .select({ id: groupMembers.groupId })
    .from(groupMembers)
    .where(and(eq(groupMembers.memberId, user.memberId), inArray(groupMembers.role, ["leader", "assistant"])));
  return rows.map((r) => r.id);
}

/** Every group the user belongs to, in any role. */
export async function myGroupIds(user: CurrentUser): Promise<number[]> {
  if (!user.memberId) return [];
  const rows = await db.select({ id: groupMembers.groupId }).from(groupMembers).where(eq(groupMembers.memberId, user.memberId));
  return rows.map((r) => r.id);
}

/** Staff can manage every group; leaders can manage the roster and attendance of groups they lead. */
export async function canManageGroup(user: CurrentUser, groupId: number | null): Promise<boolean> {
  if (can(user.role, "groups:manage")) return true;
  if (groupId === null || user.role !== "leader") return false;
  return (await ledGroupIds(user)).includes(groupId);
}
