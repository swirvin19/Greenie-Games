"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/session-provider";

export default function HomePage() {
  const { user, loading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  if (loading || user) return null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 py-16 text-center">
      <h1 className="text-4xl font-bold">
        ⛳ Welcome to <span className="text-[var(--accent)]">Greeni</span>
      </h1>
      <p className="text-lg text-black/70 dark:text-white/70">
        Track rounds, run every side game your foursome plays, trade cosmetics,
        and needle your friends with informal remote wagers — all free.
      </p>
      <div className="flex gap-3">
        <Link href="/signup" className="btn-primary">
          Create an account
        </Link>
        <Link href="/login" className="btn-secondary">
          Log in
        </Link>
      </div>
    </div>
  );
}
