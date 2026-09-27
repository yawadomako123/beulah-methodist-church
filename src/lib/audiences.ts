import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { groupMembers, groups, members } from "@/db/schema";

export type Recipient = { id: number; name: string; email: string | null; phone: string | null };

/** Audience keys: "all", "leaders", "group:<id>". */
export async function audienceOptions() {
  const gs = await db.select({ id: groups.id, name: groups.name }).from(groups).where(eq(groups.active, true)).orderBy(asc(groups.name));
  return [
    { value: "all", label: "All active members" },
    { value: "leaders", label: "All group & class leaders" },
    ...gs.map((g) => ({ value: `group:${g.id}`, label: `Group: ${g.name}` })),
  ];
}

export async function resolveAudience(key: string): Promise<{ label: string; recipients: Recipient[] } | null> {
  const cols = { id: members.id, first: members.firstName, last: members.lastName, email: members.email, phone: members.phone };
  let rows: { id: number; first: string; last: string; email: string | null; phone: string | null }[];
  let label: string;

  if (key === "all") {
    label = "All active members";
    rows = await db.select(cols).from(members).where(eq(members.status, "active"));
  } else if (key === "leaders") {
    label = "Group & class leaders";
    rows = await db
      .selectDistinct(cols)
      .from(groupMembers)
      .innerJoin(members, eq(groupMembers.memberId, members.id))
      .where(and(inArray(groupMembers.role, ["leader", "assistant"]), eq(members.status, "active")));
  } else if (key.startsWith("group:")) {
    const id = Number(key.slice(6));
    const group = Number.isInteger(id) ? await db.query.groups.findFirst({ where: eq(groups.id, id) }) : undefined;
    if (!group) return null;
    label = `Group: ${group.name}`;
    rows = await db
      .select(cols)
      .from(groupMembers)
      .innerJoin(members, eq(groupMembers.memberId, members.id))
      .where(eq(groupMembers.groupId, id));
  } else {
    return null;
  }
  return { label, recipients: rows.map((r) => ({ id: r.id, name: `${r.first} ${r.last}`, email: r.email, phone: r.phone })) };
}
