"use server";

import { eq, not } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { announcements, AUDIENCES } from "@/db/schema";
import { audit, formToObject, toActionError, validationError, zOptDate, zText, type ActionState } from "@/lib/actions";
import { assertPermission } from "@/lib/session";

const schema = z.object({
  title: zText,
  body: zText,
  audience: z.enum(AUDIENCES),
  expiresAt: zOptDate,
  pinned: z
    .string()
    .optional()
    .transform((v) => v === "on"),
});

export async function createAnnouncement(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission("announcements:manage");
    const parsed = schema.safeParse(formToObject(formData));
    if (!parsed.success) return validationError(parsed.error);
    const [row] = await db.insert(announcements).values({ ...parsed.data, createdBy: user.id }).returning({ id: announcements.id });
    await audit(user.id, "create", "announcement", row.id, { title: parsed.data.title });
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/announcements");
  revalidatePath("/dashboard");
  return { message: "Announcement posted." };
}

export async function togglePin(id: number, _prev?: ActionState, _fd?: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission("announcements:manage");
    await db.update(announcements).set({ pinned: not(announcements.pinned) }).where(eq(announcements.id, id));
    await audit(user.id, "toggle_pin", "announcement", id);
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/announcements");
  return undefined;
}

export async function deleteAnnouncement(id: number, _prev?: ActionState, _fd?: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission("announcements:manage");
    await db.delete(announcements).where(eq(announcements.id, id));
    await audit(user.id, "delete", "announcement", id);
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/announcements");
  return undefined;
}
