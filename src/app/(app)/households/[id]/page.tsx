import { asc, eq } from "drizzle-orm";
import { Pencil, UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Avatar, Badge, Card, EmptyState, PageHeader, statusColor } from "@/components/ui";
import { db } from "@/db";
import { households, members } from "@/db/schema";
import { age, humanize, todayISO } from "@/lib/format";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { deleteHousehold } from "../actions";
import { HouseholdForm } from "../household-form";

export const metadata: Metadata = { title: "Household" };

const ROLE_ORDER = { head: 0, spouse: 1, child: 2, relative: 3, other: 4 } as const;

export default async function HouseholdPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const user = await requirePermission("members:view");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const editing = (await searchParams).edit === "1" && can(user.role, "members:edit");
  const household = await db.query.households.findFirst({
    where: eq(households.id, id),
    with: { members: { orderBy: asc(members.dateOfBirth) } },
  });
  if (!household) notFound();
  const s = await getSettings();
  const today = todayISO(s.timezone);
  const people = [...household.members].sort((a, b) => ROLE_ORDER[a.householdRole ?? "other"] - ROLE_ORDER[b.householdRole ?? "other"]);

  if (editing) {
    return (
      <>
        <PageHeader title={`Edit ${household.name}`} back={{ href: `/households/${id}`, label: "Back" }} />
        <HouseholdForm household={household} />
        <Card title="Danger zone" className="mt-8 border-red-200">
          <ActionForm action={deleteHousehold.bind(null, id)} className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-slate-600">Delete this household. Its members are kept but unlinked from it.</p>
            <SubmitButton variant="danger" confirm="Delete this household?">
              Delete household
            </SubmitButton>
          </ActionForm>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={household.name}
        description={[household.address, household.city].filter(Boolean).join(", ") || undefined}
        back={{ href: "/households", label: "Households" }}
        actions={
          can(user.role, "members:edit") && (
            <>
              <Link href={`/households/${id}?edit=1`} className="btn-secondary">
                <Pencil className="size-4" /> Edit
              </Link>
              <Link href={`/members/new?household=${id}`} className="btn-primary">
                <UserPlus className="size-4" /> Add person
              </Link>
            </>
          )
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title={`Members (${people.length})`} className="lg:col-span-2" bodyClassName="">
          {people.length === 0 ? (
            <EmptyState title="Nobody in this household yet" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {people.map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-5 py-3">
                  <Avatar name={`${m.firstName} ${m.lastName}`} src={m.photoUrl} size={40} />
                  <div className="flex-1">
                    <Link href={`/members/${m.id}`} className="link">
                      {m.firstName} {m.lastName}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {humanize(m.householdRole)}
                      {m.dateOfBirth && ` · age ${age(m.dateOfBirth, today)}`}
                    </p>
                  </div>
                  <Badge color={statusColor(m.status)}>{humanize(m.status)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Contact">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-slate-500">Phone</dt>
              <dd>{household.phone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Email</dt>
              <dd>{household.email ?? "—"}</dd>
            </div>
            {household.notes && (
              <div>
                <dt className="text-slate-500">Notes</dt>
                <dd className="whitespace-pre-wrap">{household.notes}</dd>
              </div>
            )}
          </dl>
        </Card>
      </div>
    </>
  );
}
