"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { audit, formToObject, toActionError, validationError, zText, type ActionState } from "@/lib/actions";
import { resolveAudience } from "@/lib/audiences";
import { emailConfigured, sendBulkEmail } from "@/lib/email";
import { assertPermission } from "@/lib/session";
import { getSettings } from "@/lib/settings";

export async function sendMessage(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission("messages:send");
    const parsed = z.object({ audience: zText, subject: zText, body: zText }).safeParse(formToObject(formData));
    if (!parsed.success) return validationError(parsed.error);
    if (!emailConfigured()) return { error: "Email sending is not set up yet. Add RESEND_API_KEY and EMAIL_FROM to the environment." };

    const aud = await resolveAudience(parsed.data.audience);
    if (!aud) return { error: "Choose who to send to." };
    const emails = [...new Set(aud.recipients.map((r) => r.email?.trim().toLowerCase()).filter((e): e is string => !!e))];
    if (emails.length === 0) return { error: "Nobody in that audience has an email address on file." };

    const { churchName } = await getSettings();
    const sent = await sendBulkEmail(emails, parsed.data.subject, parsed.data.body, churchName);
    const status = sent === emails.length ? "sent" : sent === 0 ? "failed" : "partial";
    const [row] = await db
      .insert(messages)
      .values({ ...parsed.data, audienceLabel: aud.label, recipientCount: emails.length, sentCount: sent, status, sentBy: user.id })
      .returning({ id: messages.id });
    await audit(user.id, "send_email", "message", row.id, { audience: aud.label, recipients: emails.length, sent });
    revalidatePath("/messages");
    if (status === "failed") return { error: "The email service rejected the message. Check the API key and sender address." };
    return { message: `Sent to ${sent} of ${emails.length} recipients.` };
  } catch (err) {
    return toActionError(err);
  }
}
