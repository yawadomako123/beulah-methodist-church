import Link from "next/link";
import { ActionForm, CheckboxField, SelectField, SubmitButton, TextareaField, TextField } from "@/components/action-form";
import { Card } from "@/components/ui";
import { GROUP_TYPES, type groups } from "@/db/schema";
import { saveGroup } from "./actions";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((d) => ({ value: d, label: d }));

export function GroupForm({ group }: { group?: typeof groups.$inferSelect }) {
  const g = group;
  return (
    <ActionForm action={saveGroup.bind(null, g?.id ?? null)} className="space-y-6">
      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Name *" name="name" defaultValue={g?.name} required placeholder="e.g. Class 4 – Bro. Kwame's class, Singing Band" />
          <SelectField label="Type *" name="type" options={GROUP_TYPES} defaultValue={g?.type ?? "class_meeting"} />
          <SelectField label="Meeting day" name="meetingDay" options={DAYS} placeholder="—" defaultValue={g?.meetingDay ?? ""} />
          <TextField label="Meeting time" name="meetingTime" type="time" defaultValue={g?.meetingTime ?? ""} />
          <TextField label="Location" name="location" defaultValue={g?.location ?? ""} className="sm:col-span-2" />
          <TextareaField label="Description" name="description" defaultValue={g?.description ?? ""} className="sm:col-span-2" />
          {g && <CheckboxField label="Group is active" name="active" defaultChecked={g.active} />}
        </div>
      </Card>
      <div className="flex justify-end gap-2">
        <Link href={g ? `/groups/${g.id}` : "/groups"} className="btn-secondary">
          Cancel
        </Link>
        <SubmitButton>{g ? "Save changes" : "Create group"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
