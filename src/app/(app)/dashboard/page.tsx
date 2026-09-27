import { and, asc, count, desc, eq, gte, inArray, isNull, lt, or, sql, sum } from "drizzle-orm";
import { CalendarDays, Cake, HandCoins, Home, Pin, UserCheck, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Card, EmptyState, PageHeader, Stat } from "@/components/ui";
import { db } from "@/db";
import { attendance, contributions, events, households, members, user as userTable } from "@/db/schema";
import { visibleAnnouncements } from "@/lib/announcements";
import { formatDateTime, formatMoney, todayISO } from "@/lib/format";
import { myGroupIds } from "@/lib/groups";
import { can } from "@/lib/permissions";
import { requireUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Dashboard" };

function greeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const user = await requireUser();
  const s = await getSettings();
  const today = todayISO(s.timezone);
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: s.timezone }).format(new Date()));
  const people = can(user.role, "members:view");
  const giving = can(user.role, "giving:view");
  const staffEvents = can(user.role, "events:manage") || user.role === "treasurer";
  const mine = await myGroupIds(user);
  const now = new Date();

  const [stats, givingStats, lastService, upcoming, news, birthdays, pendingUsers] = await Promise.all([
    people
      ? Promise.all([
          db.select({ n: count() }).from(members).where(eq(members.status, "active")),
          db.select({ n: count() }).from(households),
          db.select({ n: count() }).from(members).where(eq(members.status, "visitor")),
        ]).then(([[a], [h], [v]]) => ({ active: a.n, households: h.n, visitors: v.n }))
      : null,
    giving
      ? Promise.all([
          db.select({ t: sum(contributions.amount) }).from(contributions).where(gte(contributions.date, `${today.slice(0, 7)}-01`)),
          db.select({ t: sum(contributions.amount) }).from(contributions).where(gte(contributions.date, `${today.slice(0, 4)}-01-01`)),
        ]).then(([[m], [y]]) => ({ month: m.t ?? 0, year: y.t ?? 0 }))
      : null,
    people
      ? db
          .select({ id: events.id, title: events.title, startsAt: events.startsAt, headcount: events.headcount, present: count(attendance.memberId) })
          .from(events)
          .leftJoin(attendance, eq(attendance.eventId, events.id))
          .where(and(eq(events.type, "service"), lt(events.startsAt, now)))
          .groupBy(events.id)
          .orderBy(desc(events.startsAt))
          .limit(1)
          .then((r) => r[0])
      : undefined,
    db
      .select({ id: events.id, title: events.title, startsAt: events.startsAt, location: events.location })
      .from(events)
      .where(
        and(
          gte(events.startsAt, now),
          staffEvents ? undefined : mine.length ? or(isNull(events.groupId), inArray(events.groupId, mine)) : isNull(events.groupId),
        ),
      )
      .orderBy(asc(events.startsAt))
      .limit(5),
    visibleAnnouncements(user.role, today, 3),
    people
      ? db
          .select({ id: members.id, first: members.firstName, last: members.lastName, dob: members.dateOfBirth })
          .from(members)
          .where(
            and(
              eq(members.status, "active"),
              // Handles the week that wraps from December into January.
              sql`(case when to_char(${today}::date + 7, 'MM-DD') >= to_char(${today}::date, 'MM-DD')
                then to_char(${members.dateOfBirth}, 'MM-DD') between to_char(${today}::date, 'MM-DD') and to_char(${today}::date + 7, 'MM-DD')
                else to_char(${members.dateOfBirth}, 'MM-DD') >= to_char(${today}::date, 'MM-DD')
                  or to_char(${members.dateOfBirth}, 'MM-DD') <= to_char(${today}::date + 7, 'MM-DD') end)`,
            ),
          )
          .orderBy(sql`(${members.dateOfBirth} + (extract(year from age(${today}::date, ${members.dateOfBirth})) + 1) * interval '1 year')`)
      : [],
    can(user.role, "users:manage") ? db.select({ n: count() }).from(userTable).where(eq(userTable.active, false)).then((r) => r[0].n) : 0,
  ]);

  return (
    <>
      <PageHeader title={`${greeting(hour)}, ${user.name.split(" ")[0]}`} description={`Welcome to ${s.churchName}`} />

      {pendingUsers > 0 && (
        <Link href="/admin/users" className="mb-6 flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-5 py-3 text-sm text-amber-900 hover:bg-amber-100">
          <UserCheck className="size-5" />
          {pendingUsers} {pendingUsers === 1 ? "person is" : "people are"} waiting for account approval. Review now →
        </Link>
      )}

      {(stats || givingStats) && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {stats && (
            <>
              <Stat label="Active members" value={stats.active} icon={<Users className="size-5" />} hint={`${stats.visitors} visitors on record`} />
              <Stat label="Households" value={stats.households} icon={<Home className="size-5" />} />
              <Stat
                label="Last service"
                value={lastService ? (lastService.headcount ?? lastService.present) : "—"}
                icon={<CalendarDays className="size-5" />}
                hint={lastService ? formatDateTime(lastService.startsAt, s, { hour: undefined, minute: undefined }) : "No attendance recorded"}
              />
            </>
          )}
          {givingStats && (
            <Stat
              label="Giving this month"
              value={formatMoney(givingStats.month, s)}
              icon={<HandCoins className="size-5" />}
              hint={`${formatMoney(givingStats.year, s)} this year`}
            />
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card
          title="Announcements"
          className="lg:col-span-2"
          actions={
            <Link href="/announcements" className="link text-sm">
              All
            </Link>
          }
        >
          {news.length === 0 ? (
            <EmptyState title="No announcements" />
          ) : (
            <ul className="space-y-5">
              {news.map((a) => (
                <li key={a.id}>
                  <p className="font-medium">
                    {a.pinned && <Pin className="mr-1 inline size-3.5 text-brand-600" />}
                    {a.title}
                  </p>
                  <p className="mt-1 line-clamp-3 text-sm whitespace-pre-wrap text-slate-600">{a.body}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-6">
          <Card
            title="Coming up"
            actions={
              <Link href="/events" className="link text-sm">
                Calendar
              </Link>
            }
          >
            {upcoming.length === 0 ? (
              <p className="text-sm text-slate-500">Nothing scheduled.</p>
            ) : (
              <ul className="space-y-3">
                {upcoming.map((e) => (
                  <li key={e.id}>
                    <Link href={`/events/${e.id}`} className="link font-normal">
                      {e.title}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {formatDateTime(e.startsAt, s)}
                      {e.location && ` · ${e.location}`}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {people && (
            <Card title="Birthdays this week">
              {birthdays.length === 0 ? (
                <p className="text-sm text-slate-500">No birthdays in the next 7 days.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {birthdays.map((b) => (
                    <li key={b.id} className="flex items-center gap-2">
                      <Cake className="size-4 text-accent-500" />
                      <Link href={`/members/${b.id}`} className="link font-normal">
                        {b.first} {b.last}
                      </Link>
                      <span className="ml-auto text-xs text-slate-500">
                        {b.dob && new Intl.DateTimeFormat(s.locale, { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${b.dob}T00:00:00Z`))}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {!people && (
            <Card title="Quick links">
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/me" className="link">
                    My profile & giving
                  </Link>
                </li>
                <li>
                  <Link href="/events" className="link">
                    Church calendar
                  </Link>
                </li>
                {user.role === "leader" && (
                  <li>
                    <Link href="/groups" className="link">
                      My groups
                    </Link>
                  </li>
                )}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
