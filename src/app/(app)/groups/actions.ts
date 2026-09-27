"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { GROUP_ROLES, GROUP_TYPES, groupMembers, groups } from "@/db/schema";
import { audit, formToObject, toActionError, validationError, zOptText, zText, type ActionState } from "@/lib/actions";
import { canManageGroup } from "@/lib/groups";
import { assertPermission, PermissionError } from "@/lib/session";

const groupSchema = z.object({
  name: zText,
  type: z.enum(GROUP_TYPES),
  description: zOptText,
  meetingDay: zOptText,
  meetingTime: zOptText,
  location: zOptText,
  active: z
    .string()
    .optional()
    .transform((v) => v === "on"),
});

export async function saveGroup(groupId: number | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  let id = groupId;
  try {
    const user = await assertPermission("groups:manage");
    const raw = formToObject(formData);
    const parsed = groupSchema.safeParse(groupId ? raw : { ...raw, active: "on" });
    if (!parsed.success) return validationError(parsed.error);
    if (id) {
      await db.update(groups).set(parsed.data).where(eq(groups.id, id));
      await audit(user.id, "update", "group", id, { name: parsed.data.name });
    } else {
      const [row] = await db.insert(groups).values(parsed.data).returning({ id: groups.id });
      id = row.id;
      await audit(user.id, "create", "group", id, { name: parsed.data.name });
    }
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/groups");
  redirect(`/groups/${id}`);
}

export async function deleteGroup(groupId: number, _prev?: ActionState, _fd?: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission("groups:manage");
    await db.delete(groups).where(eq(groups.id, groupId));
    await audit(user.id, "delete", "group", groupId);
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/groups");
  redirect("/groups");
}

async function assertCanManage(groupId: number) {
  const user = await assertPermission("groups:view");
  if (!(await canManageGroup(user, groupId))) throw new PermissionError("You can only manage groups you lead.");
  return user;
}

export async function addGroupMember(groupId: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await assertCanManage(groupId);
    const parsed = z
      .object({ memberId: z.coerce.number({ message: "Choose a member" }).int().positive("Choose a member"), role: z.enum(GROUP_ROLES) })
      .safeParse(formToObject(formData));
    if (!parsed.success) return validationError(parsed.error);
    // Only staff may appoint leaders.
    const role = parsed.data.role !== "member" && user.role === "leader" ? "member" : parsed.data.role;
    await db
      .insert(groupMembers)
      .values({ groupId, memberId: parsed.data.memberId, role })
      .onConflictDoUpdate({ target: [groupMembers.groupId, groupMembers.memberId], set: { role } });
    await audit(user.id, "add_member", "group", groupId, { memberId: parsed.data.memberId, role });
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath(`/groups/${groupId}`);
  return { message: "Member added." };
}

export async function removeGroupMember(groupId: number, memberId: number, _prev?: ActionState, _fd?: FormData): Promise<ActionState> {
  try {
    const user = await assertCanManage(groupId);
    if (user.role === "leader" && user.memberId === memberId) throw new PermissionError("Ask a staff member to remove you as leader.");
    await db.delete(groupMembers).where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.memberId, memberId)));
    await audit(user.id, "remove_member", "group", groupId, { memberId });
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath(`/groups/${groupId}`);
  return undefined;
}
