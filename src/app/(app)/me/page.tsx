import { and, desc, eq, gte, sum } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, SubmitButton, TextField } from "@/components/action-form";
import { Avatar, Badge, Card, PageHeader } from "@/components/ui";
import { db } from "@/db";
import { attendance, contributions, events, funds, groupMembers, groups, members } from "@/db/schema";
import { formatDate, formatDateTime, formatMoney, fullName, humanize, todayISO } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/permissions";
import { requireUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { updateMyContact } from "./actions";

export const metadata: Metadata = { title: "My profile" };

export default async function MePage() {
  const user = await requireUser();
  const s = await getSettings();
  const today = todayISO(s.timezone);

  const member = user.memberId ? await db.query.members.findFirst({ where: eq(members.id, user.memberId), with: { household: true } }) : undefined;

  if (!member) {
    return (
      <>
        <PageHeader title="My profile" />
        <Card>
          <div className="flex items-center gap-4">
            <Avatar name={user.name} src={user.image} size={56} />
            <div>
              <p className="font-medium">{user.name}</p>
              <p className="text-sm text-slate-500">
                {user.email} · {ROLE_LABELS[user.role]}
              </p>
            </div>
          </div>
          <p className="mt-6 text-sm text-slate-600">
            Your login is not yet linked to a record on the church register. Please ask the church office to link your account so you can see your
            groups, attendance and giving history.
          </p>
        </Card>
      </>
    );
  }

  const [myGroups, myAttendance, givingYear, recentGifts] = await Promise.all([
    db
      .select({ id: groups.id, name: groups.name, role: groupMembers.role, day: groups.meetingDay, time: groups.meetingTime })
      .from(groupMembers)
      .innerJoin(groups, eq(groupMembers.groupId, groups.id))
      .where(eq(groupMembers.memberId, member.id)),
    db
      .select({ id: events.id, title: events.title, startsAt: events.startsAt })
      .from(attendance)
      .innerJoin(events, eq(attendance.eventId, events.id))
      .where(eq(attendance.memberId, member.id))
      .orderBy(desc(events.startsAt))
      .limit(5),
    db
      .select({ total: sum(contributions.amount) })
      .from(contributions)
      .where(and(eq(contributions.memberId, member.id), gte(contributions.date, `${today.slice(0, 4)}-01-01`))),
    db
      .select({ id: contributions.id, date: contributions.date, amount: contributions.amount, fund: funds.name })
      .from(contributions)
      .innerJoin(funds, eq(contributions.fundId, funds.id))
      .where(eq(contributions.memberId, member.id))
      .orderBy(desc(contributions.date))
      .limit(8),
  ]);

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-4">
            <Avatar name={`${member.firstName} ${member.lastName}`} src={member.photoUrl ?? user.image} size={56} />
            <span>
              {fullName(member)}
              <span className="mt-1 flex gap-2">
                <Badge color="blue">{humanize(member.membershipType)}</Badge>
                <Badge color="gray">{ROLE_LABELS[user.role]}</Badge>
              </span>
            </span>
          </span>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="My contact details">
            <ActionForm action={updateMyContact} className="grid gap-4 sm:grid-cols-2">
              <TextField label="Phone" name="phone" type="tel" defaultValue={member.phone ?? ""} />
              <TextField label="Alternative phone" name="altPhone" type="tel" defaultValue={member.altPhone ?? ""} />
              <TextField label="Address" name="address" defaultValue={member.address ?? ""} className="sm:col-span-2" />
              <TextField label="Occupation" name="occupation" defaultValue={member.occupation ?? ""} />
              <TextField label="Emergency contact" name="emergencyContact" defaultValue={member.emergencyContact ?? ""} />
              <p className="text-xs text-slate-500 sm:col-span-2">
                Email: {member.email ?? "none"}. To change your email, name or church records, contact the church office.
              </p>
              <div className="sm:col-span-2 flex justify-end">
                <SubmitButton>Update my details</SubmitButton>
              </div>
            </ActionForm>
          </Card>

          <Card
            title="My giving"
            actions={
              <Link href={`/giving/statement/${member.id}`} className="link text-sm">
                Download statement
              </Link>
            }
          >
            <p className="text-sm text-slate-500">
              This year: <strong className="text-slate-900">{formatMoney(givingYear[0]?.total ?? 0, s)}</strong>
            </p>
            {recentGifts.length > 0 ? (
              <ul className="mt-3 divide-y divide-slate-100 text-sm">
                {recentGifts.map((g) => (
                  <li key={g.id} className="flex justify-between py-2">
                    <span>
                      {formatDate(g.date, s)} · {g.fund}
                    </span>
                    <span className="tabular-nums">{formatMoney(g.amount, s)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-500">No recorded gifts yet.</p>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="My groups & classes">
            {myGroups.length === 0 ? (
              <p className="text-sm text-slate-500">You are not in any groups yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {myGroups.map((g) => (
                  <li key={g.id}>
                    <span className="font-medium">{g.name}</span> {g.role !== "member" && <Badge color="purple">{humanize(g.role)}</Badge>}
                    {g.day && <span className="block text-xs text-slate-500">{`${g.day}${g.time ? ` · ${g.time}` : ""}`}</span>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="My recent attendance">
            {myAttendance.length === 0 ? (
              <p className="text-sm text-slate-500">No attendance recorded yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {myAttendance.map((a) => (
                  <li key={a.id}>
                    {a.title}
                    <span className="block text-xs text-slate-500">{formatDateTime(a.startsAt, s)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {member.household && (
            <Card title="Household">
              <p className="text-sm">{member.household.name}</p>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
