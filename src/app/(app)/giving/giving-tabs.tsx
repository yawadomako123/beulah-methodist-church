import Link from "next/link";

const TABS = [
  { href: "/giving", label: "Contributions" },
  { href: "/giving/pledges", label: "Pledges" },
  { href: "/giving/funds", label: "Funds" },
];

export function GivingTabs({ active }: { active: string }) {
  return (
    <nav className="no-print mb-6 flex gap-1 border-b border-slate-200" aria-label="Giving sections">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={active === t.href ? "page" : undefined}
          className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
            active === t.href ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
