"use client";

import clsx from "clsx";
import {
  BarChart3,
  CalendarDays,
  HandCoins,
  Home,
  LayoutDashboard,
  Mail,
  Megaphone,
  Menu,
  ScrollText,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { InstallAppButton } from "./pwa";

const ICONS = {
  dashboard: LayoutDashboard,
  members: Users,
  households: Home,
  groups: UsersRound,
  events: CalendarDays,
  giving: HandCoins,
  announcements: Megaphone,
  messages: Mail,
  reports: BarChart3,
  me: UserRound,
  users: ShieldCheck,
  settings: Settings,
  audit: ScrollText,
};

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS; section?: string; short?: string };

/** Order in which items earn a place in the phone tab bar (first four the user can access). */
const TAB_PRIORITY = ["/dashboard", "/members", "/events", "/giving", "/groups", "/announcements", "/me"];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

function Logo({ size = 36 }: { size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo.png" alt="" width={size} height={size} className="shrink-0" style={{ width: size, height: size }} />;
}

export function AppNav({ items, churchName, footer }: { items: NavItem[]; churchName: string; footer: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the drawer on navigation and on Escape; lock page scroll while it is open.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  const sections = items.reduce<Record<string, NavItem[]>>((acc, item) => {
    (acc[item.section ?? ""] ??= []).push(item);
    return acc;
  }, {});

  const tabs = TAB_PRIORITY.map((href) => items.find((i) => i.href === href))
    .filter((i): i is NavItem => !!i)
    .slice(0, 4);
  const moreActive = !tabs.some((t) => isActive(pathname, t.href));

  const nav = (
    <nav className="flex h-full flex-col" aria-label="Main">
      <Link href="/dashboard" className="flex items-center gap-3 px-5 pt-5 pb-4 text-white">
        <Logo size={40} />
        <span className="font-serif text-lg leading-tight font-semibold">{churchName}</span>
      </Link>
      <div className="mx-5 mb-3 h-1 rounded-full bg-gradient-to-r from-gold-400 via-gold-400 to-accent-500" />
      <div className="flex-1 space-y-5 overflow-y-auto overscroll-contain px-3 py-2">
        {Object.entries(sections).map(([section, list]) => (
          <div key={section}>
            {section && <p className="mb-1 px-3 text-[11px] font-semibold tracking-wider text-brand-300 uppercase">{section}</p>}
            <ul className="space-y-0.5">
              {list.map((item) => {
                const Icon = ICONS[item.icon];
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={clsx(
                        "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition lg:py-2",
                        active ? "bg-white/12 text-white" : "text-brand-100 hover:bg-white/8 hover:text-white",
                      )}
                    >
                      {active && <span className="absolute inset-y-1.5 left-0 w-1 rounded-r-full bg-gold-400" aria-hidden />}
                      <Icon className={clsx("size-4.5 shrink-0", active && "text-gold-400")} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <div className="space-y-2 border-t border-white/10 p-3 pb-safe">
        <InstallAppButton className="w-full rounded-lg bg-gold-400 px-3 py-2 text-sm font-semibold text-brand-900 hover:bg-gold-300" />
        {footer}
      </div>
    </nav>
  );

  return (
    <>
      {/* Phone / tablet top bar */}
      <header className="no-print sticky top-0 z-30 bg-brand-800 text-white shadow-sm pt-safe lg:hidden">
        <div className="flex h-14 items-center justify-between gap-3 px-4">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5">
            <Logo size={32} />
            <span className="truncate font-serif font-semibold">{churchName}</span>
          </Link>
          <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open} className="-mr-2 rounded-lg p-2 hover:bg-white/10">
            <Menu className="size-6" />
          </button>
        </div>
        <div className="h-0.5 bg-gradient-to-r from-gold-400 to-accent-500" />
      </header>

      {/* Slide-out drawer */}
      <div className={clsx("no-print fixed inset-0 z-50 lg:hidden", open ? "visible" : "invisible")} aria-hidden={!open}>
        <div
          className={clsx("absolute inset-0 bg-slate-900/60 transition-opacity", open ? "opacity-100" : "opacity-0")}
          onClick={() => setOpen(false)}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className={clsx(
            "absolute inset-y-0 left-0 w-[85%] max-w-xs bg-brand-800 pt-safe shadow-xl transition-transform duration-200",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="absolute top-3 right-3 z-10 rounded-lg p-2 text-white hover:bg-white/10"
            style={{ marginTop: "env(safe-area-inset-top)" }}
          >
            <X className="size-5" />
          </button>
          {open && nav}
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="no-print fixed inset-y-0 left-0 z-20 hidden w-64 bg-brand-800 lg:block">{nav}</aside>

      {/* Phone / tablet bottom tab bar */}
      <nav
        aria-label="Quick navigation"
        className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur pb-safe lg:hidden"
      >
        <ul className="mx-auto flex max-w-lg">
          {tabs.map((t) => {
            const Icon = ICONS[t.icon];
            const active = isActive(pathname, t.href);
            return (
              <li key={t.href} className="flex-1">
                <Link
                  href={t.href}
                  aria-current={active ? "page" : undefined}
                  className={clsx("flex flex-col items-center gap-0.5 pt-2 pb-1.5 text-[11px] font-medium", active ? "text-brand-700" : "text-slate-500")}
                >
                  <span className={clsx("flex h-7 w-12 items-center justify-center rounded-full transition", active && "bg-gold-400/80")}>
                    <Icon className="size-5" />
                  </span>
                  {t.short ?? t.label}
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className={clsx("flex w-full flex-col items-center gap-0.5 pt-2 pb-1.5 text-[11px] font-medium", moreActive ? "text-brand-700" : "text-slate-500")}
            >
              <span className={clsx("flex h-7 w-12 items-center justify-center rounded-full", moreActive && "bg-gold-400/80")}>
                <Menu className="size-5" />
              </span>
              More
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
