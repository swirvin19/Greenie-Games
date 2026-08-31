"use client";

import { useEffect, useState } from "react";
import { useRequireAuth } from "@/components/require-auth";
import { apiFetch, ApiError } from "@/lib/client-api";

interface Reward {
  id: string;
  track: "FREE" | "PREMIUM";
  thresholdType: string;
  thresholdValue: number;
  owned: boolean;
  progressValue: number;
  item: { name: string; description: string | null };
}

interface Pass {
  id: string;
  name: string;
  theme: string | null;
  priceCents: number;
  premiumUnlocked: boolean;
  rewards: Reward[];
}

const THRESHOLD_LABEL: Record<string, string> = {
  ROUNDS_COMPLETED: "rounds completed",
  HOLES_LOGGED: "holes logged",
  FRIENDS_PLAYED_WITH: "friends played with",
  INVITES_CONVERTED: "invites converted",
};

export default function SeasonPassPage() {
  const { user, loading } = useRequireAuth();
  const [passes, setPasses] = useState<Pass[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const data = await apiFetch<{ passes: Pass[] }>("/api/progress");
    setPasses(data.passes);
  }

  useEffect(() => {
    if (user) load();
  }, [user]);

  async function unlockPremium(id: string) {
    setError(null);
    try {
      await apiFetch(`/api/season-passes/${id}/purchase-premium`, { json: {} });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't unlock premium");
    }
  }

  if (loading || !user) return null;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Season Pass</h1>
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      {passes.length === 0 && <p className="text-sm text-[var(--muted)]">No active pass right now.</p>}
      {passes.map((pass) => (
        <section key={pass.id} className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">{pass.name}</h2>
              {pass.theme && <p className="text-xs text-[var(--muted)]">{pass.theme}</p>}
            </div>
            {!pass.premiumUnlocked && (
              <button className="btn-primary text-sm" onClick={() => unlockPremium(pass.id)}>
                Unlock premium — ${(pass.priceCents / 100).toFixed(2)}
              </button>
            )}
            {pass.premiumUnlocked && <span className="text-sm text-[var(--accent)]">Premium unlocked</span>}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {["FREE", "PREMIUM"].map((track) => (
              <div key={track}>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  {track} track
                </h3>
                <ul className="flex flex-col gap-1">
                  {pass.rewards
                    .filter((r) => r.track === track)
                    .map((r) => (
                      <li
                        key={r.id}
                        className={`flex items-center justify-between rounded-md border p-2 text-sm ${
                          r.owned ? "border-[var(--accent)]" : "border-[var(--border)]"
                        }`}
                      >
                        <span>
                          {r.item.name}
                          <br />
                          <span className="text-xs text-[var(--muted)]">
                            {r.progressValue}/{r.thresholdValue} {THRESHOLD_LABEL[r.thresholdType]}
                          </span>
                        </span>
                        {r.owned ? (
                          <span className="text-xs text-[var(--accent)]">Owned</span>
                        ) : (
                          <span className="text-xs text-[var(--muted)]">Locked</span>
                        )}
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
