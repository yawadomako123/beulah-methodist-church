import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { InstallAppButton } from "@/components/pwa";
import { getCurrentUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { SignInButtons } from "./sign-in-buttons";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.active ? "/dashboard" : "/pending");
  const s = await getSettings();
  const devLogin = process.env.NODE_ENV !== "production" && process.env.ALLOW_DEV_LOGIN === "true";

  return (
    <main className="flex min-h-dvh flex-col lg:flex-row">
      {/* Brand panel: a banner on phones, a full column on desktop */}
      <div className="relative overflow-hidden bg-brand-800 px-6 pt-[calc(2rem+env(safe-area-inset-top))] pb-8 text-white lg:flex lg:flex-1 lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute -top-24 -right-24 size-80 rounded-full bg-brand-600/50 lg:size-96" />
        <div className="absolute -bottom-32 -left-16 size-72 rounded-full bg-gold-400/10" />
        <div className="relative flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Methodist Church Ghana logo" className="size-16 lg:size-20" />
          <div>
            <p className="font-serif text-xl leading-tight font-semibold lg:text-2xl">{s.churchName}</p>
            <p className="text-sm text-gold-300">The Methodist Church Ghana</p>
          </div>
        </div>
        <blockquote className="relative mt-8 hidden max-w-md lg:block">
          <p className="font-serif text-3xl leading-snug">&ldquo;The world is my parish.&rdquo;</p>
          <footer className="mt-3 text-brand-200">John Wesley</footer>
        </blockquote>
        <p className="relative hidden text-sm text-brand-200 lg:block">Your Kingdom Come · Membership · Classes · Attendance · Giving</p>
        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-gold-400 to-accent-500 lg:hidden" />
      </div>

      <div className="flex flex-1 items-start justify-center px-6 py-10 pb-[calc(2.5rem+env(safe-area-inset-bottom))] lg:items-center">
        <div className="w-full max-w-sm">
          <h1 className="font-serif text-3xl font-semibold">Welcome</h1>
          <p className="mt-2 mb-8 text-sm text-slate-500">Sign in to the {s.churchName} management system with your Google account.</p>
          <SignInButtons devLogin={devLogin} />
          <p className="mt-8 text-xs leading-relaxed text-slate-500">
            New here? After you sign in, a church administrator approves your access. Members whose email is already on the church register are
            approved automatically.
          </p>
          <InstallAppButton className="btn-secondary mt-6 w-full" />
        </div>
      </div>
    </main>
  );
}
