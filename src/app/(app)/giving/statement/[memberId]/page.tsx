import { and, asc, eq, gte, lte } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { db } from "@/db";
import { contributions, funds, members } from "@/db/schema";
import { formatDate, formatMoney, fullName, humanize, todayISO } from "@/lib/format";
import { can } from "@/lib/permissions";
import { requireUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Giving statement" };

export default async function StatementPage({
  params,
  searchParams,
}: {
  params: Promise<{ memberId: string }>;
  searchParams: Promise<{ year?: string }>;
}) {
  const user = await requireUser();
  const memberId = Number((await params).memberId);
  if (!Number.isInteger(memberId)) notFound();
  // Finance staff can see anyone's statement; members only their own.
  if (!can(user.role, "giving:view") && user.memberId !== memberId) redirect("/no-access");

  const s = await getSettings();
  const thisYear = Number(todayISO(s.timezone).slice(0, 4));
  const year = Number((await searchParams).year) || thisYear;

  const member = await db.query.members.findFirst({ where: eq(members.id, memberId), with: { household: true } });
  if (!member) notFound();

  const rows = await db
    .select({ id: contributions.id, date: contributions.date, amount: contributions.amount, method: contributions.method, fund: funds.name })
    .from(contributions)
    .innerJoin(funds, eq(contributions.fundId, funds.id))
    .where(and(eq(contributions.memberId, memberId), gte(contributions.date, `${year}-01-01`), lte(contributions.date, `${year}-12-31`)))
    .orderBy(asc(contributions.date));

  const total = rows.reduce((a, r) => a + Number(r.amount), 0);
  const byFund = Object.entries(
    rows.reduce<Record<string, number>>((acc, r) => ((acc[r.fund] = (acc[r.fund] ?? 0) + Number(r.amount)), acc), {}),
  );

  return (
    <div className="card mx-auto max-w-3xl p-4 sm:p-10">
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <form className="flex items-center gap-2">
          <label htmlFor="year" className="text-sm text-slate-600">
            Year
          </label>
          <select id="year" name="year" defaultValue={year} className="input w-28">
            {Array.from({ length: 6 }, (_, i) => thisYear - i).map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
          <button className="btn-secondary btn-sm">Show</button>
        </form>
        <PrintButton />
      </div>

      <header className="flex items-start gap-4 border-b-4 border-gold-400 pb-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" className="size-14 shrink-0 sm:size-16" />
        <div className="min-w-0">
        <h1 className="font-serif text-xl font-semibold sm:text-2xl">{s.churchName}</h1>
        <p className="text-sm text-slate-500">{[s.address, s.phone, s.email].filter(Boolean).join(" · ")}</p>
        <h2 className="mt-6 text-lg font-semibold">Giving statement {year}</h2>
        <p className="mt-1 text-sm">
          {fullName(member)}
          {member.address && <span className="block text-slate-500">{member.address}</span>}
        </p>
        </div>
      </header>

      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">No contributions recorded for {year}.</p>
      ) : (
        <>
          <div className="-mx-4 mt-6 overflow-x-auto sm:mx-0">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Fund</th>
                <th>Method</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{formatDate(r.date, s)}</td>
                  <td>{r.fund}</td>
                  <td>{humanize(r.method)}</td>
                  <td className="text-right tabular-nums">{formatMoney(r.amount, s)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <div className="mt-6 ml-auto max-w-xs space-y-1 text-sm">
            {byFund.map(([fund, amt]) => (
              <div key={fund} className="flex justify-between">
                <span className="text-slate-600">{fund}</span>
                <span className="tabular-nums">{formatMoney(amt, s)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-slate-300 pt-2 text-base font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatMoney(total, s)}</span>
            </div>
          </div>
        </>
      )}
      <p className="mt-10 text-center text-sm text-slate-500 italic">Thank you for your faithful giving. &ldquo;God loves a cheerful giver.&rdquo; 2 Corinthians 9:7</p>
    </div>
  );
}
