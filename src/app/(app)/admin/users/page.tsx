import { asc, desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, CheckboxField, SelectField, SubmitButton } from "@/components/action-form";
import { Avatar, Badge, Card, PageHeader } from "@/components/ui";
import { db } from "@/db";
import { members, ROLES, user as userTable } from "@/db/schema";
import { formatDateTime } from "@/lib/format";
import { memberOptions } from "@/lib/lookups";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { updateUser } from "../actions";

export const metadata: Metadata = { title: "Users & roles" };

export default async function UsersPage() {
  const me = await requirePermission("users:manage");
  const s = await getSettings();
  const [users, memberList] = await Promise.all([
    db
      .select({ u: userTable, first: members.firstName, last: members.lastName })
      .from(userTable)
      .leftJoin(members, eq(userTable.memberId, members.id))
      .orderBy(asc(userTable.active), desc(userTable.createdAt)),
    memberOptions(),
  ]);
  const pending = users.filter(({ u }) => !u.active).length;
  const roleOptions = ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }));

  return (
    <>
      <PageHeader
        title="Users & roles"
        description={`${users.length} accounts${pending ? ` · ${pending} awaiting approval` : ""}. People sign in with Google; approve them and assign a role here.`}
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-3 xl:col-span-2">
          {users.map(({ u, first, last }) => (
            <Card key={u.id} className={u.active ? "" : "border-amber-300"}>
              <ActionForm action={updateUser.bind(null, u.id)} className="grid items-end gap-4 md:grid-cols-[1.4fr_1fr_1.2fr_auto]">
                <div className="flex items-center gap-3">
                  <Avatar name={u.name} src={u.image} size={40} />
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {u.name} {u.id === me.id && <span className="text-xs text-slate-500">(you)</span>}
                    </p>
                    <p className="truncate text-xs text-slate-500">{u.email}</p>
                    <p className="text-xs text-slate-400">Joined {formatDateTime(u.createdAt, s, { weekday: undefined, hour: undefined, minute: undefined })}</p>
                  </div>
                </div>
                <SelectField label="Role" name="role" options={roleOptions} defaultValue={u.role} />
                <SelectField
                  label="Linked member record"
                  name="memberId"
                  options={memberList}
                  placeholder="Not linked"
                  defaultValue={u.memberId ? String(u.memberId) : ""}
                />
                <div className="flex items-center gap-3">
                  <CheckboxField label={u.active ? "Active" : "Approve"} name="active" defaultChecked={u.active} />
                  <SubmitButton size="sm">Save</SubmitButton>
                </div>
              </ActionForm>
              {!u.active && <Badge color="amber">Awaiting approval</Badge>}
              {u.memberId && (
                <p className="mt-2 text-xs text-slate-500">
                  Linked to{" "}
                  <Link className="link" href={`/members/${u.memberId}`}>
                    {first} {last}
                  </Link>
                </p>
              )}
            </Card>
          ))}
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
            Link a user to their member record so they can see their own profile and giving, and so leaders can manage the groups they lead.
          </p>
        </Card>
      </div>
    </>
  );
}
