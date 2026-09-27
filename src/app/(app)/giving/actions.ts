"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { contributions, funds, PAYMENT_METHODS, pledges } from "@/db/schema";
import { audit, formToObject, toActionError, validationError, zMoney, zOptInt, zOptText, zText, type ActionState } from "@/lib/actions";
import { assertPermission } from "@/lib/session";

const isoDate = z.string({ message: "Choose a date" }).regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date");

const contributionSchema = z.object({
  memberId: zOptInt,
  fundId: z.coerce.number({ message: "Choose a fund" }).int().positive("Choose a fund"),
  amount: zMoney,
  date: isoDate,
  method: z.enum(PAYMENT_METHODS),
  reference: zOptText,
  notes: zOptText,
});

export async function addContribution(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission("giving:edit");
    const parsed = contributionSchema.safeParse(formToObject(formData));
    if (!parsed.success) return validationError(parsed.error);
    const [row] = await db
      .insert(contributions)
      .values({ ...parsed.data, amount: parsed.data.amount.toFixed(2), recordedBy: user.id })
      .returning({ id: contributions.id });
    await audit(user.id, "create", "contribution", row.id, { amount: parsed.data.amount, fundId: parsed.data.fundId, memberId: parsed.data.memberId });
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/giving");
  return { message: "Contribution recorded." };
}

export async function deleteContribution(id: number, _prev?: ActionState, _fd?: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission("giving:edit");
    const [row] = await db.delete(contributions).where(eq(contributions.id, id)).returning();
    if (row) await audit(user.id, "delete", "contribution", id, { amount: row.amount, fundId: row.fundId, memberId: row.memberId, date: row.date });
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/giving");
  return undefined;
}

export async function saveFund(fundId: number | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission("giving:edit");
    const parsed = z
      .object({ name: zText, description: zOptText, active: z.string().optional().transform((v) => v === "on") })
      .safeParse(formToObject(formData));
    if (!parsed.success) return validationError(parsed.error);
    if (fundId) {
      await db.update(funds).set(parsed.data).where(eq(funds.id, fundId));
      await audit(user.id, "update", "fund", fundId, parsed.data);
    } else {
      const [row] = await db.insert(funds).values({ ...parsed.data, active: true }).returning({ id: funds.id });
      await audit(user.id, "create", "fund", row.id, parsed.data);
    }
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "23505") return { error: "A fund with that name already exists." };
    return toActionError(err);
  }
  revalidatePath("/giving/funds");
  return { message: fundId ? "Fund updated." : "Fund created." };
}

const pledgeSchema = z
  .object({
    memberId: z.coerce.number({ message: "Choose a member" }).int().positive("Choose a member"),
    fundId: z.coerce.number({ message: "Choose a fund" }).int().positive("Choose a fund"),
    amount: zMoney,
    startDate: isoDate,
    endDate: isoDate,
    notes: zOptText,
  })
  .refine((v) => v.endDate >= v.startDate, { message: "End date must be after the start date", path: ["endDate"] });

export async function addPledge(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission("giving:edit");
    const parsed = pledgeSchema.safeParse(formToObject(formData));
    if (!parsed.success) return validationError(parsed.error);
    const [row] = await db
      .insert(pledges)
      .values({ ...parsed.data, amount: parsed.data.amount.toFixed(2) })
      .returning({ id: pledges.id });
    await audit(user.id, "create", "pledge", row.id, { amount: parsed.data.amount, memberId: parsed.data.memberId });
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/giving/pledges");
  return { message: "Pledge recorded." };
}

export async function deletePledge(id: number, _prev?: ActionState, _fd?: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission("giving:edit");
    await db.delete(pledges).where(eq(pledges.id, id));
    await audit(user.id, "delete", "pledge", id);
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/giving/pledges");
  return undefined;
}
