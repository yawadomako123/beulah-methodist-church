import { CheckCircle2, UserCheck } from "lucide-react";
import { ActionForm, SelectField, SubmitButton } from "@/components/action-form";
import { Avatar, Card } from "@/components/ui";
import { ROLES } from "@/db/schema";
import { linkableMembers, pendingUsers } from "@/lib/admin";
import { formatDateTime } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/permissions";
import { getSettings } from "@/lib/settings";
import { approveUser, declineUser } from "./actions";

const roleOptions = ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }));

export async function PendingApprovals() {
  const [pending, s] = await Promise.all([pendingUsers(), getSettings()]);
  const { options, suggestions } = await linkableMembers(pending);

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <UserCheck className="size-4 text-brand-600" />
          Waiting for approval
          {pending.length > 0 && (
            <span className="rounded-full bg-accent-500 px-2 py-0.5 text-xs font-semibold text-white">{pending.length}</span>
          )}
        </span>
      }
      bodyClassName=""
    >
      {pending.length === 0 ? (
        <div className="flex items-center gap-3 px-5 py-6 text-sm text-slate-600">
          <CheckCircle2 className="size-5 text-emerald-600" /> Nobody is waiting. New sign-ups will appear here.
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {pending.map((u) => {
            const suggested = suggestions[u.id];
            return (
              <li key={u.id} className="p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <Avatar name={u.name} src={u.image} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{u.name}</p>
                    <p className="truncate text-sm text-slate-500">{u.email}</p>
                    <p className="text-xs text-slate-400">Signed up {formatDateTime(u.createdAt, s)}</p>
                  </div>
                </div>
                <ActionForm action={approveUser.bind(null, u.id)} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end">
                  <SelectField label="Role" name="role" options={roleOptions} defaultValue="member" />
                  <SelectField
                    label={suggested ? "Member record (suggested match)" : "Link to member record"}
                    name="memberId"
                    options={options}
                    placeholder="Don't link yet"
                    defaultValue={suggested ? String(suggested) : ""}
                  />
                  <SubmitButton pendingText="Approving…" className="w-full sm:w-auto">
                    Approve
                  </SubmitButton>
                </ActionForm>
                <ActionForm action={declineUser.bind(null, u.id)} className="mt-2 flex justify-end">
                  <SubmitButton variant="ghost" size="sm" pendingText="Declining…" confirm={`Decline ${u.name}? Their sign-up will be removed.`}>
                    Decline
                  </SubmitButton>
                </ActionForm>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
