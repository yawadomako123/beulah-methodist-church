import { and, count, desc, eq, gte, lt, sql, sum } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { BarList, ColumnChart } from "@/components/charts";
import { PrintButton } from "@/components/print-button";
import { Card, PageHeader, Stat } from "@/components/ui";
import { db } from "@/db";
import { attendance, contributions, events, funds, members } from "@/db/schema";
import { formatDateTime, formatMoney, humanize, todayISO } from "@/lib/format";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Reports" };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const user = await requirePermission("reports:view");
  const s = await getSettings();
  const today = todayISO(s.timezone);
  const year = today.slice(0, 4);
  const showGiving = can(user.role, "giving:view");
  const showPeople = can(user.role, "members:view");
  const month = Math.min(12, Math.max(1, Number((await searchParams).month) || Number(today.slice(5, 7))));

  // First day of the month 11 months ago, for 12-month trends.
  const [ty, tm] = [Number(year), Number(today.slice(5, 7))];
  const startIdx = ty * 12 + (tm - 1) - 11;
  const trendStart = `${Math.floor(startIdx / 12)}-${String((startIdx % 12) + 1).padStart(2, "0")}-01`;
  const monthKeys = Array.from({ length: 12 }, (_, i) => {
    const idx = startIdx + i;
    return { key: `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, "0")}`, label: MONTHS[idx % 12] };
  });

  const [byStatus, byType, byGender, ageBands, services, monthly, fundYear, birthdays, newMembers] = await Promise.all([
    db.select({ k: members.status, n: count() }).from(members).groupBy(members.status),
    db.select({ k: members.membershipType, n: count() }).from(members).where(eq(members.status, "active")).groupBy(members.membershipType),
    db.select({ k: members.gender, n: count() }).from(members).where(eq(members.status, "active")).groupBy(members.gender),
    db
      .select({
        k: sql<string>`case
          when ${members.dateOfBirth} is null then 'Unknown'
          when age(${members.dateOfBirth}) < interval '13 years' then 'Children (0–12)'
          when age(${members.dateOfBirth}) < interval '18 years' then 'Teens (13–17)'
          when age(${members.dateOfBirth}) < interval '36 years' then 'Young adults (18–35)'
          when age(${members.dateOfBirth}) < interval '60 years' then 'Adults (36–59)'
          else 'Seniors (60+)' end`,
        n: count(),
      })
      .from(members)
      .where(eq(members.status, "active"))
      .groupBy(sql`1`),
    db
      .select({ id: events.id, title: events.title, startsAt: events.startsAt, headcount: events.headcount, present: count(attendance.memberId) })
      .from(events)
      .leftJoin(attendance, eq(attendance.eventId, events.id))
      .where(and(eq(events.type, "service"), lt(events.startsAt, new Date())))
      .groupBy(events.id)
      .orderBy(desc(events.startsAt))
      .limit(12),
    showGiving
      ? db
          .select({ k: sql<string>`to_char(${contributions.date}, 'YYYY-MM')`, total: sum(contributions.amount) })
          .from(contributions)
          .where(gte(contributions.date, trendStart))
          .groupBy(sql`1`)
      : Promise.resolve([]),
    showGiving
      ? db
          .select({ k: funds.name, total: sum(contributions.amount) })
          .from(contributions)
          .innerJoin(funds, eq(contributions.fundId, funds.id))
          .where(gte(contributions.date, `${year}-01-01`))
          .groupBy(funds.name)
          .orderBy(desc(sum(contributions.amount)))
      : Promise.resolve([]),
    showPeople
      ? db
          .select({ id: members.id, first: members.firstName, last: members.lastName, dob: members.dateOfBirth, wed: members.marriageDate })
          .from(members)
          .where(
            and(
              eq(members.status, "active"),
              sql`(extract(month from ${members.dateOfBirth}) = ${month} or extract(month from ${members.marriageDate}) = ${month})`,
            ),
          )
      : Promise.resolve([]),
    db.select({ n: count() }).from(members).where(gte(members.membershipDate, `${year}-01-01`)),
  ]);

  const activeTotal = byStatus.find((r) => r.k === "active")?.n ?? 0;
  const monthlyMap = new Map(monthly.map((m) => [m.k, Number(m.total)]));
  const avgAttendance = services.length ? Math.round(services.reduce((a, e) => a + (e.headcount ?? e.present), 0) / services.length) : 0;
  const bdays = birthdays
    .flatMap((b) => [
      b.dob && Number(b.dob.slice(5, 7)) === month ? { ...b, kind: "Birthday", day: Number(b.dob.slice(8, 10)), date: b.dob } : null,
      b.wed && Number(b.wed.slice(5, 7)) === month ? { ...b, kind: "Wedding anniversary", day: Number(b.wed.slice(8, 10)), date: b.wed } : null,
    ])
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.day - b.day);

  return (
    <>
      <PageHeader title="Reports" description="Membership, attendance and giving at a glance" actions={<PrintButton />} />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label="Active members" value={activeTotal} />
        <Stat label={`New members in ${year}`} value={newMembers[0]?.n ?? 0} />
        <Stat label="Avg. service attendance" value={avgAttendance} hint={`Last ${services.length} services`} />
        {showGiving && <Stat label={`Giving ${year} to date`} value={formatMoney(fundYear.reduce((a, f) => a + Number(f.total), 0), s)} />}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {showGiving && (
          <Card title="Giving per month (last 12 months)" className="lg:col-span-2">
            <ColumnChart
              caption="Total giving per month"
              data={monthKeys.map((m) => ({ label: m.label, value: monthlyMap.get(m.key) ?? 0, display: formatMoney(monthlyMap.get(m.key) ?? 0, s) }))}
            />
          </Card>
        )}

        <Card title="Service attendance (last 12 services)" className={showGiving ? "" : "lg:col-span-2"}>
          {services.length === 0 ? (
            <p className="text-sm text-slate-500">
              Record attendance on <Link href="/events" className="link">service events</Link> to see trends.
            </p>
          ) : (
            <ColumnChart
              caption="Attendance per service"
              data={[...services].reverse().map((e) => ({
                label: formatDateTime(e.startsAt, s, { weekday: undefined, year: undefined, hour: undefined, minute: undefined }),
                value: e.headcount ?? e.present,
              }))}
            />
          )}
        </Card>

        {showGiving && (
          <Card title={`Giving by fund, ${year}`}>
            {fundYear.length ? (
              <BarList caption="Giving by fund" data={fundYear.map((f) => ({ label: f.k, value: Number(f.total), display: formatMoney(f.total, s) }))} />
            ) : (
              <p className="text-sm text-slate-500">No giving recorded this year.</p>
            )}
          </Card>
        )}

        <Card title="Members by status">
          <BarList caption="Members by status" data={byStatus.map((r) => ({ label: humanize(r.k), value: r.n }))} />
        </Card>
        <Card title="Active members by membership type">
          <BarList caption="Active members by membership type" data={byType.map((r) => ({ label: humanize(r.k), value: r.n }))} />
        </Card>
        <Card title="Active members by age group">
          <BarList caption="Active members by age group" data={ageBands.sort((a, b) => a.k.localeCompare(b.k)).map((r) => ({ label: r.k, value: r.n }))} />
        </Card>
        <Card title="Active members by gender">
          <BarList caption="Active members by gender" data={byGender.map((r) => ({ label: r.k ? humanize(r.k) : "Not recorded", value: r.n }))} />
        </Card>

        {showPeople && (
          <Card
            title={`Birthdays & anniversaries in ${MONTHS[month - 1]}`}
            className="lg:col-span-2"
            actions={
              <form className="no-print flex gap-2">
                <select name="month" defaultValue={month} className="input py-1 text-xs" aria-label="Month">
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
                <button className="btn-secondary btn-sm">Show</button>
              </form>
            }
          >
            {bdays.length === 0 ? (
              <p className="text-sm text-slate-500">None this month.</p>
            ) : (
              <ul className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                {bdays.map((b) => (
                  <li key={`${b.id}-${b.kind}`} className="flex gap-3">
                    <span className="w-8 text-right font-semibold text-brand-700 tabular-nums">{b.day}</span>
                    <span>
                      <Link href={`/members/${b.id}`} className="link font-normal">
                        {b.first} {b.last}
                      </Link>
                      <span className="block text-xs text-slate-500">
                        {b.kind} · {Number(year) - Number(b.date.slice(0, 4))} yrs
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>
    </>
  );
}
