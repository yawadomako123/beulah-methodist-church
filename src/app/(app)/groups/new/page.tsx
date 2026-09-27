import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { requirePermission } from "@/lib/session";
import { GroupForm } from "../group-form";

export const metadata: Metadata = { title: "New group" };

export default async function NewGroupPage() {
  await requirePermission("groups:manage");
  return (
    <>
      <PageHeader title="New group" back={{ href: "/groups", label: "Groups" }} />
      <GroupForm />
    </>
  );
}
