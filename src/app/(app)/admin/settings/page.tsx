import type { Metadata } from "next";
import { ActionForm, SubmitButton, TextField } from "@/components/action-form";
import { Card, PageHeader } from "@/components/ui";
import { requirePermission } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { saveSettings } from "../actions";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requirePermission("settings:manage");
  const s = await getSettings();
  return (
    <>
      <PageHeader title="Settings" description="Church details used across the system, statements and emails" />
      <ActionForm action={saveSettings} className="max-w-3xl space-y-6">
        <Card title="Church">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Church name *" name="churchName" defaultValue={s.churchName} required className="sm:col-span-2" />
            <TextField label="Short name (sidebar)" name="shortName" defaultValue={s.shortName} />
            <TextField label="Phone" name="phone" defaultValue={s.phone} />
            <TextField label="Email" name="email" type="email" defaultValue={s.email} />
            <TextField label="Website" name="website" defaultValue={s.website} />
            <TextField label="Address" name="address" defaultValue={s.address} className="sm:col-span-2" />
          </div>
        </Card>
        <Card title="Regional">
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField label="Currency *" name="currency" defaultValue={s.currency} maxLength={3} hint="ISO code, e.g. GHS, USD, GBP, NGN" />
            <TextField label="Time zone *" name="timezone" defaultValue={s.timezone} hint="e.g. Africa/Accra, Europe/London" />
            <TextField label="Locale" name="locale" defaultValue={s.locale} hint="Date & number format, e.g. en-GB" />
          </div>
        </Card>
        <div className="flex justify-end">
          <SubmitButton>Save settings</SubmitButton>
        </div>
      </ActionForm>
    </>
  );
}
