"use client";

import { useEffect, useState } from "react";
import { useRequireAuth } from "@/components/require-auth";
import { apiFetch, ApiError } from "@/lib/client-api";

interface Friend {
  friendshipId: string;
  user: { id: string; displayName: string };
}

interface InventoryEntry {
  id: string;
  item: { id: string; name: string; tradeable: boolean };
}

interface TradeRow {
  id: string;
  status: string;
  fromUserId: string;
  toUserId: string;
  fromUser: { displayName: string };
  toUser: { displayName: string };
  fromItem: { item: { name: string } };
  toItem: { item: { name: string } };
}

export default function TradePage() {
  const { user, loading } = useRequireAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [myItems, setMyItems] = useState<InventoryEntry[]>([]);
  const [theirItems, setTheirItems] = useState<InventoryEntry[]>([]);
  const [selectedFriend, setSelectedFriend] = useState("");
  const [myItemId, setMyItemId] = useState("");
  const [theirItemId, setTheirItemId] = useState("");
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function loadTrades() {
    const data = await apiFetch<{ trades: TradeRow[] }>("/api/trades");
    setTrades(data.trades);
  }

  useEffect(() => {
    if (!user) return;
    apiFetch<{ accepted: Friend[] }>("/api/friends").then((d) => setFriends(d.accepted));
    apiFetch<{ items: InventoryEntry[] }>("/api/inventory").then((d) =>
      setMyItems(d.items.filter((i) => i.item.tradeable))
    );
    loadTrades();
  }, [user]);

  useEffect(() => {
    if (!selectedFriend) {
      setTheirItems([]);
      return;
    }
    apiFetch<{ items: InventoryEntry[] }>(`/api/users/${selectedFriend}/inventory`).then((d) => setTheirItems(d.items));
  }, [selectedFriend]);

  async function propose() {
    setError(null);
    try {
      await apiFetch("/api/trades", {
        json: { toUserId: selectedFriend, fromInventoryItemId: myItemId, toInventoryItemId: theirItemId },
      });
      await loadTrades();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't propose trade");
    }
  }

  async function respond(id: string, action: "accept" | "decline" | "cancel") {
    await apiFetch(`/api/trades/${id}`, { method: "PATCH", json: { action } });
    await loadTrades();
  }

  if (loading || !user) return null;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-bold">Trade</h1>

      <section className="card flex flex-col gap-3 p-4">
        <h2 className="font-semibold">Propose a trade</h2>
        <select value={selectedFriend} onChange={(e) => setSelectedFriend(e.target.value)}>
          <option value="">Pick a friend…</option>
          {friends.map((f) => (
            <option key={f.user.id} value={f.user.id}>
              {f.user.displayName}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <select value={myItemId} onChange={(e) => setMyItemId(e.target.value)} className="flex-1">
            <option value="">Your item…</option>
            {myItems.map((i) => (
              <option key={i.id} value={i.id}>
                {i.item.name}
              </option>
            ))}
          </select>
          <select value={theirItemId} onChange={(e) => setTheirItemId(e.target.value)} className="flex-1">
            <option value="">Their item…</option>
            {theirItems.map((i) => (
              <option key={i.id} value={i.id}>
                {i.item.name}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary self-start" onClick={propose} disabled={!selectedFriend || !myItemId || !theirItemId}>
          Propose trade
        </button>
      </section>

      <section className="card p-4">
        <h2 className="mb-2 font-semibold">Your trades</h2>
        {trades.length === 0 && <p className="text-sm text-black/50 dark:text-white/50">No trades yet.</p>}
        <ul className="flex flex-col gap-2">
          {trades.map((t) => (
            <li key={t.id} className="flex flex-col gap-1 rounded-md border border-[var(--border)] p-2 text-sm">
              <span>
                {t.fromUser.displayName}&apos;s {t.fromItem.item.name} ⇄ {t.toUser.displayName}&apos;s{" "}
                {t.toItem.item.name} — <em>{t.status}</em>
              </span>
              {t.status === "PENDING" && t.toUserId === user.id && (
                <span className="flex gap-2">
                  <button className="btn-primary text-xs" onClick={() => respond(t.id, "accept")}>
                    Accept
                  </button>
                  <button className="btn-secondary text-xs" onClick={() => respond(t.id, "decline")}>
                    Decline
                  </button>
                </span>
              )}
              {t.status === "PENDING" && t.fromUserId === user.id && (
                <button className="btn-secondary self-start text-xs" onClick={() => respond(t.id, "cancel")}>
                  Cancel
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
