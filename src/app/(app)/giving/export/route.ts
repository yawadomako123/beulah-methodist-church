import { and, desc, eq, gte, lte, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { contributions, funds, members } from "@/db/schema";
import { audit } from "@/lib/actions";
import { csvResponse, toCSV } from "@/lib/csv";
import { can } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";

const isDate = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user?.active || !can(user.role, "giving:view")) return new Response("Forbidden", { status: 403 });

  const sp = new URL(request.url).searchParams;
  const filters: SQL[] = [];
  const from = isDate(sp.get("from"));
  const to = isDate(sp.get("to"));
  const fund = Number(sp.get("fund"));
  if (from) filters.push(gte(contributions.date, from));
  if (to) filters.push(lte(contributions.date, to));
  if (fund) filters.push(eq(contributions.fundId, fund));

  const rows = await db
    .select({ c: contributions, fund: funds.name, first: members.firstName, last: members.lastName })
    .from(contributions)
    .innerJoin(funds, eq(contributions.fundId, funds.id))
    .leftJoin(members, eq(contributions.memberId, members.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(contributions.date));

  await audit(user.id, "export", "contributions", null, { count: rows.length, from, to });

  return csvResponse(
    `giving-${from ?? "all"}-to-${to ?? "all"}.csv`,
    toCSV(
      ["ID", "Date", "Member ID", "Member", "Fund", "Amount", "Method", "Reference", "Notes"],
      rows.map(({ c, fund, first, last }) => [c.id, c.date, c.memberId, first ? `${first} ${last}` : "Anonymous", fund, c.amount, c.method, c.reference, c.notes]),
    ),
  );
}
