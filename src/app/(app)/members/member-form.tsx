import Link from "next/link";
import { ActionForm, SelectField, SubmitButton, TextareaField, TextField } from "@/components/action-form";
import { Card } from "@/components/ui";
import { GENDERS, HOUSEHOLD_ROLES, MARITAL_STATUSES, MEMBER_STATUSES, MEMBERSHIP_TYPES, type members } from "@/db/schema";
import { saveMember } from "./actions";

type Member = typeof members.$inferSelect;

export function MemberForm({
  member,
  householdOptions,
  defaultHouseholdId,
}: {
  member?: Member;
  householdOptions: { value: number; label: string }[];
  defaultHouseholdId?: number;
}) {
  const m = member;
  const action = saveMember.bind(null, m?.id ?? null);
  const grid = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <ActionForm action={action} className="space-y-6">
      <Card title="Personal details">
        <div className={grid}>
          <TextField label="Title" name="title" defaultValue={m?.title ?? ""} placeholder="Mr, Mrs, Rev., Dr…" />
          <TextField label="First name *" name="firstName" defaultValue={m?.firstName} required />
          <TextField label="Last name / surname *" name="lastName" defaultValue={m?.lastName} required />
          <TextField label="Other names" name="otherNames" defaultValue={m?.otherNames ?? ""} />
          <SelectField label="Gender" name="gender" options={GENDERS} placeholder="—" defaultValue={m?.gender ?? ""} />
          <TextField label="Date of birth" name="dateOfBirth" type="date" defaultValue={m?.dateOfBirth ?? ""} />
          <SelectField label="Marital status" name="maritalStatus" options={MARITAL_STATUSES} placeholder="—" defaultValue={m?.maritalStatus ?? ""} />
          <TextField label="Occupation" name="occupation" defaultValue={m?.occupation ?? ""} />
          <TextField label="Hometown" name="hometown" defaultValue={m?.hometown ?? ""} />
        </div>
      </Card>

      <Card title="Contact">
        <div className={grid}>
          <TextField label="Phone" name="phone" type="tel" defaultValue={m?.phone ?? ""} />
          <TextField label="Alternative phone" name="altPhone" type="tel" defaultValue={m?.altPhone ?? ""} />
          <TextField label="Email" name="email" type="email" defaultValue={m?.email ?? ""} hint="Lets this person sign in with Google and see their own records." />
          <TextField label="Residential address" name="address" defaultValue={m?.address ?? ""} className="sm:col-span-2" />
          <TextField label="Emergency contact" name="emergencyContact" defaultValue={m?.emergencyContact ?? ""} placeholder="Name and phone" />
        </div>
      </Card>

      <Card title="Church membership">
        <div className={grid}>
          <SelectField label="Status *" name="status" options={MEMBER_STATUSES} defaultValue={m?.status ?? "active"} />
          <SelectField label="Membership type *" name="membershipType" options={MEMBERSHIP_TYPES} defaultValue={m?.membershipType ?? "full_member"} />
          <TextField label="Date joined" name="membershipDate" type="date" defaultValue={m?.membershipDate ?? ""} />
          <TextField label="Baptism date" name="baptismDate" type="date" defaultValue={m?.baptismDate ?? ""} />
          <TextField label="Confirmation date" name="confirmationDate" type="date" defaultValue={m?.confirmationDate ?? ""} />
          <TextField label="Marriage date" name="marriageDate" type="date" defaultValue={m?.marriageDate ?? ""} />
        </div>
      </Card>

      <Card title="Household">
        <div className={grid}>
          <SelectField
            label="Household"
            name="householdId"
            placeholder="No household"
            options={[{ value: "new", label: "+ Create a new household" }, ...householdOptions]}
            defaultValue={String(m?.householdId ?? defaultHouseholdId ?? "")}
          />
          <TextField label="New household name" name="newHouseholdName" placeholder="Used only when creating a new household" />
          <SelectField label="Role in household" name="householdRole" options={HOUSEHOLD_ROLES} placeholder="—" defaultValue={m?.householdRole ?? ""} />
        </div>
      </Card>

      <Card title="Other">
        <div className="grid gap-4">
          <TextField label="Photo link" name="photoUrl" type="url" defaultValue={m?.photoUrl ?? ""} placeholder="https://…" />
          <TextareaField label="Notes (visible to staff only)" name="notes" defaultValue={m?.notes ?? ""} />
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        <Link href={m ? `/members/${m.id}` : "/members"} className="btn-secondary">
          Cancel
        </Link>
        <SubmitButton>{m ? "Save changes" : "Add member"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
