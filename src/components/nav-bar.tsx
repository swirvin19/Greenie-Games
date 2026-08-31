"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/session-provider";
import { apiFetch } from "@/lib/client-api";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/rounds/new", label: "New Round" },
  { href: "/friends", label: "Friends" },
  { href: "/trade", label: "Trade" },
  { href: "/inventory", label: "Inventory" },
  { href: "/season-pass", label: "Season Pass" },
  { href: "/chat", label: "Chat" },
];

export function NavBar() {
  const { user, refresh } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  async function logout() {
    await apiFetch("/api/auth/logout", { json: {} });
    await refresh();
    router.push("/login");
  }

  return (
    <header className="border-b border-[var(--border)] bg-[var(--card)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-lg font-extrabold"
          onClick={() => setOpen(false)}
        >
          <Image src="/greeni-mascot.png" alt="" width={32} height={26} className="shrink-0" />
          <span className="glow-text">Greeni Games</span>
        </Link>

        <nav className="hidden flex-1 flex-wrap gap-1 text-sm sm:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-1.5 hover:bg-white/5"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 text-sm sm:flex">
          <Link href="/profile" className="font-medium hover:underline">
            {user.displayName}
          </Link>
          <button onClick={logout} className="btn-secondary text-xs">
            Log out
          </button>
        </div>

        <button
          className="btn-secondary text-sm sm:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-[var(--border)] px-4 py-3 text-sm sm:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-2 hover:bg-white/5"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          <div className="mt-2 flex items-center justify-between border-t border-[var(--border)] pt-3">
            <Link href="/profile" className="font-medium hover:underline" onClick={() => setOpen(false)}>
              {user.displayName}
            </Link>
            <button onClick={logout} className="btn-secondary text-xs">
              Log out
            </button>
          </div>
        </nav>
      )}
    </header>
  );
}
