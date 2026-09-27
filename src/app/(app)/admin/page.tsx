import { count, eq, gte } from "drizzle-orm";
import {
  BarChart3,
  ChevronRight,
  Download,
  HandCoins,
  Mail,
  Megaphone,
  ScrollText,
  Settings,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, Stat } from "@/components/ui";
import { db } from "@/db";
import { auditLog, funds, groups, user as userTable } from "@/db/schema";
import { pendingCount } from "@/lib/admin";
import { requirePermission } from "@/lib/session";
import { PendingApprovals } from "./pending-approvals";

export const metadata: Metadata = { title: "Admin centre" };

export default async function AdminPage() {
  await requirePermission("users:manage");
  const since = new Date(Date.now() - 7 * 86400000);
  const [[users], [admins], [fundCount], [groupCount], [changes], pending] = await Promise.all([
    db.select({ n: count() }).from(userTable).where(eq(userTable.active, true)),
    db.select({ n: count() }).from(userTable).where(eq(userTable.role, "admin")),
    db.select({ n: count() }).from(funds).where(eq(funds.active, true)),
    db.select({ n: count() }).from(groups).where(eq(groups.active, true)),
    db.select({ n: count() }).from(auditLog).where(gte(auditLog.createdAt, since)),
    pendingCount(),
  ]);

  const tools = [
    { href: "/admin/users", icon: ShieldCheck, title: "Users & roles", text: `${users.n} active users · ${admins.n} admins. Change roles, link member records, deactivate.` },
    { href: "/admin/settings", icon: Settings, title: "Church settings", text: "Church name, contact details, currency, time zone." },
    { href: "/giving/funds", icon: HandCoins, title: "Giving funds", text: `${fundCount.n} active funds. Add funds for harvest, projects and appeals.` },
    { href: "/groups", icon: UsersRound, title: "Groups & classes", text: `${groupCount.n} active groups. Create classes and appoint leaders.` },
    { href: "/announcements", icon: Megaphone, title: "Announcements", text: "Post, pin and remove church notices." },
    { href: "/messages", icon: Mail, title: "Messages", text: "Email members, leaders or a group; copy phone lists." },
    { href: "/reports", icon: BarChart3, title: "Reports", text: "Membership, attendance and giving summaries." },
    { href: "/admin/audit", icon: ScrollText, title: "Audit log", text: `${changes.n} changes in the last 7 days. See who changed what.` },
  ];

  return (
    <>
      <PageHeader title="Admin centre" description="Approve new users and manage the whole system from here" />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label="Waiting for approval" value={pending} />
        <Stat label="Active users" value={users.n} />
        <Stat label="Administrators" value={admins.n} />
        <Stat label="Changes this week" value={changes.n} />
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <PendingApprovals />
        </div>

        <section className="xl:col-span-2">
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">Admin tools</h2>
          <ul className="card divide-y divide-slate-100">
            {tools.map((t) => (
              <li key={t.href}>
                <Link href={t.href} className="flex items-center gap-4 px-4 py-3.5 hover:bg-slate-50 sm:px-5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                    <t.icon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-slate-900">{t.title}</span>
                    <span className="block text-sm text-slate-500">{t.text}</span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-slate-400" />
                </Link>
              </li>
            ))}
          </ul>

          <h2 className="mt-6 mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">Backups</h2>
          <div className="card flex flex-wrap gap-2 p-4">
            <a href="/members/export" className="btn-secondary">
              <Download className="size-4" /> Members CSV
            </a>
            <a href="/giving/export?from=2000-01-01" className="btn-secondary">
              <Download className="size-4" /> All giving CSV
            </a>
          </div>
        </section>
      </div>
    </>
  );
}
