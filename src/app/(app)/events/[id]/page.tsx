import { asc, eq, inArray } from "drizzle-orm";
import { Clock, MapPin, Pencil, UsersRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Badge, Card, PageHeader } from "@/components/ui";
import { db } from "@/db";
import { attendance, events, groupMembers, groups, members } from "@/db/schema";
import { formatDateTime, humanize } from "@/lib/format";
import { canManageGroup, ledGroupIds, myGroupIds } from "@/lib/groups";
import { can } from "@/lib/permissions";
import { requireUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { deleteEvent, saveAttendance } from "../actions";
import { EventForm } from "../event-form";
import { AttendanceSheet } from "./attendance-sheet";

export const metadata: Metadata = { title: "Event" };

export default async function EventPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ edit?: string }> }) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const event = await db.query.events.findFirst({ where: eq(events.id, id), with: { group: true } });
  if (!event) notFound();

  const staff = can(user.role, "events:manage");
  if (!staff && user.role !== "treasurer" && event.groupId !== null && !(await myGroupIds(user)).includes(event.groupId)) {
    redirect("/no-access");
  }
  const manage = staff || (await canManageGroup(user, event.groupId));
  const canRecord = manage && can(user.role, "attendance:record");
  const s = await getSettings();

  if ((await searchParams).edit === "1" && manage) {
    const led = staff ? [] : await ledGroupIds(user);
    const groupOptions = await db
      .select({ value: groups.id, label: groups.name })
      .from(groups)
      .where(staff ? undefined : inArray(groups.id, led))
      .orderBy(asc(groups.name));
    return (
      <>
        <PageHeader title={`Edit ${event.title}`} back={{ href: `/events/${id}`, label: "Back" }} />
        <EventForm event={event} groupOptions={groupOptions} groupRequired={!staff} timezone={s.timezone} />
        <Card title="Danger zone" className="mt-8 border-red-200">
          <ActionForm action={deleteEvent.bind(null, id)} className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-slate-600">Delete this event and its attendance records.</p>
            <SubmitButton variant="danger" confirm="Delete this event and its attendance?">
              Delete event
            </SubmitButton>
          </ActionForm>
        </Card>
      </>
    );
  }

  let sheet: React.ReactNode = null;
  if (canRecord) {
    const [people, presentRows] = await Promise.all([
      event.groupId
        ? db
            .select({ id: members.id, first: members.firstName, last: members.lastName, detail: groupMembers.role })
            .from(groupMembers)
            .innerJoin(members, eq(groupMembers.memberId, members.id))
            .where(eq(groupMembers.groupId, event.groupId))
            .orderBy(asc(members.lastName), asc(members.firstName))
        : db
            .select({ id: members.id, first: members.firstName, last: members.lastName, detail: members.phone })
            .from(members)
            .where(inArray(members.status, ["active", "visitor"]))
            .orderBy(asc(members.lastName), asc(members.firstName)),
      db.select({ id: attendance.memberId }).from(attendance).where(eq(attendance.eventId, id)),
    ]);
    const presentIds = presentRows.map((r) => r.id);
    // Include anyone already marked present who is no longer on the list (e.g. left the group).
    const listed = new Set(people.map((p) => p.id));
    const missing = presentIds.filter((pid) => !listed.has(pid));
    const extra = missing.length
      ? await db.select({ id: members.id, first: members.firstName, last: members.lastName }).from(members).where(inArray(members.id, missing))
      : [];

    sheet = (
      <Card title="Attendance register" bodyClassName="">
        <AttendanceSheet
          action={saveAttendance.bind(null, id)}
          people={[
            ...people.map((p) => ({ id: p.id, name: `${p.last}, ${p.first}`, detail: p.detail === "member" ? null : p.detail && humanize(p.detail) })),
            ...extra.map((p) => ({ id: p.id, name: `${p.last}, ${p.first}`, detail: "Not on current list" })),
          ]}
          initiallyPresent={presentIds}
          headcount={event.headcount}
          visitorCount={event.visitorCount}
        />
      </Card>
    );
  }

  return (
    <>
      <PageHeader
        title={event.title}
        back={{ href: "/events", label: "Events" }}
        actions={
          manage && (
            <Link href={`/events/${id}?edit=1`} className="btn-secondary">
              <Pencil className="size-4" /> Edit
            </Link>
          )
        }
      />
      <Card className="mb-6">
        <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-slate-700">
          <span className="flex items-center gap-2">
            <Clock className="size-4 text-brand-500" />
            {formatDateTime(event.startsAt, s)}
            {event.endsAt && ` – ${formatDateTime(event.endsAt, s, { weekday: undefined, day: undefined, month: undefined, year: undefined })}`}
          </span>
          {event.location && (
            <span className="flex items-center gap-2">
              <MapPin className="size-4 text-brand-500" /> {event.location}
            </span>
          )}
          {event.group && (
            <span className="flex items-center gap-2">
              <UsersRound className="size-4 text-brand-500" />
              <Link href={`/groups/${event.group.id}`} className="link font-normal">
                {event.group.name}
              </Link>
            </span>
          )}
          <Badge color="blue">{humanize(event.type)}</Badge>
        </div>
        {event.description && <p className="mt-4 text-sm whitespace-pre-wrap text-slate-600">{event.description}</p>}
      </Card>
      {sheet}
    </>
  );
}
