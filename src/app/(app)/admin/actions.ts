"use server";

import { and, count, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { ROLES, session, settings, user as userTable } from "@/db/schema";
import { audit, formToObject, toActionError, validationError, zOptInt, type ActionState } from "@/lib/actions";
import { assertPermission } from "@/lib/session";
import { DEFAULT_SETTINGS, type SettingKey } from "@/lib/settings";

const userSchema = z.object({
  role: z.enum(ROLES),
  active: z
    .string()
    .optional()
    .transform((v) => v === "on"),
  memberId: zOptInt,
});

export async function updateUser(userId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const admin = await assertPermission("users:manage");
    const parsed = userSchema.safeParse(formToObject(formData));
    if (!parsed.success) return validationError(parsed.error);
    const { role, active, memberId } = parsed.data;

    const target = await db.query.user.findFirst({ where: eq(userTable.id, userId) });
    if (!target) return { error: "User not found." };

    // Never leave the system without an active administrator.
    if (target.role === "admin" && (role !== "admin" || !active)) {
      const [{ n }] = await db
        .select({ n: count() })
        .from(userTable)
        .where(and(eq(userTable.role, "admin"), eq(userTable.active, true), ne(userTable.id, userId)));
      if (n === 0) return { error: "There must be at least one active administrator." };
    }

    if (memberId) {
      const taken = await db.query.user.findFirst({ where: and(eq(userTable.memberId, memberId), ne(userTable.id, userId)), columns: { email: true } });
      if (taken) return { error: `That member record is already linked to ${taken.email}.` };
    }

    await db.update(userTable).set({ role, active, memberId, updatedAt: new Date() }).where(eq(userTable.id, userId));
    // Signing out a deactivated user immediately.
    if (!active) await db.delete(session).where(eq(session.userId, userId));
    await audit(admin.id, "update", "user", userId, {
      email: target.email,
      from: { role: target.role, active: target.active, memberId: target.memberId },
      to: { role, active, memberId },
    });
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/admin/users");
  return { message: "Saved." };
}

export async function saveSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const admin = await assertPermission("settings:manage");
    const data = formToObject(formData);
    const keys = Object.keys(DEFAULT_SETTINGS) as SettingKey[];

    const currency = (data.currency ?? "").toUpperCase();
    try {
      new Intl.NumberFormat("en", { style: "currency", currency }).format(1);
    } catch {
      return { error: "Invalid currency.", fieldErrors: { currency: "Use a 3-letter ISO code such as GHS, USD, GBP" } };
    }
    try {
      new Intl.DateTimeFormat("en", { timeZone: data.timezone }).format();
    } catch {
      return { error: "Invalid time zone.", fieldErrors: { timezone: "Use an IANA time zone such as Africa/Accra" } };
    }
    if (!data.churchName) return { error: "Church name is required.", fieldErrors: { churchName: "Required" } };

    const rows = keys.map((key) => ({ key, value: key === "currency" ? currency : (data[key] ?? "") }));
    for (const row of rows) {
      await db.insert(settings).values(row).onConflictDoUpdate({ target: settings.key, set: { value: row.value } });
    }
    await audit(admin.id, "update", "settings", null, Object.fromEntries(rows.map((r) => [r.key, r.value])));
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/", "layout");
  return { message: "Settings saved." };
}
