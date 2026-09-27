import { ShieldAlert } from "lucide-react";
import Link from "next/link";

export default function NoAccessPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="card max-w-md p-8 text-center">
        <ShieldAlert className="mx-auto size-10 text-accent-500" />
        <h1 className="mt-4 font-serif text-2xl font-semibold">No access</h1>
        <p className="mt-2 text-sm text-slate-600">Your role does not include access to that page. Ask an administrator if you think this is a mistake.</p>
        <Link href="/dashboard" className="btn-primary mt-6">
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
