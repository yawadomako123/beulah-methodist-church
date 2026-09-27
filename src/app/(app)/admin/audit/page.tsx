import { count, desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { Card, EmptyState, PageHeader, Pagination } from "@/components/ui";
import { db } from "@/db";
import { auditLog, user as userTable } from "@/db/schema";
import { formatDateTime, humanize } from "@/lib/format";
import { requirePermission } from "@/lib/session";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Audit log" };
const PAGE_SIZE = 50;

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requirePermission("audit:view");
  const s = await getSettings();
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({ a: auditLog, name: userTable.name, email: userTable.email })
      .from(auditLog)
      .leftJoin(userTable, eq(auditLog.userId, userTable.id))
      .orderBy(desc(auditLog.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(auditLog),
  ]);

  return (
    <>
      <PageHeader title="Audit log" description="Every change made in the system, and who made it" />
      <Card bodyClassName="">
        {rows.length === 0 ? (
          <EmptyState title="No activity yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Who</th>
                  <th>Action</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ a, name, email }) => (
                  <tr key={a.id}>
                    <td className="text-xs whitespace-nowrap">{formatDateTime(a.createdAt, s)}</td>
                    <td className="text-sm">
                      {name ?? "System"}
                      {email && <span className="block text-xs text-slate-500">{email}</span>}
                    </td>
                    <td className="text-sm whitespace-nowrap">
                      {humanize(a.action)} {a.entity.replace(/_/g, " ")}
                      {a.entityId && <span className="text-slate-400"> #{a.entityId.slice(0, 8)}</span>}
                    </td>
                    <td className="max-w-md truncate font-mono text-xs text-slate-500" title={a.details ? JSON.stringify(a.details) : undefined}>
                      {a.details ? JSON.stringify(a.details) : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} makeHref={(p) => `/admin/audit?page=${p}`} />
      </Card>
    </>
  );
}
