"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export function SignInButtons({ devLogin }: { devLogin: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function google() {
    setBusy(true);
    setError(null);
    const { error } = await authClient.signIn.social({ provider: "google", callbackURL: "/dashboard" });
    if (error) {
      setError(error.message ?? "Could not start Google sign-in.");
      setBusy(false);
    }
  }

  async function dev(formData: FormData) {
    setError(null);
    const email = String(formData.get("email"));
    const password = String(formData.get("password"));
    const res = await authClient.signIn.email({ email, password });
    if (res.error) {
      const created = await authClient.signUp.email({ email, password, name: email.split("@")[0] });
      if (created.error) return setError(created.error.message ?? "Sign in failed");
    }
    window.location.href = "/dashboard";
  }

  return (
    <div className="space-y-4">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button type="button" onClick={google} disabled={busy} className="btn-secondary w-full py-2.5">
        <GoogleIcon />
        {busy ? "Redirecting to Google…" : "Continue with Google"}
      </button>
      {devLogin && (
        <form action={dev} className="space-y-2 rounded-lg border border-dashed border-amber-300 bg-amber-50 p-3">
          <p className="text-xs font-medium text-amber-800">Development login (disabled in production)</p>
          <input name="email" type="email" required placeholder="email" aria-label="Email" className="input" />
          <input name="password" type="password" required minLength={8} placeholder="password (8+ characters)" aria-label="Password" className="input" />
          <button className="btn-secondary btn-sm w-full">Sign in / create dev account</button>
        </form>
      )}
    </div>
  );
}
