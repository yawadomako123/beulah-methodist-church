import Link from "next/link";
import { ActionForm, SubmitButton, TextareaField, TextField } from "@/components/action-form";
import { Card } from "@/components/ui";
import type { households } from "@/db/schema";
import { saveHousehold } from "./actions";

export function HouseholdForm({ household }: { household?: typeof households.$inferSelect }) {
  const h = household;
  return (
    <ActionForm action={saveHousehold.bind(null, h?.id ?? null)} className="space-y-6">
      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Household name *" name="name" defaultValue={h?.name} required placeholder="e.g. The Mensah family" className="sm:col-span-2" />
          <TextField label="Address" name="address" defaultValue={h?.address ?? ""} />
          <TextField label="Town / city" name="city" defaultValue={h?.city ?? ""} />
          <TextField label="Phone" name="phone" type="tel" defaultValue={h?.phone ?? ""} />
          <TextField label="Email" name="email" type="email" defaultValue={h?.email ?? ""} />
          <TextareaField label="Notes" name="notes" defaultValue={h?.notes ?? ""} className="sm:col-span-2" />
        </div>
      </Card>
      <div className="flex justify-end gap-2">
        <Link href={h ? `/households/${h.id}` : "/households"} className="btn-secondary">
          Cancel
        </Link>
        <SubmitButton>{h ? "Save changes" : "Create household"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
