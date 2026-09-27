import "server-only";
import { z } from "zod";
import { db } from "@/db";
import { auditLog } from "@/db/schema";
import { PermissionError } from "./session";

export type ActionState = { error?: string; fieldErrors?: Record<string, string>; message?: string } | undefined;

/** Turns FormData into a plain object; empty strings become undefined. */
export function formToObject(formData: FormData): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$ACTION")) continue;
    const v = typeof value === "string" ? value.trim() : undefined;
    out[key] = v === "" ? undefined : v;
  }
  return out;
}

export function validationError(error: z.ZodError): ActionState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { error: "Please correct the highlighted fields.", fieldErrors };
}

export function toActionError(err: unknown): ActionState {
  if (err instanceof PermissionError) return { error: err.message };
  // Let Next.js redirects and notFound() propagate.
  if (err && typeof err === "object" && "digest" in err) throw err;
  console.error(err);
  return { error: "Something went wrong. Please try again." };
}

export async function audit(
  userId: string | null,
  action: string,
  entity: string,
  entityId?: string | number | null,
  details?: Record<string, unknown>,
) {
  await db.insert(auditLog).values({
    userId,
    action,
    entity,
    entityId: entityId == null ? null : String(entityId),
    details: details ?? null,
  });
}

/* Common field schemas */
export const zText = z.string().trim().min(1, "Required");
export const zOptText = z.string().trim().optional().transform((v) => v || null);
export const zOptDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date")
  .optional()
  .transform((v) => v ?? null);
export const zOptEmail = z
  .string()
  .email("Enter a valid email")
  .optional()
  .transform((v) => v?.toLowerCase() ?? null);
export const zOptInt = z
  .preprocess((v) => (v === undefined ? undefined : Number(v)), z.number().int("Must be a whole number").min(0).optional())
  .transform((v) => v ?? null);
export const zMoney = z.coerce
  .number({ message: "Enter an amount" })
  .positive("Amount must be greater than zero")
  .refine((v) => Math.abs(Math.round(v * 100) - v * 100) < 1e-6, "Use at most 2 decimal places");
