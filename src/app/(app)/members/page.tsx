import { and, asc, count, eq, ilike, or, type SQL } from "drizzle-orm";
import { Download, Plus, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Avatar, Badge, Card, EmptyState, PageHeader, Pagination, Select, statusColor } from "@/components/ui";
import { db } from "@/db";
import { households, MEMBER_STATUSES, members, MEMBERSHIP_TYPES } from "@/db/schema";
import { fullName, humanize } from "@/lib/format";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";

export const metadata: Metadata = { title: "Members" };

const PAGE_SIZE = 25;

export default async function MembersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requirePermission("members:view");
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const status = MEMBER_STATUSES.includes(sp.status as never) ? (sp.status as (typeof MEMBER_STATUSES)[number]) : undefined;
  const type = MEMBERSHIP_TYPES.includes(sp.type as never) ? (sp.type as (typeof MEMBERSHIP_TYPES)[number]) : undefined;
  const page = Math.max(1, Number(sp.page) || 1);

  const filters: SQL[] = [];
  if (q) {
    const like = `%${q}%`;
    filters.push(
      or(ilike(members.firstName, like), ilike(members.lastName, like), ilike(members.otherNames, like), ilike(members.phone, like), ilike(members.email, like))!,
    );
  }
  if (status) filters.push(eq(members.status, status));
  if (type) filters.push(eq(members.membershipType, type));
  const where = filters.length ? and(...filters) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: members.id,
        title: members.title,
        firstName: members.firstName,
        lastName: members.lastName,
        otherNames: members.otherNames,
        phone: members.phone,
        email: members.email,
        status: members.status,
        membershipType: members.membershipType,
        photoUrl: members.photoUrl,
        household: households.name,
        householdId: households.id,
      })
      .from(members)
      .leftJoin(households, eq(members.householdId, households.id))
      .where(where)
      .orderBy(asc(members.lastName), asc(members.firstName))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(members).where(where),
  ]);

  const params = new URLSearchParams(Object.entries({ q, status, type }).filter(([, v]) => v) as [string, string][]);
  const makeHref = (p: number) => `/members?${new URLSearchParams({ ...Object.fromEntries(params), page: String(p) })}`;

  return (
    <>
      <PageHeader
        title="Members"
        description={`${total} ${total === 1 ? "person" : "people"}${where ? " match your filters" : " on the register"}`}
        actions={
          <>
            <a href={`/members/export?${params}`} className="btn-secondary">
              <Download className="size-4" /> Export CSV
            </a>
            {can(user.role, "members:edit") && (
              <Link href="/members/new" className="btn-primary">
                <Plus className="size-4" /> Add member
              </Link>
            )}
          </>
        }
      />

      <Card bodyClassName="">
        <form className="no-print flex flex-wrap gap-3 border-b border-slate-100 p-4" role="search">
          <div className="relative w-full sm:w-auto sm:min-w-60 sm:flex-1">
            <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-slate-400" />
            <input name="q" defaultValue={q} placeholder="Search name, phone or email" aria-label="Search members" className="input pl-9" />
          </div>
          <div className="w-full sm:w-40">
            <Select name="status" aria-label="Status" options={MEMBER_STATUSES} placeholder="All statuses" defaultValue={status ?? ""} />
          </div>
          <div className="w-full sm:w-44">
            <Select name="type" aria-label="Membership type" options={MEMBERSHIP_TYPES} placeholder="All types" defaultValue={type ?? ""} />
          </div>
          <button className="btn-secondary">Filter</button>
          {where && (
            <Link href="/members" className="btn-ghost">
              Clear
            </Link>
          )}
        </form>

        {rows.length === 0 ? (
          <EmptyState title={where ? "No members match" : "No members yet"}>
            {where ? "Try a different search or clear the filters." : "Add your first member to start building the church register."}
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th className="hidden md:table-cell">Phone</th>
                  <th className="hidden lg:table-cell">Household</th>
                  <th>Type</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <Link href={`/members/${m.id}`} className="flex items-center gap-3">
                        <Avatar name={`${m.firstName} ${m.lastName}`} src={m.photoUrl} size={36} />
                        <span>
                          <span className="link block">{fullName(m)}</span>
                          {m.email && <span className="text-xs text-slate-500">{m.email}</span>}
                        </span>
                      </Link>
                    </td>
                    <td className="hidden md:table-cell">{m.phone ?? "—"}</td>
                    <td className="hidden lg:table-cell">
                      {m.householdId ? (
                        <Link href={`/households/${m.householdId}`} className="link font-normal">
                          {m.household}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{humanize(m.membershipType)}</td>
                    <td>
                      <Badge color={statusColor(m.status)}>{humanize(m.status)}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} makeHref={makeHref} />
      </Card>
    </>
  );
}
