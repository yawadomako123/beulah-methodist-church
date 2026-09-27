import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { requirePermission } from "@/lib/session";
import { HouseholdForm } from "../household-form";

export const metadata: Metadata = { title: "New household" };

export default async function NewHouseholdPage() {
  await requirePermission("members:edit");
  return (
    <>
      <PageHeader title="New household" back={{ href: "/households", label: "Households" }} />
      <HouseholdForm />
    </>
  );
}
