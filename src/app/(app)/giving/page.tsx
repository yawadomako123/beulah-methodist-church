import { and, count, desc, eq, gte, lte, sum, type SQL } from "drizzle-orm";
import { Download, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, SelectField, SubmitButton, TextField } from "@/components/action-form";
import { Card, EmptyState, PageHeader, Select, Stat } from "@/components/ui";
import { db } from "@/db";
import { contributions, funds, members, PAYMENT_METHODS } from "@/db/schema";
import { formatDate, formatMoney, humanize, todayISO } from "@/lib/format";
import { fundOptions, memberOptions } from "@/lib/lookups";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { addContribution, deleteContribution } from "./actions";
import { GivingTabs } from "./giving-tabs";

export const metadata: Metadata = { title: "Giving" };

const isDate = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);

export default async function GivingPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requirePermission("giving:view");
  const s = await getSettings();
  const editable = can(user.role, "giving:edit");
  const sp = await searchParams;
  const today = todayISO(s.timezone);
  const from = isDate(sp.from) ?? `${today.slice(0, 7)}-01`;
  const to = isDate(sp.to) ?? today;
  const fundId = Number(sp.fund) || undefined;

  const filters: SQL[] = [gte(contributions.date, from), lte(contributions.date, to)];
  if (fundId) filters.push(eq(contributions.fundId, fundId));
  const where = and(...filters);

  const [rows, [totals], byFund, [yearTotal], fundList, memberList] = await Promise.all([
    db
      .select({
        id: contributions.id,
        date: contributions.date,
        amount: contributions.amount,
        method: contributions.method,
        reference: contributions.reference,
        fund: funds.name,
        memberId: members.id,
        first: members.firstName,
        last: members.lastName,
      })
      .from(contributions)
      .innerJoin(funds, eq(contributions.fundId, funds.id))
      .leftJoin(members, eq(contributions.memberId, members.id))
      .where(where)
      .orderBy(desc(contributions.date), desc(contributions.id))
      .limit(200),
    db.select({ total: sum(contributions.amount), n: count() }).from(contributions).where(where),
    db
      .select({ fund: funds.name, total: sum(contributions.amount) })
      .from(contributions)
      .innerJoin(funds, eq(contributions.fundId, funds.id))
      .where(where)
      .groupBy(funds.name)
      .orderBy(desc(sum(contributions.amount))),
    db.select({ total: sum(contributions.amount) }).from(contributions).where(gte(contributions.date, `${today.slice(0, 4)}-01-01`)),
    fundOptions(false),
    editable ? memberOptions() : Promise.resolve([]),
  ]);

  const qs = new URLSearchParams({ from, to, ...(fundId ? { fund: String(fundId) } : {}) });
  const grand = Number(totals?.total ?? 0);

  return (
    <>
      <PageHeader
        title="Giving"
        description="Tithes, offerings, pledges and special donations"
        actions={
          <a href={`/giving/export?${qs}`} className="btn-secondary">
            <Download className="size-4" /> Export CSV
          </a>
        }
      />
      <GivingTabs active="/giving" />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <Stat label="Total for period" value={formatMoney(grand, s)} hint={`${formatDate(from, s)} – ${formatDate(to, s)}`} />
        <Stat label="Number of gifts" value={totals?.n ?? 0} />
        <Stat label={`Year to date (${today.slice(0, 4)})`} value={formatMoney(yearTotal?.total ?? 0, s)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card bodyClassName="">
            <form className="flex flex-wrap items-end gap-3 border-b border-slate-100 p-4">
              <div>
                <label className="label" htmlFor="from">From</label>
                <input id="from" name="from" type="date" defaultValue={from} className="input" />
              </div>
              <div>
                <label className="label" htmlFor="to">To</label>
                <input id="to" name="to" type="date" defaultValue={to} className="input" />
              </div>
              <div className="w-44">
                <label className="label" htmlFor="fund">Fund</label>
                <Select name="fund" options={fundList} placeholder="All funds" defaultValue={fundId ? String(fundId) : ""} />
              </div>
              <button className="btn-secondary">Apply</button>
            </form>
            {rows.length === 0 ? (
              <EmptyState title="No contributions in this period" />
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Giver</th>
                      <th>Fund</th>
                      <th className="hidden md:table-cell">Method</th>
                      <th className="text-right">Amount</th>
                      {editable && <th className="w-10"><span className="sr-only">Actions</span></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id}>
                        <td className="whitespace-nowrap">{formatDate(r.date, s)}</td>
                        <td>
                          {r.memberId ? (
                            <Link href={`/members/${r.memberId}`} className="link font-normal">
                              {r.first} {r.last}
                            </Link>
                          ) : (
                            <span className="text-slate-500">Anonymous / loose</span>
                          )}
                        </td>
                        <td>{r.fund}</td>
                        <td className="hidden md:table-cell">
                          {humanize(r.method)}
                          {r.reference && <span className="block text-xs text-slate-500">{r.reference}</span>}
                        </td>
                        <td className="text-right font-medium tabular-nums">{formatMoney(r.amount, s)}</td>
                        {editable && (
                          <td>
                            <ActionForm action={deleteContribution.bind(null, r.id)}>
                              <SubmitButton variant="ghost" size="sm" pendingText="…" confirm="Delete this contribution?">
                                <Trash2 className="size-4" />
                                <span className="sr-only">Delete</span>
                              </SubmitButton>
                            </ActionForm>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length === 200 && <p className="p-4 text-xs text-slate-500">Showing the latest 200. Export CSV for the full list.</p>}
              </div>
            )}
          </Card>
        </div>

        <div className="order-first space-y-6 lg:order-none">
          {editable && (
            <Card title="Record a contribution">
              {fundList.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Create a fund first on the <Link href="/giving/funds" className="link">Funds</Link> tab.
                </p>
              ) : (
                <ActionForm action={addContribution} resetOnSuccess className="space-y-3">
                  <SelectField label="Member" name="memberId" options={memberList} placeholder="Anonymous / loose offering" />
                  <SelectField label="Fund *" name="fundId" options={fundList} required />
                  <div className="grid grid-cols-2 gap-3">
                    <TextField label="Amount *" name="amount" type="number" step="0.01" min="0.01" required inputMode="decimal" />
                    <TextField label="Date *" name="date" type="date" defaultValue={today} required />
                  </div>
                  <SelectField label="Method" name="method" options={PAYMENT_METHODS} defaultValue="cash" />
                  <TextField label="Reference" name="reference" placeholder="Receipt, MoMo or cheque no." />
                  <TextField label="Notes" name="notes" />
                  <SubmitButton className="w-full">Save contribution</SubmitButton>
                </ActionForm>
              )}
            </Card>
          )}
          <Card title="By fund">
            {byFund.length === 0 ? (
              <p className="text-sm text-slate-500">Nothing recorded for this period.</p>
            ) : (
              <ul className="space-y-3">
                {byFund.map((f) => {
                  const pct = grand ? (Number(f.total) / grand) * 100 : 0;
                  return (
                    <li key={f.fund}>
                      <div className="flex justify-between text-sm">
                        <span>{f.fund}</span>
                        <span className="font-medium tabular-nums">{formatMoney(f.total, s)}</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                        <div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
