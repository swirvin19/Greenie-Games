"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRequireAuth } from "@/components/require-auth";
import { apiFetch } from "@/lib/client-api";

interface RoundSummary {
  id: string;
  status: "IN_PROGRESS" | "COMPLETED";
  courseName: string | null;
  course: { name: string } | null;
  owner: { id: string; displayName: string };
  startedAt: string;
}

interface ProgressResponse {
  counters: {
    roundsCompleted: number;
    holesLogged: number;
    distinctFriendsPlayedWith: number;
    invitesConverted: number;
  };
  passes: { id: string; name: string }[];
}

export default function DashboardPage() {
  const { user, loading } = useRequireAuth();
  const [rounds, setRounds] = useState<{ mine: RoundSummary[]; following: RoundSummary[]; friendsLive: RoundSummary[] } | null>(
    null
  );
  const [progress, setProgress] = useState<ProgressResponse | null>(null);

  useEffect(() => {
    if (!user) return;
    apiFetch<{ mine: RoundSummary[]; following: RoundSummary[]; friendsLive: RoundSummary[] }>("/api/rounds").then(setRounds);
    apiFetch<ProgressResponse>("/api/progress").then(setProgress);
  }, [user]);

  if (loading || !user) return null;

  const inProgress = rounds?.mine.filter((r) => r.status === "IN_PROGRESS") ?? [];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Hey {user.displayName} 👋</h1>
        <Link href="/rounds/new" className="btn-primary">
          Start a round
        </Link>
      </div>

      {inProgress.length > 0 && (
        <section className="card p-4">
          <h2 className="mb-2 font-semibold text-[var(--accent)]">Your round in progress</h2>
          {inProgress.map((r) => (
            <Link
              key={r.id}
              href={`/rounds/${r.id}`}
              className="block rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/10"
            >
              {r.course?.name ?? r.courseName ?? "Round"} — started{" "}
              {new Date(r.startedAt).toLocaleString()}
            </Link>
          ))}
        </section>
      )}

      {progress && (
        <section className="card p-4">
          <h2 className="mb-3 font-semibold">Your progress</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Rounds" value={progress.counters.roundsCompleted} />
            <Stat label="Holes logged" value={progress.counters.holesLogged} />
            <Stat label="Friends played with" value={progress.counters.distinctFriendsPlayedWith} />
            <Stat label="Invites converted" value={progress.counters.invitesConverted} />
          </div>
          {progress.passes.length > 0 && (
            <Link href="/season-pass" className="mt-3 inline-block text-sm text-[var(--accent)] hover:underline">
              View {progress.passes[0].name} rewards →
            </Link>
          )}
        </section>
      )}

      <section className="card p-4">
        <h2 className="mb-2 font-semibold">Friends playing right now</h2>
        {rounds && rounds.friendsLive.length === 0 && (
          <p className="text-sm text-black/60 dark:text-white/60">Nobody&apos;s live right now.</p>
        )}
        <ul className="flex flex-col gap-2">
          {rounds?.friendsLive.map((r) => (
            <li key={r.id}>
              <Link
                href={`/rounds/${r.id}`}
                className="flex items-center justify-between rounded-lg border border-[var(--border)] p-3 hover:bg-black/5 dark:hover:bg-white/10"
              >
                <span>
                  <strong>{r.owner.displayName}</strong> at {r.course?.name ?? r.courseName ?? "a course"}
                </span>
                <span className="text-xs uppercase tracking-wide text-[var(--accent)]">Live</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {rounds && rounds.following.length > 0 && (
        <section className="card p-4">
          <h2 className="mb-2 font-semibold">Rounds you&apos;re following</h2>
          <ul className="flex flex-col gap-2">
            {rounds.following.map((r) => (
              <li key={r.id}>
                <Link href={`/rounds/${r.id}`} className="hover:underline">
                  {r.owner.displayName} — {r.course?.name ?? r.courseName ?? "Round"} ({r.status})
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {rounds && rounds.mine.filter((r) => r.status === "COMPLETED").length > 0 && (
        <section className="card p-4">
          <h2 className="mb-2 font-semibold">Your recent rounds</h2>
          <ul className="flex flex-col gap-2">
            {rounds.mine
              .filter((r) => r.status === "COMPLETED")
              .slice(0, 5)
              .map((r) => (
                <li key={r.id}>
                  <Link href={`/rounds/${r.id}`} className="hover:underline">
                    {r.course?.name ?? r.courseName ?? "Round"} —{" "}
                    {new Date(r.startedAt).toLocaleDateString()}
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-black/5 p-3 text-center dark:bg-white/5">
      <div className="text-xl font-bold text-[var(--accent)]">{value}</div>
      <div className="text-xs text-black/60 dark:text-white/60">{label}</div>
    </div>
  );
}
