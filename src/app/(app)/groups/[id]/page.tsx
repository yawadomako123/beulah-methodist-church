import { and, asc, count, desc, eq, notInArray } from "drizzle-orm";
import { CalendarPlus, Pencil, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ActionForm, SelectField, SubmitButton } from "@/components/action-form";
import { Avatar, Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { db } from "@/db";
import { attendance, events, GROUP_ROLES, groupMembers, groups, members } from "@/db/schema";
import { formatDateTime, humanize } from "@/lib/format";
import { canManageGroup } from "@/lib/groups";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { addGroupMember, deleteGroup, removeGroupMember } from "../actions";
import { GroupForm } from "../group-form";

export const metadata: Metadata = { title: "Group" };

export default async function GroupPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ edit?: string }> }) {
  const user = await requirePermission("groups:view");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const manage = await canManageGroup(user, id);
  const staff = can(user.role, "groups:manage");
  if (!manage && user.role === "leader") redirect("/no-access");

  const group = await db.query.groups.findFirst({ where: eq(groups.id, id) });
  if (!group) notFound();

  if ((await searchParams).edit === "1" && staff) {
    return (
      <>
        <PageHeader title={`Edit ${group.name}`} back={{ href: `/groups/${id}`, label: "Back" }} />
        <GroupForm group={group} />
        <Card title="Danger zone" className="mt-8 border-red-200">
          <ActionForm action={deleteGroup.bind(null, id)} className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-slate-600">Delete this group and its roster. Its events are kept.</p>
            <SubmitButton variant="danger" confirm="Delete this group?">
              Delete group
            </SubmitButton>
          </ActionForm>
        </Card>
      </>
    );
  }

  const s = await getSettings();
  const [roster, groupEvents] = await Promise.all([
    db
      .select({
        id: members.id,
        firstName: members.firstName,
        lastName: members.lastName,
        phone: members.phone,
        photoUrl: members.photoUrl,
        role: groupMembers.role,
      })
      .from(groupMembers)
      .innerJoin(members, eq(groupMembers.memberId, members.id))
      .where(eq(groupMembers.groupId, id))
      .orderBy(asc(groupMembers.role), asc(members.lastName)),
    db
      .select({ id: events.id, title: events.title, startsAt: events.startsAt, present: count(attendance.memberId) })
      .from(events)
      .leftJoin(attendance, eq(attendance.eventId, events.id))
      .where(eq(events.groupId, id))
      .groupBy(events.id)
      .orderBy(desc(events.startsAt))
      .limit(10),
  ]);

  const candidates = manage
    ? (
        await db
          .select({ id: members.id, first: members.firstName, last: members.lastName })
          .from(members)
          .where(and(eq(members.status, "active"), roster.length ? notInArray(members.id, roster.map((r) => r.id)) : undefined))
          .orderBy(asc(members.lastName), asc(members.firstName))
      ).map((m) => ({ value: m.id, label: `${m.last}, ${m.first}` }))
    : [];

  const roleOptions = staff ? GROUP_ROLES : (["member"] as const);

  return (
    <>
      <PageHeader
        title={group.name}
        description={[
          humanize(group.type),
          group.meetingDay && `${group.meetingDay}${group.meetingTime ? ` at ${group.meetingTime}` : ""}`,
          group.location,
        ]
          .filter(Boolean)
          .join(" · ")}
        back={{ href: "/groups", label: "Groups" }}
        actions={
          <>
            {staff && (
              <Link href={`/groups/${id}?edit=1`} className="btn-secondary">
                <Pencil className="size-4" /> Edit
              </Link>
            )}
            {manage && (
              <Link href={`/events/new?group=${id}`} className="btn-primary">
                <CalendarPlus className="size-4" /> Record a meeting
              </Link>
            )}
          </>
        }
      />
      {group.description && <p className="-mt-2 mb-6 max-w-3xl text-sm text-slate-600">{group.description}</p>}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title={`Roster (${roster.length})`} className="lg:col-span-2" bodyClassName="">
          {roster.length === 0 ? (
            <EmptyState title="No members yet" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {roster.map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-5 py-2.5">
                  <Avatar name={`${m.firstName} ${m.lastName}`} src={m.photoUrl} size={34} />
                  <div className="flex-1 text-sm">
                    {can(user.role, "members:view") ? (
                      <Link href={`/members/${m.id}`} className="link">
                        {m.firstName} {m.lastName}
                      </Link>
                    ) : (
                      <span className="font-medium">
                        {m.firstName} {m.lastName}
                      </span>
                    )}
                    {m.phone && <span className="block text-xs text-slate-500">{m.phone}</span>}
                  </div>
                  {m.role !== "member" && <Badge color="purple">{humanize(m.role)}</Badge>}
                  {manage && (
                    <ActionForm action={removeGroupMember.bind(null, id, m.id)}>
                      <SubmitButton variant="ghost" size="sm" pendingText="…" confirm={`Remove ${m.firstName} from ${group.name}?`}>
                        <X className="size-4" />
                        <span className="sr-only">Remove</span>
                      </SubmitButton>
                    </ActionForm>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-6">
          {manage && (
            <Card title="Add to roster">
              <ActionForm action={addGroupMember.bind(null, id)} className="space-y-3">
                <SelectField label="Member" name="memberId" options={candidates} placeholder="Choose a member…" required />
                <SelectField label="Role" name="role" options={roleOptions} defaultValue="member" />
                <SubmitButton className="w-full">Add</SubmitButton>
              </ActionForm>
            </Card>
          )}
          <Card title="Recent meetings">
            {groupEvents.length === 0 ? (
              <p className="text-sm text-slate-500">No meetings recorded yet.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {groupEvents.map((e) => (
                  <li key={e.id} className="flex items-start justify-between gap-2">
                    <div>
                      <Link href={`/events/${e.id}`} className="link font-normal">
                        {e.title}
                      </Link>
                      <span className="block text-xs text-slate-500">{formatDateTime(e.startsAt, s)}</span>
                    </div>
                    <span className="text-xs whitespace-nowrap text-slate-600">
                      {e.present}/{roster.length} present
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
