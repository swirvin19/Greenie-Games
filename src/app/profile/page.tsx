"use client";

import { useEffect, useState } from "react";
import { useRequireAuth } from "@/components/require-auth";
import { apiFetch } from "@/lib/client-api";

interface BlockRow {
  id: string;
  blocked: { id: string; displayName: string };
}

export default function ProfilePage() {
  const { user, loading } = useRequireAuth();
  const [blocks, setBlocks] = useState<BlockRow[]>([]);

  async function load() {
    const data = await apiFetch<{ blocks: BlockRow[] }>("/api/blocks");
    setBlocks(data.blocks);
  }

  useEffect(() => {
    if (user) load();
  }, [user]);

  async function unblock(id: string) {
    await apiFetch(`/api/blocks/${id}`, { method: "DELETE" });
    await load();
  }

  if (loading || !user) return null;

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <h1 className="text-2xl font-bold">Profile</h1>
      <section className="card p-4">
        <h2 className="mb-2 font-semibold">Account</h2>
        <p className="text-sm">
          <strong>{user.displayName}</strong>
        </p>
        <p className="text-sm text-[var(--muted)]">{user.email}</p>
      </section>

      <section className="card p-4">
        <h2 className="mb-2 font-semibold">Blocked users</h2>
        {blocks.length === 0 && <p className="text-sm text-[var(--muted)]">Nobody blocked.</p>}
        <ul className="flex flex-col gap-2">
          {blocks.map((b) => (
            <li key={b.id} className="flex items-center justify-between text-sm">
              <span>{b.blocked.displayName}</span>
              <button className="btn-secondary text-xs" onClick={() => unblock(b.blocked.id)}>
                Unblock
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
