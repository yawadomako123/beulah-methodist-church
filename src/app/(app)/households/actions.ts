"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { households } from "@/db/schema";
import { audit, formToObject, toActionError, validationError, zOptEmail, zOptText, zText, type ActionState } from "@/lib/actions";
import { assertPermission } from "@/lib/session";

const schema = z.object({
  name: zText,
  address: zOptText,
  city: zOptText,
  phone: zOptText,
  email: zOptEmail,
  notes: zOptText,
});

export async function saveHousehold(householdId: number | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  let id = householdId;
  try {
    const user = await assertPermission("members:edit");
    const parsed = schema.safeParse(formToObject(formData));
    if (!parsed.success) return validationError(parsed.error);
    if (id) {
      await db.update(households).set({ ...parsed.data, updatedAt: new Date() }).where(eq(households.id, id));
      await audit(user.id, "update", "household", id, { name: parsed.data.name });
    } else {
      const [row] = await db.insert(households).values(parsed.data).returning({ id: households.id });
      id = row.id;
      await audit(user.id, "create", "household", id, { name: parsed.data.name });
    }
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/households");
  redirect(`/households/${id}`);
}

export async function deleteHousehold(householdId: number, _prev?: ActionState, _fd?: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission("members:edit");
    await db.delete(households).where(eq(households.id, householdId));
    await audit(user.id, "delete", "household", householdId);
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/households");
  redirect("/households");
}
