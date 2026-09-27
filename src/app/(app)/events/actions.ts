"use server";

import { and, eq, notInArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { attendance, EVENT_TYPES, events } from "@/db/schema";
import { audit, formToObject, toActionError, validationError, zOptInt, zOptText, zText, type ActionState } from "@/lib/actions";
import { localInputToDate } from "@/lib/format";
import { canManageGroup } from "@/lib/groups";
import { can } from "@/lib/permissions";
import { assertPermission, PermissionError, type CurrentUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";

const dateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "Choose a date and time");

const eventSchema = z
  .object({
    title: zText,
    type: z.enum(EVENT_TYPES),
    description: zOptText,
    location: zOptText,
    startsAt: dateTime,
    endsAt: dateTime.optional(),
    groupId: zOptInt,
  })
  .refine((v) => !v.endsAt || v.endsAt >= v.startsAt, { message: "End must be after the start", path: ["endsAt"] });

async function assertCanEditEvent(user: CurrentUser, groupId: number | null) {
  if (can(user.role, "events:manage")) return;
  if (groupId !== null && (await canManageGroup(user, groupId))) return;
  throw new PermissionError("You can only manage events for groups you lead.");
}

export async function saveEvent(eventId: number | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  let id = eventId;
  try {
    const user = await assertPermission();
    const parsed = eventSchema.safeParse(formToObject(formData));
    if (!parsed.success) return validationError(parsed.error);
    const { timezone } = await getSettings();
    const data = {
      ...parsed.data,
      startsAt: localInputToDate(parsed.data.startsAt, timezone),
      endsAt: parsed.data.endsAt ? localInputToDate(parsed.data.endsAt, timezone) : null,
    };
    await assertCanEditEvent(user, data.groupId);
    if (id) {
      const existing = await db.query.events.findFirst({ where: eq(events.id, id), columns: { groupId: true } });
      if (!existing) return { error: "Event not found." };
      await assertCanEditEvent(user, existing.groupId);
      await db.update(events).set(data).where(eq(events.id, id));
      await audit(user.id, "update", "event", id, { title: data.title });
    } else {
      const [row] = await db.insert(events).values({ ...data, createdBy: user.id }).returning({ id: events.id });
      id = row.id;
      await audit(user.id, "create", "event", id, { title: data.title });
    }
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/events");
  redirect(`/events/${id}`);
}

export async function deleteEvent(eventId: number, _prev?: ActionState, _fd?: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission();
    const existing = await db.query.events.findFirst({ where: eq(events.id, eventId), columns: { groupId: true, title: true } });
    if (!existing) return { error: "Event not found." };
    await assertCanEditEvent(user, existing.groupId);
    await db.delete(events).where(eq(events.id, eventId));
    await audit(user.id, "delete", "event", eventId, { title: existing.title });
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/events");
  redirect("/events");
}

export async function saveAttendance(eventId: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission("attendance:record");
    const event = await db.query.events.findFirst({ where: eq(events.id, eventId), columns: { groupId: true } });
    if (!event) return { error: "Event not found." };
    if (!can(user.role, "events:manage") && !(await canManageGroup(user, event.groupId))) {
      throw new PermissionError("You can only take attendance for groups you lead.");
    }

    const present = [...new Set(formData.getAll("present").map(Number).filter((n) => Number.isInteger(n) && n > 0))];
    const counts = z.object({ headcount: zOptInt, visitorCount: zOptInt }).safeParse(formToObject(formData));
    if (!counts.success) return validationError(counts.error);

    await db.transaction(async (tx) => {
      await tx
        .delete(attendance)
        .where(and(eq(attendance.eventId, eventId), present.length ? notInArray(attendance.memberId, present) : undefined));
      if (present.length) {
        await tx
          .insert(attendance)
          .values(present.map((memberId) => ({ eventId, memberId, recordedBy: user.id })))
          .onConflictDoNothing();
      }
      await tx.update(events).set(counts.data).where(eq(events.id, eventId));
    });
    await audit(user.id, "record_attendance", "event", eventId, { present: present.length, ...counts.data });
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath(`/events/${eventId}`);
  return { message: "Attendance saved." };
}
