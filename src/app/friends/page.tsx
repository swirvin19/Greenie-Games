"use client";

import { useEffect, useState } from "react";
import { useRequireAuth } from "@/components/require-auth";
import { apiFetch, ApiError } from "@/lib/client-api";

interface FriendRow {
  friendshipId: string;
  status: string;
  requestedByMe: boolean;
  user: { id: string; displayName: string };
}

interface UserSearchResult {
  id: string;
  displayName: string;
  email: string | null;
}

export default function FriendsPage() {
  const { user, loading } = useRequireAuth();
  const [accepted, setAccepted] = useState<FriendRow[]>([]);
  const [incoming, setIncoming] = useState<FriendRow[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRow[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    const data = await apiFetch<{ accepted: FriendRow[]; incomingPending: FriendRow[]; outgoingPending: FriendRow[] }>(
      "/api/friends"
    );
    setAccepted(data.accepted);
    setIncoming(data.incomingPending);
    setOutgoing(data.outgoingPending);
  }

  useEffect(() => {
    if (user) load();
  }, [user]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      apiFetch<{ users: UserSearchResult[] }>(`/api/users?q=${encodeURIComponent(query)}`).then((d) =>
        setResults(d.users)
      );
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  async function sendRequest(email: string) {
    setError(null);
    setNotice(null);
    try {
      await apiFetch("/api/friends", { json: { email } });
      setNotice("Friend request sent");
      setQuery("");
      setResults([]);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send request");
    }
  }

  async function respond(friendshipId: string, action: "accept" | "block") {
    await apiFetch(`/api/friends/${friendshipId}`, { method: "PATCH", json: { action } });
    await load();
  }

  async function cancel(friendshipId: string) {
    await apiFetch(`/api/friends/${friendshipId}`, { method: "DELETE" });
    await load();
  }

  if (loading || !user) return null;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-bold">Friends</h1>

      <section className="card p-4">
        <h2 className="mb-2 font-semibold">Add a friend</h2>
        <input placeholder="Search by name or email…" value={query} onChange={(e) => setQuery(e.target.value)} />
        {notice && <p className="mt-1 text-sm text-[var(--accent)]">{notice}</p>}
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        <ul className="mt-2 flex flex-col gap-1">
          {results.map((r) => (
            <li key={r.id} className="flex items-center justify-between rounded-md p-1.5 hover:bg-black/5 dark:hover:bg-white/10">
              <span>{r.displayName}</span>
              <button className="btn-secondary text-xs" onClick={() => r.email && sendRequest(r.email)}>
                Add
              </button>
            </li>
          ))}
        </ul>
      </section>

      {incoming.length > 0 && (
        <section className="card p-4">
          <h2 className="mb-2 font-semibold">Requests</h2>
          <ul className="flex flex-col gap-2">
            {incoming.map((f) => (
              <li key={f.friendshipId} className="flex items-center justify-between">
                <span>{f.user.displayName}</span>
                <span className="flex gap-2">
                  <button className="btn-primary text-xs" onClick={() => respond(f.friendshipId, "accept")}>
                    Accept
                  </button>
                  <button className="btn-secondary text-xs" onClick={() => cancel(f.friendshipId)}>
                    Decline
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {outgoing.length > 0 && (
        <section className="card p-4">
          <h2 className="mb-2 font-semibold">Sent requests</h2>
          <ul className="flex flex-col gap-2 text-sm text-black/60 dark:text-white/60">
            {outgoing.map((f) => (
              <li key={f.friendshipId} className="flex items-center justify-between">
                <span>{f.user.displayName} — pending</span>
                <button className="btn-secondary text-xs" onClick={() => cancel(f.friendshipId)}>
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card p-4">
        <h2 className="mb-2 font-semibold">Your friends</h2>
        {accepted.length === 0 && <p className="text-sm text-black/50 dark:text-white/50">No friends yet.</p>}
        <ul className="flex flex-col gap-1">
          {accepted.map((f) => (
            <li key={f.friendshipId}>{f.user.displayName}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
