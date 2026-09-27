import "server-only";
import { asc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { funds, members } from "@/db/schema";

export async function memberOptions() {
  const rows = await db
    .select({ id: members.id, first: members.firstName, last: members.lastName, phone: members.phone })
    .from(members)
    .where(ne(members.status, "deceased"))
    .orderBy(asc(members.lastName), asc(members.firstName));
  return rows.map((m) => ({ value: m.id, label: `${m.last}, ${m.first}${m.phone ? ` (${m.phone})` : ""}` }));
}

export async function fundOptions(activeOnly = true) {
  return db
    .select({ value: funds.id, label: funds.name })
    .from(funds)
    .where(activeOnly ? eq(funds.active, true) : undefined)
    .orderBy(asc(funds.name));
}
