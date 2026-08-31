"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/client-api";
import { useSession } from "@/components/session-provider";
import { OAuthButtons } from "@/components/oauth-buttons";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { refresh } = useSession();

  useEffect(() => {
    const oauthError = new URLSearchParams(window.location.search).get("error");
    if (oauthError === "not_configured") {
      setError("That sign-in option isn't set up yet — use email below, or ask about setting it up.");
    } else if (oauthError === "oauth") {
      setError("That sign-in didn't go through — try again.");
    }
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/api/auth/login", { json: { email, password } });
      await refresh();
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm py-12">
      <h1 className="mb-6 text-2xl font-bold">Log in</h1>
      <OAuthButtons />
      <div className="my-4 flex items-center gap-3 text-xs text-black/40 dark:text-white/40">
        <span className="h-px flex-1 bg-[var(--border)]" />
        or
        <span className="h-px flex-1 bg-[var(--border)]" />
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? "Logging in…" : "Log in"}
        </button>
      </form>
      <p className="mt-4 text-sm">
        No account?{" "}
        <Link href="/signup" className="text-[var(--accent)] hover:underline">
          Sign up
        </Link>
      </p>
      <p className="mt-2 text-xs text-black/50 dark:text-white/50">
        Demo accounts: jon@example.com / dale@example.com / mia@example.com — password
        &quot;password123&quot;
      </p>
    </div>
  );
}
