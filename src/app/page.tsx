"use client";

import Image from "next/image";
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
    <div className="brand-gradient-bg flex min-h-[70vh] flex-col items-center justify-center gap-6 rounded-2xl px-4 py-16 text-center">
      <Image
        src="/greeni-logo.png"
        alt="Greeni Games"
        width={220}
        height={220}
        priority
        className="drop-shadow-[0_0_40px_rgba(207,230,0,0.25)]"
      />
      <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
        <span className="glow-text">Play golf.</span>{" "}
        <span style={{ color: "var(--accent2)" }}>Talk trash.</span>
      </h1>
      <p className="max-w-xl text-lg text-[var(--muted)]">
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
