import clsx from "clsx";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-6">
      {back && (
        <Link href={back.href} className="no-print mb-2 inline-block text-sm text-slate-500 hover:text-slate-800">
          ← {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold sm:text-3xl">{title}</h1>
          {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
        </div>
        {actions && <div className="no-print flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function Card({ title, actions, children, className, bodyClassName }: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={clsx("card", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 sm:px-5">
          {title && <h2 className="text-sm font-semibold text-slate-900">{title}</h2>}
          {actions}
        </div>
      )}
      <div className={clsx(bodyClassName ?? "p-4 sm:p-5")}>{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint, icon }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-slate-500 sm:text-sm">{label}</p>
        {icon && <span className="hidden text-brand-500 sm:block">{icon}</span>}
      </div>
      <p className="mt-1.5 text-[clamp(1rem,4.6vw,1.5rem)] leading-tight font-semibold text-slate-900 tabular-nums sm:mt-2 sm:text-2xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

const badgeColors = {
  gray: "bg-slate-100 text-slate-700",
  blue: "bg-brand-50 text-brand-700",
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-800",
  red: "bg-red-50 text-red-700",
  purple: "bg-violet-50 text-violet-700",
};

export function Badge({ color = "gray", children }: { color?: keyof typeof badgeColors; children: ReactNode }) {
  return (
    <span className={clsx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", badgeColors[color])}>
      {children}
    </span>
  );
}

export function statusColor(status: string): keyof typeof badgeColors {
  switch (status) {
    case "active":
      return "green";
    case "visitor":
      return "blue";
    case "inactive":
      return "amber";
    case "deceased":
      return "gray";
    case "transferred":
      return "purple";
    default:
      return "gray";
  }
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="font-medium text-slate-900">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Field({
  label,
  name,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
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

export function Input({ name, error, ...props }: ComponentProps<"input"> & { name: string; error?: string }) {
  return <input id={name} name={name} aria-invalid={error ? true : undefined} className="input" {...props} />;
}

export function Textarea({ name, error, ...props }: ComponentProps<"textarea"> & { name: string; error?: string }) {
  return <textarea id={name} name={name} rows={3} aria-invalid={error ? true : undefined} className="input" {...props} />;
}

export function Select({
  name,
  options,
  placeholder,
  error,
  ...props
}: Omit<ComponentProps<"select">, "children"> & {
  name: string;
  options: readonly (string | { value: string | number; label: string })[];
  placeholder?: string;
  error?: string;
}) {
  return (
    <select id={name} name={name} aria-invalid={error ? true : undefined} className="input" {...props}>
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
  );
}

export function Avatar({ name, src, size = 40 }: { name: string; src?: string | null; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" width={size} height={size} className="rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials || "?"}
    </span>
  );
}

export function Pagination({ page, totalPages, makeHref }: { page: number; totalPages: number; makeHref: (p: number) => string }) {
  if (totalPages <= 1) return null;
  return (
    <div className="no-print flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm">
      <span className="text-slate-500">
        Page {page} of {totalPages}
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link className="btn-secondary btn-sm" href={makeHref(page - 1)}>
            Previous
          </Link>
        ) : (
          <span className="btn-secondary btn-sm opacity-50">Previous</span>
        )}
        {page < totalPages ? (
          <Link className="btn-secondary btn-sm" href={makeHref(page + 1)}>
            Next
          </Link>
        ) : (
          <span className="btn-secondary btn-sm opacity-50">Next</span>
        )}
      </div>
    </div>
  );
}
