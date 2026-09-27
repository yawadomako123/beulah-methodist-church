import { asc, count, eq, sum } from "drizzle-orm";
import type { Metadata } from "next";
import { ActionForm, CheckboxField, SubmitButton, TextField } from "@/components/action-form";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { db } from "@/db";
import { contributions, funds } from "@/db/schema";
import { formatMoney } from "@/lib/format";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { saveFund } from "../actions";
import { GivingTabs } from "../giving-tabs";

export const metadata: Metadata = { title: "Funds" };

export default async function FundsPage() {
  const user = await requirePermission("giving:view");
  const editable = can(user.role, "giving:edit");
  const s = await getSettings();
  const rows = await db
    .select({ fund: funds, total: sum(contributions.amount), n: count(contributions.id) })
    .from(funds)
    .leftJoin(contributions, eq(contributions.fundId, funds.id))
    .groupBy(funds.id)
    .orderBy(asc(funds.name));

  return (
    <>
      <PageHeader title="Giving" description="Funds money can be given to" />
      <GivingTabs active="/giving/funds" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card bodyClassName="" className="lg:col-span-2">
          {rows.length === 0 ? (
            <EmptyState title="No funds yet">Create funds such as Tithe, Sunday Offering, Harvest and Building Fund.</EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100">
              {rows.map(({ fund, total, n }) => (
                <li key={fund.id} className="px-5 py-4">
                  {editable ? (
                    <details>
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                        <span>
                          <span className="font-medium">{fund.name}</span> {!fund.active && <Badge color="amber">Inactive</Badge>}
                          {fund.description && <span className="block text-sm text-slate-500">{fund.description}</span>}
                        </span>
                        <span className="text-right text-sm">
                          <span className="block font-medium tabular-nums">{formatMoney(total ?? 0, s)}</span>
                          <span className="text-slate-500">{n} gifts · edit</span>
                        </span>
                      </summary>
                      <ActionForm action={saveFund.bind(null, fund.id)} className="mt-4 grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-2">
                        <TextField label="Name" name="name" defaultValue={fund.name} required />
                        <TextField label="Description" name="description" defaultValue={fund.description ?? ""} />
                        <CheckboxField label="Active (can receive new gifts)" name="active" defaultChecked={fund.active} />
                        <div className="text-right">
                          <SubmitButton size="sm">Save</SubmitButton>
                        </div>
                      </ActionForm>
                    </details>
                  ) : (
                    <div className="flex justify-between">
                      <span className="font-medium">{fund.name}</span>
                      <span className="tabular-nums">{formatMoney(total ?? 0, s)}</span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
        {editable && (
          <Card title="New fund" className="order-first h-fit lg:order-none">
            <ActionForm action={saveFund.bind(null, null)} resetOnSuccess className="space-y-3">
              <TextField label="Name *" name="name" required placeholder="e.g. Harvest 2026" />
              <TextField label="Description" name="description" />
              <SubmitButton className="w-full">Create fund</SubmitButton>
            </ActionForm>
          </Card>
        )}
      </div>
    </>
  );
}
