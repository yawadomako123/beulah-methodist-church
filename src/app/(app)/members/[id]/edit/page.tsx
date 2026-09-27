import { asc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Card, PageHeader } from "@/components/ui";
import { db } from "@/db";
import { households, members } from "@/db/schema";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { deleteMember } from "../../actions";
import { MemberForm } from "../../member-form";

export const metadata: Metadata = { title: "Edit member" };

export default async function EditMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("members:edit");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [member, hh] = await Promise.all([
    db.query.members.findFirst({ where: eq(members.id, id) }),
    db.select({ value: households.id, label: households.name }).from(households).orderBy(asc(households.name)),
  ]);
  if (!member) notFound();

  return (
    <>
      <PageHeader title={`Edit ${member.firstName} ${member.lastName}`} back={{ href: `/members/${id}`, label: "Back to profile" }} />
      <MemberForm member={member} householdOptions={hh} />
      {can(user.role, "members:delete") && (
        <Card title="Danger zone" className="mt-8 border-red-200">
          <ActionForm action={deleteMember.bind(null, id)} className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-slate-600">
              Permanently delete this member, their group memberships, pledges and attendance. Contributions are kept but become unlinked.
              Consider marking them inactive, transferred or deceased instead.
            </p>
            <SubmitButton variant="danger" pendingText="Deleting…" confirm="Permanently delete this member? This cannot be undone.">
              Delete member
            </SubmitButton>
          </ActionForm>
        </Card>
      )}
    </>
  );
}
