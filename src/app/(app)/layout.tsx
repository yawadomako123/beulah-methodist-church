import { AppNav, type NavItem } from "@/components/app-nav";
import { SignOutButton } from "@/components/sign-out-button";
import { Avatar } from "@/components/ui";
import { pendingCount } from "@/lib/admin";
import { can, ROLE_LABELS, type Permission } from "@/lib/permissions";
import { requireUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";

const NAV: (NavItem & { permission?: Permission })[] = [
  { href: "/dashboard", label: "Dashboard", short: "Home", icon: "dashboard" },
  { href: "/members", label: "Members", icon: "members", section: "People", permission: "members:view" },
  { href: "/households", label: "Households", icon: "households", section: "People", permission: "members:view" },
  { href: "/groups", label: "Groups & Classes", short: "Groups", icon: "groups", section: "People", permission: "groups:view" },
  { href: "/events", label: "Events & Attendance", short: "Events", icon: "events", section: "Church life" },
  { href: "/announcements", label: "Announcements", short: "News", icon: "announcements", section: "Church life" },
  { href: "/messages", label: "Messages", icon: "messages", section: "Church life", permission: "messages:send" },
  { href: "/giving", label: "Giving", icon: "giving", section: "Finance", permission: "giving:view" },
  { href: "/reports", label: "Reports", icon: "reports", section: "Finance", permission: "reports:view" },
  { href: "/me", label: "My profile", short: "Profile", icon: "me", section: "Me" },
  { href: "/admin", label: "Admin centre", short: "Admin", icon: "admin", section: "Administration", permission: "users:manage" },
  { href: "/admin/users", label: "Users & roles", icon: "users", section: "Administration", permission: "users:manage" },
  { href: "/admin/settings", label: "Settings", icon: "settings", section: "Administration", permission: "settings:manage" },
  { href: "/admin/audit", label: "Audit log", icon: "audit", section: "Administration", permission: "audit:view" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const settings = await getSettings();
  const items = NAV.filter((i) => !i.permission || can(user.role, i.permission)).map(({ permission: _p, ...rest }) => rest);
  const pending = can(user.role, "users:manage") ? await pendingCount() : 0;
  const badges: Record<string, number> = pending ? { "/admin": pending, "/admin/users": pending } : {};

  return (
    <div className="min-h-dvh">
      <AppNav
        items={items}
        badges={badges}
        churchName={settings.shortName || settings.churchName}
        footer={
          <div className="flex items-center gap-3 px-2 text-white">
            <Avatar name={user.name} src={user.image} size={34} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-brand-200">{ROLE_LABELS[user.role]}</p>
            </div>
            <SignOutButton iconOnly className="rounded-lg p-2 text-brand-200 hover:bg-white/10 hover:text-white" />
          </div>
        }
      />
      {/* Bottom padding leaves room for the phone tab bar (plus the home-indicator safe area). */}
      <main className="pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0 lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
