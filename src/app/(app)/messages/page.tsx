import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { ActionForm, SelectField, SubmitButton, TextareaField, TextField } from "@/components/action-form";
import { Badge, Card, EmptyState, PageHeader, Select } from "@/components/ui";
import { db } from "@/db";
import { messages, user as userTable } from "@/db/schema";
import { audienceOptions, resolveAudience } from "@/lib/audiences";
import { emailConfigured } from "@/lib/email";
import { formatDateTime } from "@/lib/format";
import { requirePermission } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { sendMessage } from "./actions";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ list?: string }> }) {
  await requirePermission("messages:send");
  const s = await getSettings();
  const listKey = (await searchParams).list;
  const [options, history, contactList] = await Promise.all([
    audienceOptions(),
    db
      .select({ m: messages, sender: userTable.name })
      .from(messages)
      .leftJoin(userTable, eq(messages.sentBy, userTable.id))
      .orderBy(desc(messages.createdAt))
      .limit(30),
    listKey ? resolveAudience(listKey) : Promise.resolve(null),
  ]);
  const configured = emailConfigured();

  return (
    <>
      <PageHeader title="Messages" description="Email members and get contact lists for SMS or WhatsApp" />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card title="Send an email">
            {!configured && (
              <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Email sending is not configured. Add <code>RESEND_API_KEY</code> and <code>EMAIL_FROM</code> to the environment to enable it. Meanwhile you
                can use the contact list tool to copy addresses.
              </p>
            )}
            <ActionForm action={sendMessage} resetOnSuccess className="space-y-3">
              <SelectField label="To *" name="audience" options={options} placeholder="Choose recipients…" required />
              <TextField label="Subject *" name="subject" required />
              <TextareaField label="Message *" name="body" rows={8} required hint="Plain text. Leave a blank line between paragraphs." />
              <div className="flex justify-end">
                <SubmitButton pendingText="Sending…" confirm="Send this email now?">
                  Send email
                </SubmitButton>
              </div>
            </ActionForm>
          </Card>

          <Card title="Sent messages" bodyClassName="">
            {history.length === 0 ? (
              <EmptyState title="Nothing sent yet" />
            ) : (
              <ul className="divide-y divide-slate-100">
                {history.map(({ m, sender }) => (
                  <li key={m.id} className="px-5 py-3">
                    <details>
                      <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
                        <span>
                          <span className="font-medium">{m.subject}</span>
                          <span className="block text-xs text-slate-500">
                            {m.audienceLabel} · {formatDateTime(m.createdAt, s)} · by {sender ?? "unknown"}
                          </span>
                        </span>
                        <Badge color={m.status === "sent" ? "green" : m.status === "partial" ? "amber" : "red"}>
                          {m.sentCount}/{m.recipientCount}
                        </Badge>
                      </summary>
                      <p className="mt-2 text-sm whitespace-pre-wrap text-slate-600">{m.body}</p>
                    </details>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card title="Contact list" className="h-fit lg:col-span-2">
          <form className="flex gap-2">
            <div className="flex-1">
              <Select name="list" aria-label="Audience" options={options} placeholder="Choose a group…" defaultValue={listKey ?? ""} />
            </div>
            <button className="btn-secondary">Show</button>
          </form>
          {contactList && (
            <div className="mt-4 space-y-4 text-sm">
              <p className="text-slate-500">
                {contactList.label}: {contactList.recipients.length} people
              </p>
              <div>
                <label className="label" htmlFor="phones">Phone numbers (for SMS / WhatsApp)</label>
                <textarea
                  id="phones"
                  readOnly
                  rows={4}
                  className="input font-mono text-xs"
                  value={[...new Set(contactList.recipients.map((r) => r.phone).filter(Boolean))].join(", ")}
                />
              </div>
              <div>
                <label className="label" htmlFor="emails">Email addresses (paste into BCC)</label>
                <textarea
                  id="emails"
                  readOnly
                  rows={4}
                  className="input font-mono text-xs"
                  value={[...new Set(contactList.recipients.map((r) => r.email).filter(Boolean))].join(", ")}
                />
              </div>
              <p className="text-xs text-slate-500">
                Missing: {contactList.recipients.filter((r) => !r.phone).length} without phone, {contactList.recipients.filter((r) => !r.email).length} without
                email.
              </p>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
