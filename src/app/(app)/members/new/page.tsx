import { asc } from "drizzle-orm";
import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { db } from "@/db";
import { households } from "@/db/schema";
import { requirePermission } from "@/lib/session";
import { MemberForm } from "../member-form";

export const metadata: Metadata = { title: "Add member" };

export default async function NewMemberPage({ searchParams }: { searchParams: Promise<{ household?: string }> }) {
  await requirePermission("members:edit");
  const { household } = await searchParams;
  const hh = await db.select({ value: households.id, label: households.name }).from(households).orderBy(asc(households.name));
  return (
    <>
      <PageHeader title="Add member" back={{ href: "/members", label: "Members" }} />
      <MemberForm householdOptions={hh} defaultHouseholdId={household ? Number(household) : undefined} />
    </>
  );
}
