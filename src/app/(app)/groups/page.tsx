import { asc, count, eq, inArray } from "drizzle-orm";
import { Plus, UsersRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { db } from "@/db";
import { groupMembers, groups } from "@/db/schema";
import { humanize } from "@/lib/format";
import { ledGroupIds } from "@/lib/groups";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";

export const metadata: Metadata = { title: "Groups & classes" };

export default async function GroupsPage() {
  const user = await requirePermission("groups:view");
  const staff = can(user.role, "groups:manage") || user.role === "treasurer";
  const onlyIds = staff ? null : await ledGroupIds(user);

  const rows =
    onlyIds && onlyIds.length === 0
      ? []
      : await db
          .select({
            id: groups.id,
            name: groups.name,
            type: groups.type,
            meetingDay: groups.meetingDay,
            meetingTime: groups.meetingTime,
            active: groups.active,
            size: count(groupMembers.memberId),
          })
          .from(groups)
          .leftJoin(groupMembers, eq(groupMembers.groupId, groups.id))
          .where(onlyIds ? inArray(groups.id, onlyIds) : undefined)
          .groupBy(groups.id)
          .orderBy(asc(groups.type), asc(groups.name));

  const byType = rows.reduce<Record<string, typeof rows>>((acc, g) => ((acc[g.type] ??= []).push(g), acc), {});

  return (
    <>
      <PageHeader
        title="Groups & classes"
        description={staff ? "Class meetings, fellowships, choirs, Sunday school and committees" : "Groups you lead"}
        actions={
          can(user.role, "groups:manage") && (
            <Link href="/groups/new" className="btn-primary">
              <Plus className="size-4" /> New group
            </Link>
          )
        }
      />
      {rows.length === 0 ? (
        <Card>
          <EmptyState title={staff ? "No groups yet" : "You are not leading any groups"}>
            {staff ? "Create class meetings, fellowships and ministries to organise members." : "A staff member can make you a leader of a group."}
          </EmptyState>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(byType).map(([type, list]) => (
            <section key={type}>
              <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">{humanize(type)}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((g) => (
                  <Link key={g.id} href={`/groups/${g.id}`} className="card block p-5 transition hover:border-brand-200 hover:shadow">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold">{g.name}</h3>
                      {!g.active && <Badge color="amber">Inactive</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {g.meetingDay ? `${g.meetingDay}${g.meetingTime ? ` · ${g.meetingTime}` : ""}` : "No regular meeting time"}
                    </p>
                    <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-700">
                      <UsersRound className="size-4 text-brand-500" /> {g.size} {g.size === 1 ? "member" : "members"}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
