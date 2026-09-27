import { and, desc, eq, gte, ne, sum } from "drizzle-orm";
import { Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, Badge, Card, PageHeader, statusColor } from "@/components/ui";
import { db } from "@/db";
import { attendance, contributions, events, funds, groupMembers, groups, members, user as userTable } from "@/db/schema";
import { age, formatDate, formatDateTime, formatMoney, fullName, humanize, todayISO } from "@/lib/format";
import { can, ROLE_LABELS } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Member" };

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-900">{children || "—"}</dd>
    </div>
  );
}

export default async function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("members:view");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const s = await getSettings();
  const today = todayISO(s.timezone);
  const yearStart = `${today.slice(0, 4)}-01-01`;
  const showGiving = can(user.role, "giving:view");

  const member = await db.query.members.findFirst({ where: eq(members.id, id), with: { household: true } });
  if (!member) notFound();

  const [householdMembers, memberGroups, recentAttendance, account, givingYear, recentGifts] = await Promise.all([
    member.householdId
      ? db.query.members.findMany({ where: and(eq(members.householdId, member.householdId), ne(members.id, id)) })
      : Promise.resolve([]),
    db
      .select({ id: groups.id, name: groups.name, type: groups.type, role: groupMembers.role })
      .from(groupMembers)
      .innerJoin(groups, eq(groupMembers.groupId, groups.id))
      .where(eq(groupMembers.memberId, id)),
    db
      .select({ id: events.id, title: events.title, startsAt: events.startsAt })
      .from(attendance)
      .innerJoin(events, eq(attendance.eventId, events.id))
      .where(eq(attendance.memberId, id))
      .orderBy(desc(events.startsAt))
      .limit(8),
    db.query.user.findFirst({ where: eq(userTable.memberId, id), columns: { email: true, role: true, active: true } }),
    showGiving
      ? db
          .select({ total: sum(contributions.amount) })
          .from(contributions)
          .where(and(eq(contributions.memberId, id), gte(contributions.date, yearStart)))
      : Promise.resolve([{ total: null }]),
    showGiving
      ? db
          .select({ id: contributions.id, date: contributions.date, amount: contributions.amount, fund: funds.name })
          .from(contributions)
          .innerJoin(funds, eq(contributions.fundId, funds.id))
          .where(eq(contributions.memberId, id))
          .orderBy(desc(contributions.date))
          .limit(6)
      : Promise.resolve([]),
  ]);

  const name = fullName(member);
  const years = age(member.dateOfBirth, today);

  return (
    <>
      <PageHeader
        back={{ href: "/members", label: "Members" }}
        title={
          <span className="flex items-center gap-4">
            <Avatar name={`${member.firstName} ${member.lastName}`} src={member.photoUrl} size={56} />
            <span>
              {name}
              <span className="mt-1 flex gap-2">
                <Badge color={statusColor(member.status)}>{humanize(member.status)}</Badge>
                <Badge color="blue">{humanize(member.membershipType)}</Badge>
              </span>
            </span>
          </span>
        }
        actions={
          can(user.role, "members:edit") && (
            <Link href={`/members/${id}/edit`} className="btn-secondary">
              <Pencil className="size-4" /> Edit
            </Link>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Details">
            <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <Detail label="Phone">{[member.phone, member.altPhone].filter(Boolean).join(" / ")}</Detail>
              <Detail label="Email">{member.email}</Detail>
              <Detail label="Address">{member.address}</Detail>
              <Detail label="Gender">{member.gender && humanize(member.gender)}</Detail>
              <Detail label="Date of birth">
                {member.dateOfBirth && `${formatDate(member.dateOfBirth, s)}${years !== null ? ` (${years})` : ""}`}
              </Detail>
              <Detail label="Marital status">{member.maritalStatus && humanize(member.maritalStatus)}</Detail>
              <Detail label="Occupation">{member.occupation}</Detail>
              <Detail label="Hometown">{member.hometown}</Detail>
              <Detail label="Emergency contact">{member.emergencyContact}</Detail>
            </dl>
          </Card>

          <Card title="Church journey">
            <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <Detail label="Joined">{member.membershipDate && formatDate(member.membershipDate, s)}</Detail>
              <Detail label="Baptised">{member.baptismDate && formatDate(member.baptismDate, s)}</Detail>
              <Detail label="Confirmed">{member.confirmationDate && formatDate(member.confirmationDate, s)}</Detail>
              <Detail label="Married">{member.marriageDate && formatDate(member.marriageDate, s)}</Detail>
            </dl>
          </Card>

          {showGiving && (
            <Card
              title="Giving"
              actions={
                <Link href={`/giving/statement/${id}`} className="link text-sm">
                  Giving statement
                </Link>
              }
            >
              <p className="text-sm text-slate-500">
                This year: <strong className="text-slate-900">{formatMoney(givingYear[0]?.total ?? 0, s)}</strong>
              </p>
              {recentGifts.length > 0 && (
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
              )}
            </Card>
          )}

          {member.notes && (
            <Card title="Notes">
              <p className="text-sm whitespace-pre-wrap text-slate-700">{member.notes}</p>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card title="Household">
            {member.household ? (
              <>
                <Link href={`/households/${member.household.id}`} className="link">
                  {member.household.name}
                </Link>
                {member.householdRole && <span className="text-sm text-slate-500"> · {humanize(member.householdRole)}</span>}
                <ul className="mt-3 space-y-2">
                  {householdMembers.map((h) => (
                    <li key={h.id} className="flex items-center gap-2 text-sm">
                      <Avatar name={`${h.firstName} ${h.lastName}`} src={h.photoUrl} size={28} />
                      <Link href={`/members/${h.id}`} className="link font-normal">
                        {h.firstName} {h.lastName}
                      </Link>
                      <span className="text-slate-500">{h.householdRole && humanize(h.householdRole)}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-sm text-slate-500">Not linked to a household.</p>
            )}
          </Card>

          <Card title="Groups & classes">
            {memberGroups.length ? (
              <ul className="space-y-2 text-sm">
                {memberGroups.map((g) => (
                  <li key={g.id} className="flex items-center justify-between gap-2">
                    <Link href={`/groups/${g.id}`} className="link font-normal">
                      {g.name}
                    </Link>
                    {g.role !== "member" && <Badge color="purple">{humanize(g.role)}</Badge>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">Not in any groups yet.</p>
            )}
          </Card>

          <Card title="Recent attendance">
            {recentAttendance.length ? (
              <ul className="space-y-2 text-sm">
                {recentAttendance.map((a) => (
                  <li key={a.id}>
                    <Link href={`/events/${a.id}`} className="link font-normal">
                      {a.title}
                    </Link>
                    <span className="block text-xs text-slate-500">{formatDateTime(a.startsAt, s)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No attendance recorded.</p>
            )}
          </Card>

          <Card title="System account">
            {account ? (
              <p className="text-sm">
                Signs in as <strong>{account.email}</strong>
                <br />
                <span className="text-slate-500">
                  {ROLE_LABELS[account.role]} · {account.active ? "Active" : "Awaiting approval"}
                </span>
              </p>
            ) : (
              <p className="text-sm text-slate-500">
                No login yet. {member.email ? "They can sign in with Google using their email on file." : "Add an email so they can sign in."}
              </p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
