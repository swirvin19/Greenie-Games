"use client";

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

  if (!user) return null;

  async function logout() {
    await apiFetch("/api/auth/logout", { json: {} });
    await refresh();
    router.push("/login");
  }

  return (
    <header className="border-b border-[var(--border)] bg-[var(--card)]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
        <Link href="/dashboard" className="text-lg font-bold text-[var(--accent)]">
          ⛳ Greeni
        </Link>
        <nav className="flex flex-1 flex-wrap gap-1 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/10"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/profile" className="font-medium hover:underline">
            {user.displayName}
          </Link>
          <button onClick={logout} className="btn-secondary text-xs">
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
