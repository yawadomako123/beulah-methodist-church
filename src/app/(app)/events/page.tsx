import { and, asc, count, desc, eq, gte, inArray, isNull, lt, or } from "drizzle-orm";
import { CalendarDays, MapPin, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { db } from "@/db";
import { attendance, events, groups } from "@/db/schema";
import { formatDateTime, humanize } from "@/lib/format";
import { ledGroupIds, myGroupIds } from "@/lib/groups";
import { can } from "@/lib/permissions";
import { requireUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Events & attendance" };

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const user = await requireUser();
  const s = await getSettings();
  const view = (await searchParams).view === "past" ? "past" : "upcoming";
  const staff = can(user.role, "events:manage");
  const canSeeCounts = can(user.role, "attendance:record");
  const [led, mine] = await Promise.all([user.role === "leader" ? ledGroupIds(user) : [], myGroupIds(user)]);
  const now = new Date();

  const timeFilter = view === "upcoming" ? or(gte(events.startsAt, now), gte(events.endsAt, now)) : lt(events.startsAt, now);
  // Staff see everything; everyone else sees church-wide events plus those of their own groups.
  const visibility =
    staff || user.role === "treasurer" ? undefined : mine.length ? or(isNull(events.groupId), inArray(events.groupId, mine)) : isNull(events.groupId);

  const rows = await db
    .select({
      id: events.id,
      title: events.title,
      type: events.type,
      startsAt: events.startsAt,
      location: events.location,
      group: groups.name,
      headcount: events.headcount,
      present: count(attendance.memberId),
    })
    .from(events)
    .leftJoin(groups, eq(events.groupId, groups.id))
    .leftJoin(attendance, eq(attendance.eventId, events.id))
    .where(and(timeFilter, visibility))
    .groupBy(events.id, groups.name)
    .orderBy(view === "upcoming" ? asc(events.startsAt) : desc(events.startsAt))
    .limit(60);

  return (
    <>
      <PageHeader
        title="Events & attendance"
        description="Services, meetings and special programmes"
        actions={
          (staff || led.length > 0) && (
            <Link href="/events/new" className="btn-primary">
              <Plus className="size-4" /> New event
            </Link>
          )
        }
      />
      <div className="mb-4 inline-flex rounded-lg border border-slate-200 bg-white p-1 text-sm">
        {(["upcoming", "past"] as const).map((v) => (
          <Link
            key={v}
            href={`/events?view=${v}`}
            className={`rounded-md px-4 py-1.5 font-medium ${view === v ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
          >
            {v === "upcoming" ? "Upcoming" : "Past"}
          </Link>
        ))}
      </div>
      <Card bodyClassName="">
        {rows.length === 0 ? (
          <EmptyState title={view === "upcoming" ? "No upcoming events" : "No past events"} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((e) => (
              <li key={e.id}>
                <Link href={`/events/${e.id}`} className="flex flex-wrap items-center gap-4 px-5 py-4 hover:bg-slate-50">
                  <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                    <CalendarDays className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">{e.title}</p>
                    <p className="text-sm text-slate-500">
                      {formatDateTime(e.startsAt, s)}
                      {e.location && (
                        <>
                          {" · "}
                          <MapPin className="inline size-3.5" /> {e.location}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {e.group && <Badge color="purple">{e.group}</Badge>}
                    <Badge color="blue">{humanize(e.type)}</Badge>
                    {canSeeCounts && view === "past" && (
                      <span className="text-sm text-slate-600 tabular-nums">
                        {e.headcount ?? e.present} {e.headcount ? "attended" : "checked in"}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
