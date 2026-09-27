"use client";

import clsx from "clsx";
import { createContext, useActionState, useContext, useEffect, useRef, useTransition, type ComponentProps, type ReactNode } from "react";

type ActionState = { error?: string; fieldErrors?: Record<string, string>; message?: string } | undefined;
type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

const ErrorsContext = createContext<Record<string, string>>({});
const PendingContext = createContext(false);

export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess,
}: {
  action: Action;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (resetOnSuccess && state?.message) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form
      ref={ref}
      className={className}
      // `action` keeps the form working (as a POST) before JavaScript loads. Once hydrated, we
      // submit through a transition instead, which stops React from clearing the form, so
      // people keep what they typed when validation fails.
      action={formAction}
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
        startTransition(() => formAction(formData));
      }}
    >
      <PendingContext.Provider value={pending}>
      <ErrorsContext.Provider value={state?.fieldErrors ?? {}}>
        {state?.error && (
          <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.error}
          </div>
        )}
        {state?.message && (
          <div role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {state.message}
          </div>
        )}
        {children}
      </ErrorsContext.Provider>
      </PendingContext.Provider>
    </form>
  );
}

export function SubmitButton({
  children,
  pendingText = "Saving…",
  variant = "primary",
  size,
  className,
  confirm,
}: {
  children: ReactNode;
  pendingText?: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm";
  className?: string;
  confirm?: string;
}) {
  const pending = useContext(PendingContext);
  return (
    <button
      type="submit"
      disabled={pending}
      className={clsx(`btn-${variant}`, size === "sm" && "btn-sm", className)}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {pending ? pendingText : children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Form fields that show their own validation errors                   */
/* ------------------------------------------------------------------ */

type Option = string | { value: string | number; label: string };

function FieldShell({ label, name, hint, className, children }: {
  label: string;
  name: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  const error = useContext(ErrorsContext)[name];
  return (
    <div className={className}>
      <label htmlFor={name} className="label">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function TextField({ label, name, hint, className, ...props }: ComponentProps<"input"> & {
  label: string;
  name: string;
  hint?: string;
}) {
  const error = useContext(ErrorsContext)[name];
  return (
    <FieldShell label={label} name={name} hint={hint} className={className}>
      <input id={name} name={name} className="input" aria-invalid={error ? true : undefined} {...props} />
    </FieldShell>
  );
}

export function TextareaField({ label, name, hint, className, ...props }: ComponentProps<"textarea"> & {
  label: string;
  name: string;
  hint?: string;
}) {
  const error = useContext(ErrorsContext)[name];
  return (
    <FieldShell label={label} name={name} hint={hint} className={className}>
      <textarea id={name} name={name} rows={3} className="input" aria-invalid={error ? true : undefined} {...props} />
    </FieldShell>
  );
}

export function SelectField({ label, name, hint, className, options, placeholder, ...props }: Omit<ComponentProps<"select">, "children"> & {
  label: string;
  name: string;
  hint?: string;
  options: readonly Option[];
  placeholder?: string;
}) {
  const error = useContext(ErrorsContext)[name];
  return (
    <FieldShell label={label} name={name} hint={hint} className={className}>
      <select id={name} name={name} className="input" aria-invalid={error ? true : undefined} {...props}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) =>
          typeof o === "string" ? (
            <option key={o} value={o}>
              {o.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())}
            </option>
          ) : (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ),
        )}
      </select>
    </FieldShell>
  );
}

export function CheckboxField({ label, name, defaultChecked }: { label: string; name: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="size-4 rounded border-slate-300 accent-brand-600" />
      {label}
    </label>
  );
}
