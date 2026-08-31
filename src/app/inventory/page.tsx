"use client";

import { useEffect, useState } from "react";
import { useRequireAuth } from "@/components/require-auth";
import { apiFetch } from "@/lib/client-api";

interface InventoryEntry {
  id: string;
  equipped: boolean;
  acquiredVia: string;
  item: { id: string; name: string; type: string; description: string | null; imageUrl: string; tradeable: boolean };
}

const TYPE_LABEL: Record<string, string> = {
  MASCOT_SKIN: "Mascot skin",
  COLOR_SCHEME: "Color scheme",
  BANNER_STYLE: "Banner style",
  ICON: "Icon",
};

export default function InventoryPage() {
  const { user, loading } = useRequireAuth();
  const [items, setItems] = useState<InventoryEntry[]>([]);

  async function load() {
    const data = await apiFetch<{ items: InventoryEntry[] }>("/api/inventory");
    setItems(data.items);
  }

  useEffect(() => {
    if (user) load();
  }, [user]);

  async function equip(id: string) {
    await apiFetch(`/api/inventory/${id}/equip`, { json: {} });
    await load();
  }

  if (loading || !user) return null;

  const byType = items.reduce<Record<string, InventoryEntry[]>>((acc, i) => {
    (acc[i.item.type] ??= []).push(i);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Inventory</h1>
      {items.length === 0 && (
        <p className="text-sm text-black/50 dark:text-white/50">
          Nothing yet — complete rounds to earn Season Pass cosmetics.
        </p>
      )}
      {Object.entries(byType).map(([type, entries]) => (
        <section key={type} className="card p-4">
          <h2 className="mb-3 font-semibold">{TYPE_LABEL[type] ?? type}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {entries.map((e) => (
              <div key={e.id} className="flex flex-col items-center gap-2 rounded-lg border border-[var(--border)] p-3 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-md bg-black/5 text-2xl dark:bg-white/10">
                  🏆
                </div>
                <span className="text-sm font-medium">{e.item.name}</span>
                {e.equipped ? (
                  <span className="text-xs text-[var(--accent)]">Equipped</span>
                ) : (
                  <button className="btn-secondary text-xs" onClick={() => equip(e.id)}>
                    Equip
                  </button>
                )}
                {!e.item.tradeable && <span className="text-[10px] text-black/40 dark:text-white/40">Not tradeable</span>}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
