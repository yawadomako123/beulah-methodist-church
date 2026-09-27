import Link from "next/link";
import { ActionForm, SelectField, SubmitButton, TextareaField, TextField } from "@/components/action-form";
import { Card } from "@/components/ui";
import { EVENT_TYPES, type events } from "@/db/schema";
import { dateToLocalInput } from "@/lib/format";
import { saveEvent } from "./actions";

export function EventForm({
  event,
  groupOptions,
  defaultGroupId,
  groupRequired,
  timezone,
}: {
  event?: typeof events.$inferSelect;
  groupOptions: { value: number; label: string }[];
  defaultGroupId?: number;
  groupRequired?: boolean;
  timezone: string;
}) {
  const e = event;
  return (
    <ActionForm action={saveEvent.bind(null, e?.id ?? null)} className="space-y-6">
      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Title *" name="title" defaultValue={e?.title} required placeholder="e.g. Sunday Divine Service, Class meeting" className="sm:col-span-2" />
          <SelectField label="Type *" name="type" options={EVENT_TYPES} defaultValue={e?.type ?? (defaultGroupId ? "meeting" : "service")} />
          <SelectField
            label={groupRequired ? "Group *" : "Group (optional)"}
            name="groupId"
            options={groupOptions}
            placeholder={groupRequired ? "Choose a group…" : "Whole church"}
            defaultValue={String(e?.groupId ?? defaultGroupId ?? "")}
            required={groupRequired}
            hint="Group events take attendance from the group roster."
          />
          <TextField label="Starts *" name="startsAt" type="datetime-local" defaultValue={dateToLocalInput(e?.startsAt, timezone)} required />
          <TextField label="Ends" name="endsAt" type="datetime-local" defaultValue={dateToLocalInput(e?.endsAt, timezone)} />
          <TextField label="Location" name="location" defaultValue={e?.location ?? ""} className="sm:col-span-2" />
          <TextareaField label="Description" name="description" defaultValue={e?.description ?? ""} className="sm:col-span-2" />
        </div>
      </Card>
      <div className="flex justify-end gap-2">
        <Link href={e ? `/events/${e.id}` : "/events"} className="btn-secondary">
          Cancel
        </Link>
        <SubmitButton>{e ? "Save changes" : "Create event"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
