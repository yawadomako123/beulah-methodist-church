"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { members } from "@/db/schema";
import { audit, formToObject, toActionError, validationError, zOptText, type ActionState } from "@/lib/actions";
import { assertPermission } from "@/lib/session";

/** Members may update their own contact details (not their email, which links their login). */
export async function updateMyContact(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission();
    if (!user.memberId) return { error: "Your account is not linked to a member record yet." };
    const parsed = z
      .object({ phone: zOptText, altPhone: zOptText, address: zOptText, occupation: zOptText, emergencyContact: zOptText })
      .safeParse(formToObject(formData));
    if (!parsed.success) return validationError(parsed.error);
    await db
      .update(members)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(members.id, user.memberId));
    await audit(user.id, "self_update", "member", user.memberId, parsed.data);
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/me");
  return { message: "Your details have been updated." };
}
