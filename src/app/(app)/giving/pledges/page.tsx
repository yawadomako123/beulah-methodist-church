import { desc, eq, sql } from "drizzle-orm";
import { Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, SelectField, SubmitButton, TextField } from "@/components/action-form";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { db } from "@/db";
import { contributions, funds, members, pledges } from "@/db/schema";
import { formatDate, formatMoney, todayISO } from "@/lib/format";
import { fundOptions, memberOptions } from "@/lib/lookups";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { addPledge, deletePledge } from "../actions";
import { GivingTabs } from "../giving-tabs";

export const metadata: Metadata = { title: "Pledges" };

export default async function PledgesPage() {
  const user = await requirePermission("giving:view");
  const editable = can(user.role, "giving:edit");
  const s = await getSettings();
  const today = todayISO(s.timezone);

  const paid = sql<string>`coalesce((
    select sum(${contributions.amount}) from ${contributions}
    where ${contributions.memberId} = ${pledges.memberId}
      and ${contributions.fundId} = ${pledges.fundId}
      and ${contributions.date} between ${pledges.startDate} and ${pledges.endDate}
  ), 0)`;

  const [rows, memberList, fundList] = await Promise.all([
    db
      .select({
        id: pledges.id,
        amount: pledges.amount,
        startDate: pledges.startDate,
        endDate: pledges.endDate,
        fund: funds.name,
        memberId: members.id,
        first: members.firstName,
        last: members.lastName,
        paid,
      })
      .from(pledges)
      .innerJoin(funds, eq(pledges.fundId, funds.id))
      .innerJoin(members, eq(pledges.memberId, members.id))
      .orderBy(desc(pledges.endDate)),
    editable ? memberOptions() : Promise.resolve([]),
    editable ? fundOptions() : Promise.resolve([]),
  ]);

  return (
    <>
      <PageHeader title="Giving" description="Pledges and how much has been redeemed" />
      <GivingTabs active="/giving/pledges" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card bodyClassName="" className="lg:col-span-2">
          {rows.length === 0 ? (
            <EmptyState title="No pledges yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Fund</th>
                    <th>Period</th>
                    <th>Progress</th>
                    {editable && <th className="w-10"><span className="sr-only">Actions</span></th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => {
                    const pct = Math.min(100, (Number(p.paid) / Number(p.amount)) * 100);
                    const overdue = p.endDate < today && pct < 100;
                    return (
                      <tr key={p.id}>
                        <td>
                          <Link href={`/members/${p.memberId}`} className="link font-normal">
                            {p.first} {p.last}
                          </Link>
                        </td>
                        <td>{p.fund}</td>
                        <td className="text-xs whitespace-nowrap text-slate-600">
                          {formatDate(p.startDate, s)} – {formatDate(p.endDate, s)}
                        </td>
                        <td className="min-w-44">
                          <div className="flex justify-between text-xs">
                            <span className="tabular-nums">
                              {formatMoney(p.paid, s)} / {formatMoney(p.amount, s)}
                            </span>
                            <span className={overdue ? "text-accent-500" : "text-slate-500"}>{Math.round(pct)}%</span>
                          </div>
                          <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                            <div className={`h-1.5 rounded-full ${pct >= 100 ? "bg-emerald-500" : "bg-brand-500"}`} style={{ width: `${pct}%` }} />
                          </div>
                        </td>
                        {editable && (
                          <td>
                            <ActionForm action={deletePledge.bind(null, p.id)}>
                              <SubmitButton variant="ghost" size="sm" pendingText="…" confirm="Delete this pledge?">
                                <Trash2 className="size-4" />
                                <span className="sr-only">Delete</span>
                              </SubmitButton>
                            </ActionForm>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        {editable && (
          <Card title="Record a pledge" className="order-first h-fit lg:order-none">
            <ActionForm action={addPledge} resetOnSuccess className="space-y-3">
              <SelectField label="Member *" name="memberId" options={memberList} placeholder="Choose…" required />
              <SelectField label="Fund *" name="fundId" options={fundList} placeholder="Choose…" required />
              <TextField label="Amount pledged *" name="amount" type="number" step="0.01" min="0.01" required />
              <div className="grid grid-cols-2 gap-3">
                <TextField label="From *" name="startDate" type="date" defaultValue={`${today.slice(0, 4)}-01-01`} required />
                <TextField label="To *" name="endDate" type="date" defaultValue={`${today.slice(0, 4)}-12-31`} required />
              </div>
              <TextField label="Notes" name="notes" />
              <SubmitButton className="w-full">Save pledge</SubmitButton>
            </ActionForm>
          </Card>
        )}
      </div>
    </>
  );
}
