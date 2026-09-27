import { asc, count, eq, ilike } from "drizzle-orm";
import { Plus, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Card, EmptyState, PageHeader, Pagination } from "@/components/ui";
import { db } from "@/db";
import { households, members } from "@/db/schema";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";

export const metadata: Metadata = { title: "Households" };
const PAGE_SIZE = 30;

export default async function HouseholdsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const user = await requirePermission("members:view");
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const page = Math.max(1, Number(sp.page) || 1);
  const where = q ? ilike(households.name, `%${q}%`) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({ id: households.id, name: households.name, city: households.city, phone: households.phone, size: count(members.id) })
      .from(households)
      .leftJoin(members, eq(members.householdId, households.id))
      .where(where)
      .groupBy(households.id)
      .orderBy(asc(households.name))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(households).where(where),
  ]);

  return (
    <>
      <PageHeader
        title="Households"
        description={`${total} households`}
        actions={
          can(user.role, "members:edit") && (
            <Link href="/households/new" className="btn-primary">
              <Plus className="size-4" /> New household
            </Link>
          )
        }
      />
      <Card bodyClassName="">
        <form className="flex gap-3 border-b border-slate-100 p-4" role="search">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-slate-400" />
            <input name="q" defaultValue={q} placeholder="Search households" aria-label="Search households" className="input pl-9" />
          </div>
          <button className="btn-secondary">Search</button>
        </form>
        {rows.length === 0 ? (
          <EmptyState title="No households found">Households group family members who live together.</EmptyState>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Household</th>
                <th className="hidden sm:table-cell">Town</th>
                <th className="hidden sm:table-cell">Phone</th>
                <th className="text-right">Members</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((h) => (
                <tr key={h.id}>
                  <td>
                    <Link href={`/households/${h.id}`} className="link">
                      {h.name}
                    </Link>
                  </td>
                  <td className="hidden sm:table-cell">{h.city ?? "—"}</td>
                  <td className="hidden sm:table-cell">{h.phone ?? "—"}</td>
                  <td className="text-right tabular-nums">{h.size}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} makeHref={(p) => `/households?${new URLSearchParams({ q, page: String(p) })}`} />
      </Card>
    </>
  );
}
