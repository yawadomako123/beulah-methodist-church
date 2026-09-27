"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import {
  GENDERS,
  HOUSEHOLD_ROLES,
  households,
  MARITAL_STATUSES,
  MEMBER_STATUSES,
  members,
  MEMBERSHIP_TYPES,
} from "@/db/schema";
import { audit, formToObject, toActionError, validationError, zOptDate, zOptEmail, zOptText, zText, type ActionState } from "@/lib/actions";
import { assertPermission } from "@/lib/session";

const optEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .enum(values)
    .optional()
    .transform((v) => v ?? null);

const memberSchema = z.object({
  title: zOptText,
  firstName: zText,
  lastName: zText,
  otherNames: zOptText,
  gender: optEnum(GENDERS),
  dateOfBirth: zOptDate,
  maritalStatus: optEnum(MARITAL_STATUSES),
  phone: zOptText,
  altPhone: zOptText,
  email: zOptEmail,
  address: zOptText,
  hometown: zOptText,
  occupation: zOptText,
  status: z.enum(MEMBER_STATUSES),
  membershipType: z.enum(MEMBERSHIP_TYPES),
  membershipDate: zOptDate,
  baptismDate: zOptDate,
  confirmationDate: zOptDate,
  marriageDate: zOptDate,
  emergencyContact: zOptText,
  photoUrl: z.string().url("Enter a full link starting with https://").optional().transform((v) => v ?? null),
  notes: zOptText,
  householdId: z.string().optional(),
  newHouseholdName: zOptText,
  householdRole: optEnum(HOUSEHOLD_ROLES),
});

export async function saveMember(memberId: number | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  let id = memberId;
  try {
    const user = await assertPermission("members:edit");
    const parsed = memberSchema.safeParse(formToObject(formData));
    if (!parsed.success) return validationError(parsed.error);
    const { householdId: householdChoice, newHouseholdName, ...data } = parsed.data;

    let householdId: number | null = null;
    if (householdChoice === "new") {
      const [h] = await db
        .insert(households)
        .values({
          name: newHouseholdName ?? `${data.lastName} household`,
          address: data.address,
          phone: data.phone,
          email: data.email,
        })
        .returning({ id: households.id });
      householdId = h.id;
    } else if (householdChoice) {
      householdId = Number(householdChoice);
    }

    const values = { ...data, householdId, householdRole: householdId ? (data.householdRole ?? "other") : null, updatedAt: new Date() };
    if (id) {
      await db.update(members).set(values).where(eq(members.id, id));
      await audit(user.id, "update", "member", id, { name: `${data.firstName} ${data.lastName}` });
    } else {
      const [row] = await db.insert(members).values(values).returning({ id: members.id });
      id = row.id;
      await audit(user.id, "create", "member", id, { name: `${data.firstName} ${data.lastName}` });
    }
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/members");
  redirect(`/members/${id}`);
}

export async function deleteMember(memberId: number, _prev?: ActionState, _formData?: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission("members:delete");
    const [row] = await db.delete(members).where(eq(members.id, memberId)).returning({ first: members.firstName, last: members.lastName });
    await audit(user.id, "delete", "member", memberId, row ? { name: `${row.first} ${row.last}` } : undefined);
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/members");
  redirect("/members");
}
