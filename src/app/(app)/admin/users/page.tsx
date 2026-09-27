import { and, asc, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, CheckboxField, SelectField, SubmitButton } from "@/components/action-form";
import { Avatar, Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { db } from "@/db";
import { members, ROLES, user as userTable, type Role } from "@/db/schema";
import { linkableMembers } from "@/lib/admin";
import { formatDateTime } from "@/lib/format";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { updateUser } from "../actions";
import { PendingApprovals } from "../pending-approvals";

export const metadata: Metadata = { title: "Users & roles" };

type Tab = "pending" | "active" | "all";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string; role?: string }> }) {
  const me = await requirePermission("users:manage");
  const s = await getSettings();
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const roleFilter = ROLES.includes(sp.role as Role) ? (sp.role as Role) : undefined;

  const [[{ pending }], [{ active }]] = await Promise.all([
    db.select({ pending: count() }).from(userTable).where(eq(userTable.active, false)),
    db.select({ active: count() }).from(userTable).where(eq(userTable.active, true)),
  ]);
  const tab: Tab = sp.tab === "active" || sp.tab === "all" || sp.tab === "pending" ? sp.tab : pending > 0 ? "pending" : "active";

  const filters: SQL[] = [];
  if (tab === "active") filters.push(eq(userTable.active, true));
  if (q) filters.push(or(ilike(userTable.name, `%${q}%`), ilike(userTable.email, `%${q}%`))!);
  if (roleFilter) filters.push(eq(userTable.role, roleFilter));

  const users =
    tab === "pending"
      ? []
      : await db
          .select({ u: userTable, first: members.firstName, last: members.lastName })
          .from(userTable)
          .leftJoin(members, eq(userTable.memberId, members.id))
          .where(filters.length ? and(...filters) : undefined)
          .orderBy(desc(userTable.active), asc(userTable.name));
  const { options: freeMembers } = tab === "pending" ? { options: [] } : await linkableMembers([]);
  const roleOptions = ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }));

  const tabs: { key: Tab; label: string; n?: number }[] = [
    { key: "pending", label: "Waiting", n: pending },
    { key: "active", label: "Active", n: active },
    { key: "all", label: "All" },
  ];

  return (
    <>
      <PageHeader
        title="Users & roles"
        description="Everyone signs in with Google. Approve them, choose what they can do, and link them to their member record."
        back={{ href: "/admin", label: "Admin centre" }}
      />

      <nav className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200" aria-label="User lists">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/admin/users?tab=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium whitespace-nowrap ${
              tab === t.key ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
            {t.n !== undefined && (
              <span
                className={`rounded-full px-1.5 text-xs ${t.key === "pending" && t.n > 0 ? "bg-accent-500 text-white" : "bg-slate-100 text-slate-600"}`}
              >
                {t.n}
              </span>
            )}
          </Link>
        ))}
      </nav>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-3 xl:col-span-2">
          {tab === "pending" ? (
            <>
              <PendingApprovals />
              <p className="text-xs text-slate-500">
                Deactivated accounts also appear here. Approve them again to restore access.
              </p>
            </>
          ) : (
            <>
              <form className="flex flex-wrap gap-2" role="search">
                <input type="hidden" name="tab" value={tab} />
                <div className="relative w-full sm:w-auto sm:flex-1">
                  <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-slate-400" />
                  <input name="q" defaultValue={q} placeholder="Search name or email" aria-label="Search users" className="input pl-9" />
                </div>
                <select name="role" defaultValue={roleFilter ?? ""} aria-label="Role" className="input w-auto flex-1 sm:flex-none">
                  <option value="">All roles</option>
                  {roleOptions.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <button className="btn-secondary">Filter</button>
              </form>

              {users.length === 0 ? (
                <Card>
                  <EmptyState title="No users match" />
                </Card>
              ) : (
                users.map(({ u, first, last }) => {
                  // The member linked to this user must stay selectable even though it is "taken".
                  const memberOptions = u.memberId
                    ? [{ value: u.memberId, label: `${last}, ${first}` }, ...freeMembers]
                    : freeMembers;
                  return (
                    <Card key={u.id} className={u.active ? "" : "border-amber-300"}>
                      <ActionForm action={updateUser.bind(null, u.id)} className="grid items-end gap-4 md:grid-cols-[1.4fr_1fr_1.2fr_auto]">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.name} src={u.image} size={40} />
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {u.name} {u.id === me.id && <span className="text-xs text-slate-500">(you)</span>}
                            </p>
                            <p className="truncate text-xs text-slate-500">{u.email}</p>
                            <p className="text-xs text-slate-400">
                              Joined {formatDateTime(u.createdAt, s, { weekday: undefined, hour: undefined, minute: undefined })}
                              {!u.active && (
                                <span className="ml-1.5">
                                  <Badge color="amber">Not active</Badge>
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <SelectField label="Role" name="role" options={roleOptions} defaultValue={u.role} />
                        <SelectField
                          label="Member record"
                          name="memberId"
                          options={memberOptions}
                          placeholder="Not linked"
                          defaultValue={u.memberId ? String(u.memberId) : ""}
                        />
                        <div className="flex items-center justify-between gap-3 md:justify-start">
                          <CheckboxField label="Active" name="active" defaultChecked={u.active} />
                          <SubmitButton size="sm">Save</SubmitButton>
                        </div>
                      </ActionForm>
                      {u.memberId && (
                        <p className="mt-2 text-xs text-slate-500">
                          Linked to{" "}
                          <Link className="link" href={`/members/${u.memberId}`}>
                            {first} {last}
                          </Link>
                        </p>
                      )}
                    </Card>
                  );
                })
              )}
            </>
          )}
        </div>

        <Card title="What each role can do" className="h-fit">
          <dl className="space-y-3 text-sm">
            {ROLES.map((r) => (
              <div key={r}>
                <dt className="font-medium">{ROLE_LABELS[r]}</dt>
                <dd className="text-slate-600">{ROLE_DESCRIPTIONS[r]}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-slate-500">
            Unticking <strong>Active</strong> signs the person out immediately. Linking a member record lets them see their own profile and giving,
            and lets class leaders manage the groups they lead.
          </p>
        </Card>
      </div>
    </>
  );
}
