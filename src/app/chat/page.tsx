"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/components/require-auth";
import { apiFetch, ApiError } from "@/lib/client-api";

interface Friend {
  friendshipId: string;
  user: { id: string; displayName: string };
}

interface ThreadRow {
  id: string;
  type: string;
  participants: { user: { id: string; displayName: string } }[];
  messages: { body: string; createdAt: string }[];
  round: { id: string } | null;
}

export default function ChatListPage() {
  const { user, loading } = useRequireAuth();
  const router = useRouter();
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const data = await apiFetch<{ threads: ThreadRow[] }>("/api/threads");
    setThreads(data.threads.filter((t) => t.type !== "ROUND"));
  }

  useEffect(() => {
    if (!user) return;
    load();
    apiFetch<{ accepted: Friend[] }>("/api/friends").then((d) => setFriends(d.accepted));
  }, [user]);

  function toggle(id: string) {
    setSelectedFriends((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  async function startChat() {
    setError(null);
    try {
      const { thread } = await apiFetch<{ thread: { id: string } }>("/api/threads", {
        json: { participantIds: selectedFriends },
      });
      router.push(`/chat/${thread.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't start chat");
    }
  }

  if (loading || !user) return null;

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <h1 className="text-2xl font-bold">Chat</h1>

      <section className="card flex flex-col gap-2 p-4">
        <h2 className="font-semibold">Start a chat</h2>
        <div className="flex flex-wrap gap-2">
          {friends.map((f) => (
            <label key={f.user.id} className="flex items-center gap-1 rounded-full border border-[var(--border)] px-2 py-1 text-sm">
              <input type="checkbox" checked={selectedFriends.includes(f.user.id)} onChange={() => toggle(f.user.id)} />
              {f.user.displayName}
            </label>
          ))}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary self-start" onClick={startChat} disabled={selectedFriends.length === 0}>
          Start
        </button>
      </section>

      <section className="flex flex-col gap-2">
        {threads.map((t) => {
          const others = t.participants.filter((p) => p.user.id !== user.id).map((p) => p.user.displayName);
          return (
            <Link key={t.id} href={`/chat/${t.id}`} className="card flex items-center justify-between p-3 hover:bg-black/5 dark:hover:bg-white/10">
              <span>{others.join(", ") || "Just you"}</span>
              <span className="max-w-[50%] truncate text-xs text-black/50 dark:text-white/50">
                {t.messages[0]?.body ?? "No messages yet"}
              </span>
            </Link>
          );
        })}
        {threads.length === 0 && <p className="text-sm text-black/50 dark:text-white/50">No chats yet.</p>}
      </section>
    </div>
  );
}
