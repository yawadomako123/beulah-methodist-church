import { Clock } from "lucide-react";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { getCurrentUser } from "@/lib/session";

export default async function PendingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (user.active) redirect("/dashboard");
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="card max-w-md p-8 text-center">
        <Clock className="mx-auto size-10 text-amber-500" />
        <h1 className="mt-4 font-serif text-2xl font-semibold">Waiting for approval</h1>
        <p className="mt-2 text-sm text-slate-600">
          Thanks, {user.name}. Your account (<strong>{user.email}</strong>) is waiting for a church administrator to approve it. Please check back
          later or contact the church office.
        </p>
        <div className="mt-6">
          <SignOutButton className="btn-secondary" />
        </div>
      </div>
    </main>
  );
}
