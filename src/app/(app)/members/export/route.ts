import { and, asc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { households, MEMBER_STATUSES, members, MEMBERSHIP_TYPES } from "@/db/schema";
import { audit } from "@/lib/actions";
import { csvResponse, toCSV } from "@/lib/csv";
import { can } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user?.active || !can(user.role, "members:view")) return new Response("Forbidden", { status: 403 });

  const sp = new URL(request.url).searchParams;
  const filters: SQL[] = [];
  const q = sp.get("q")?.trim();
  if (q) {
    const like = `%${q}%`;
    filters.push(or(ilike(members.firstName, like), ilike(members.lastName, like), ilike(members.phone, like), ilike(members.email, like))!);
  }
  const status = sp.get("status");
  if (status && MEMBER_STATUSES.includes(status as never)) filters.push(eq(members.status, status as (typeof MEMBER_STATUSES)[number]));
  const type = sp.get("type");
  if (type && MEMBERSHIP_TYPES.includes(type as never)) filters.push(eq(members.membershipType, type as (typeof MEMBERSHIP_TYPES)[number]));

  const rows = await db
    .select({ m: members, household: households.name })
    .from(members)
    .leftJoin(households, eq(members.householdId, households.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(asc(members.lastName), asc(members.firstName));

  await audit(user.id, "export", "members", null, { count: rows.length });

  const csv = toCSV(
    ["ID", "Title", "First name", "Other names", "Last name", "Gender", "Date of birth", "Phone", "Alt phone", "Email", "Address", "Household", "Status", "Membership type", "Joined", "Baptised", "Confirmed", "Married", "Occupation"],
    rows.map(({ m, household }) => [
      m.id, m.title, m.firstName, m.otherNames, m.lastName, m.gender, m.dateOfBirth, m.phone, m.altPhone, m.email, m.address, household,
      m.status, m.membershipType, m.membershipDate, m.baptismDate, m.confirmationDate, m.marriageDate, m.occupation,
    ]),
  );
  return csvResponse(`members-${new Date().toISOString().slice(0, 10)}.csv`, csv);
}
