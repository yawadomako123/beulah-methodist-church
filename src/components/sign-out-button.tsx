"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignOutButton({ className, iconOnly }: { className?: string; iconOnly?: boolean }) {
  const router = useRouter();
  if (iconOnly) {
    return (
      <button
        type="button"
        aria-label="Sign out"
        title="Sign out"
        className={className}
        onClick={async () => {
          await authClient.signOut();
          router.push("/sign-in");
          router.refresh();
        }}
      >
        <LogOut className="size-4" />
      </button>
    );
  }
  return (
    <button
      type="button"
      className={className ?? "btn-ghost btn-sm"}
      onClick={async () => {
        await authClient.signOut();
        router.push("/sign-in");
        router.refresh();
      }}
    >
      <LogOut className="size-4" /> Sign out
    </button>
  );
}
