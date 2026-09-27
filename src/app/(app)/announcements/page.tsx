import { Pin, PinOff, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import { ActionForm, CheckboxField, SelectField, SubmitButton, TextareaField, TextField } from "@/components/action-form";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { formatDate, formatDateTime, todayISO } from "@/lib/format";
import { visibleAnnouncements } from "@/lib/announcements";
import { can } from "@/lib/permissions";
import { requireUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { createAnnouncement, deleteAnnouncement, togglePin } from "./actions";

export const metadata: Metadata = { title: "Announcements" };

const AUDIENCE_OPTIONS = [
  { value: "everyone", label: "Everyone" },
  { value: "leaders", label: "Leaders and staff" },
  { value: "staff", label: "Staff only" },
];

export default async function AnnouncementsPage() {
  const user = await requireUser();
  const s = await getSettings();
  const manage = can(user.role, "announcements:manage");
  const items = await visibleAnnouncements(user.role, todayISO(s.timezone));

  return (
    <>
      <PageHeader title="Announcements" description="Church notices and news" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className={`space-y-4 ${manage ? "lg:col-span-2" : "lg:col-span-3"}`}>
          {items.length === 0 ? (
            <Card>
              <EmptyState title="No announcements right now" />
            </Card>
          ) : (
            items.map((a) => (
              <article key={a.id} className={`card p-5 ${a.pinned ? "border-brand-200 bg-brand-50/40" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">
                      {a.pinned && <Pin className="mr-1 inline size-4 text-brand-600" />}
                      {a.title}
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatDateTime(a.createdAt, s)}
                      {a.expiresAt && ` · until ${formatDate(a.expiresAt, s)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {a.audience !== "everyone" && <Badge color="purple">{a.audience === "staff" ? "Staff" : "Leaders"}</Badge>}
                    {manage && (
                      <>
                        <ActionForm action={togglePin.bind(null, a.id)}>
                          <SubmitButton variant="ghost" size="sm" pendingText="…">
                            {a.pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
                            <span className="sr-only">{a.pinned ? "Unpin" : "Pin"}</span>
                          </SubmitButton>
                        </ActionForm>
                        <ActionForm action={deleteAnnouncement.bind(null, a.id)}>
                          <SubmitButton variant="ghost" size="sm" pendingText="…" confirm="Delete this announcement?">
                            <Trash2 className="size-4" />
                            <span className="sr-only">Delete</span>
                          </SubmitButton>
                        </ActionForm>
                      </>
                    )}
                  </div>
                </div>
                <p className="mt-3 text-sm whitespace-pre-wrap text-slate-700">{a.body}</p>
              </article>
            ))
          )}
        </div>
        {manage && (
          <Card title="Post an announcement" className="h-fit">
            <ActionForm action={createAnnouncement} resetOnSuccess className="space-y-3">
              <TextField label="Title *" name="title" required />
              <TextareaField label="Message *" name="body" rows={6} required />
              <SelectField label="Who can see it" name="audience" options={AUDIENCE_OPTIONS} defaultValue="everyone" />
              <TextField label="Show until" name="expiresAt" type="date" hint="Leave empty to keep it up indefinitely." />
              <CheckboxField label="Pin to top" name="pinned" />
              <SubmitButton className="w-full">Post</SubmitButton>
            </ActionForm>
          </Card>
        )}
      </div>
    </>
  );
}
