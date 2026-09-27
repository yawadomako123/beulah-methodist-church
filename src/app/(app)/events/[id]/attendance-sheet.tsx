"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { ActionForm, SubmitButton, TextField } from "@/components/action-form";

type Person = { id: number; name: string; detail?: string | null };
type ActionState = { error?: string; fieldErrors?: Record<string, string>; message?: string } | undefined;

export function AttendanceSheet({
  action,
  people,
  initiallyPresent,
  headcount,
  visitorCount,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  people: Person[];
  initiallyPresent: number[];
  headcount: number | null;
  visitorCount: number | null;
}) {
  const [present, setPresent] = useState(() => new Set(initiallyPresent));
  const [q, setQ] = useState("");
  const [onlyPresent, setOnlyPresent] = useState(false);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return new Set(
      people.filter((p) => (!needle || p.name.toLowerCase().includes(needle)) && (!onlyPresent || present.has(p.id))).map((p) => p.id),
    );
  }, [people, q, onlyPresent, present]);

  function toggle(id: number) {
    setPresent((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <ActionForm action={action}>
      <div className="grid gap-4 border-b border-slate-100 p-5 sm:grid-cols-3">
        <TextField label="Total headcount" name="headcount" type="number" min={0} defaultValue={headcount ?? ""} hint="Everyone present, incl. unregistered" />
        <TextField label="Visitors" name="visitorCount" type="number" min={0} defaultValue={visitorCount ?? ""} />
        <div className="flex items-end">
          <p className="text-sm text-slate-600">
            <strong className="text-2xl text-slate-900 tabular-nums">{present.size}</strong> of {people.length} checked in
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-3">
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a person" aria-label="Find a person" className="input pl-9" />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={onlyPresent} onChange={(e) => setOnlyPresent(e.target.checked)} className="accent-brand-600" />
          Show checked-in only
        </label>
        <button type="button" className="btn-ghost btn-sm" onClick={() => setPresent(new Set(people.map((p) => p.id)))}>
          Mark all
        </button>
        <button type="button" className="btn-ghost btn-sm" onClick={() => setPresent(new Set())}>
          Clear
        </button>
      </div>

      <ul className="grid max-h-[60vh] overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
        {people.map((p) => (
          <li key={p.id} hidden={!visible.has(p.id)}>
            <label className="flex cursor-pointer items-center gap-3 border-b border-slate-100 px-5 py-2.5 hover:bg-slate-50">
              <input
                type="checkbox"
                name="present"
                value={p.id}
                checked={present.has(p.id)}
                onChange={() => toggle(p.id)}
                className="size-4.5 accent-brand-600"
              />
              <span className="text-sm">
                {p.name}
                {p.detail && <span className="block text-xs text-slate-500">{p.detail}</span>}
              </span>
            </label>
          </li>
        ))}
      </ul>
      {people.length === 0 && <p className="p-5 text-sm text-slate-500">No people to list. Add members to the group first.</p>}

      <div className="flex justify-end p-5">
        <SubmitButton>Save attendance</SubmitButton>
      </div>
    </ActionForm>
  );
}
