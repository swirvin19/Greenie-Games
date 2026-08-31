"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/components/require-auth";
import { apiFetch, ApiError } from "@/lib/client-api";
import type { GameType } from "@/lib/games/types";

interface Friend {
  friendshipId: string;
  user: { id: string; displayName: string };
}

interface Course {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  teeBoxes: { id: string; name: string }[];
}

const GAME_OPTIONS: { type: GameType; label: string; hint: string }[] = [
  { type: "NASSAU", label: "Nassau", hint: "Front 9 / back 9 / overall match play" },
  { type: "SKINS", label: "Skins", hint: "Lowest score wins the hole outright" },
  { type: "STABLEFORD", label: "Stableford", hint: "Points per hole relative to par" },
  { type: "VEGAS", label: "Vegas", hint: "2v2 teams, combined-digit scoring" },
  { type: "WOLF", label: "Wolf", hint: "Rotating wolf vs. the field" },
  { type: "BANKER", label: "Banker", hint: "Rotating banker plays everyone" },
  { type: "GREENIE", label: "Greenie", hint: "Closest to the pin on par 3s" },
  { type: "KOTG", label: "King of the Green", hint: "Point per green hit in regulation" },
  { type: "BOMB", label: "Bomb", hint: "Longest drive on non-par-3s" },
  { type: "VAULT", label: "Vault", hint: "Pooled bonus, most holes won takes it" },
  { type: "CHAOS", label: "Chaos Mode", hint: "A random game each hole" },
];

export default function NewRoundPage() {
  const { user, loading } = useRequireAuth();
  const router = useRouter();

  const [friends, setFriends] = useState<Friend[]>([]);
  const [courseMode, setCourseMode] = useState<"search" | "manual">("search");
  const [courseQuery, setCourseQuery] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [manualName, setManualName] = useState("");
  const [holeCount, setHoleCount] = useState(9);
  const [pars, setPars] = useState<number[]>(Array(9).fill(4));

  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [enabledGames, setEnabledGames] = useState<GameType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    setSelectedPlayerIds([user.id]);
    apiFetch<{ accepted: Friend[] }>("/api/friends").then((d) => setFriends(d.accepted));
  }, [user]);

  useEffect(() => {
    if (courseMode !== "search") return;
    const t = setTimeout(() => {
      apiFetch<{ courses: Course[] }>(`/api/courses?q=${encodeURIComponent(courseQuery)}`).then((d) =>
        setCourses(d.courses)
      );
    }, 250);
    return () => clearTimeout(t);
  }, [courseQuery, courseMode]);

  function togglePlayer(id: string) {
    setSelectedPlayerIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  function toggleGame(type: GameType) {
    setEnabledGames((prev) => (prev.includes(type) ? prev.filter((g) => g !== type) : [...prev, type]));
  }

  function updateHoleCount(n: number) {
    setHoleCount(n);
    setPars((prev) => {
      const next = [...prev];
      while (next.length < n) next.push(4);
      return next.slice(0, n);
    });
  }

  const needsVegas = enabledGames.includes("VEGAS");
  const needsFourForVegas = needsVegas && selectedPlayerIds.length !== 4;

  async function onSubmit() {
    setError(null);
    if (selectedPlayerIds.length === 0) {
      setError("Pick at least yourself as a player");
      return;
    }
    if (needsFourForVegas) {
      setError("Vegas needs exactly 4 players");
      return;
    }
    setSubmitting(true);
    try {
      const gamesConfig: Record<string, unknown> = {
        playerIds: selectedPlayerIds,
        enabledGames,
      };
      if (enabledGames.includes("VEGAS")) {
        gamesConfig.vegas = {
          teamA: [selectedPlayerIds[0], selectedPlayerIds[1]],
          teamB: [selectedPlayerIds[2], selectedPlayerIds[3]],
        };
      }
      if (enabledGames.includes("WOLF")) gamesConfig.wolf = { order: selectedPlayerIds };
      if (enabledGames.includes("BANKER")) gamesConfig.banker = { rotation: selectedPlayerIds };
      if (enabledGames.includes("SKINS")) gamesConfig.skins = { carryover: true };
      if (enabledGames.includes("VAULT")) gamesConfig.vault = {};
      if (enabledGames.includes("CHAOS")) gamesConfig.chaos = { seed: Date.now() % 100000 };

      const payload =
        courseMode === "search" && selectedCourseId
          ? { courseId: selectedCourseId, gamesConfig }
          : { courseName: manualName || "Round", holePars: pars, gamesConfig };

      const { round } = await apiFetch<{ round: { id: string } }>("/api/rounds", { json: payload });
      router.push(`/rounds/${round.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't start the round");
    } finally {
      setSubmitting(false);
    }
  }

  const allPlayers = useMemo(
    () => (user ? [{ id: user.id, displayName: `${user.displayName} (you)` }, ...friends.map((f) => f.user)] : []),
    [user, friends]
  );

  if (loading || !user) return null;

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <h1 className="text-2xl font-bold">Start a round</h1>

      <section className="card flex flex-col gap-3 p-4">
        <h2 className="font-semibold">Course</h2>
        <div className="flex gap-2 text-sm">
          <button
            className={courseMode === "search" ? "btn-primary" : "btn-secondary"}
            onClick={() => setCourseMode("search")}
          >
            Search
          </button>
          <button
            className={courseMode === "manual" ? "btn-primary" : "btn-secondary"}
            onClick={() => setCourseMode("manual")}
          >
            Manual entry
          </button>
        </div>

        {courseMode === "search" ? (
          <div className="flex flex-col gap-2">
            <input
              placeholder="Search courses…"
              value={courseQuery}
              onChange={(e) => setCourseQuery(e.target.value)}
            />
            <div className="flex flex-col gap-1">
              {courses.map((c) => (
                <label key={c.id} className="flex items-center gap-2 rounded-md p-1.5 hover:bg-black/5 dark:hover:bg-white/10">
                  <input
                    type="radio"
                    name="course"
                    checked={selectedCourseId === c.id}
                    onChange={() => setSelectedCourseId(c.id)}
                  />
                  {c.name} {c.city ? `— ${c.city}, ${c.state}` : ""}
                </label>
              ))}
              {courses.length === 0 && (
                <p className="text-sm text-black/50 dark:text-white/50">No matches yet — try manual entry.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <input
              placeholder="Course name"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
            />
            <div className="flex gap-2 text-sm">
              <button className={holeCount === 9 ? "btn-primary" : "btn-secondary"} onClick={() => updateHoleCount(9)}>
                9 holes
              </button>
              <button className={holeCount === 18 ? "btn-primary" : "btn-secondary"} onClick={() => updateHoleCount(18)}>
                18 holes
              </button>
            </div>
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-9">
              {pars.map((par, i) => (
                <label key={i} className="flex flex-col items-center text-xs">
                  #{i + 1}
                  <input
                    type="number"
                    min={3}
                    max={6}
                    className="w-14 text-center"
                    value={par}
                    onChange={(e) =>
                      setPars((prev) => prev.map((p, idx) => (idx === i ? Number(e.target.value) : p)))
                    }
                  />
                </label>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="card flex flex-col gap-3 p-4">
        <h2 className="font-semibold">Players</h2>
        <div className="flex flex-wrap gap-2">
          {allPlayers.map((p) => (
            <label
              key={p.id}
              className="flex items-center gap-2 rounded-full border border-[var(--border)] px-3 py-1.5 text-sm"
            >
              <input
                type="checkbox"
                checked={selectedPlayerIds.includes(p.id)}
                onChange={() => togglePlayer(p.id)}
                disabled={p.id === user.id}
              />
              {p.displayName}
            </label>
          ))}
          {friends.length === 0 && (
            <p className="text-sm text-black/50 dark:text-white/50">
              Add friends first to play with them — playing solo works too.
            </p>
          )}
        </div>
      </section>

      <section className="card flex flex-col gap-3 p-4">
        <h2 className="font-semibold">Side games</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {GAME_OPTIONS.map((g) => (
            <label
              key={g.type}
              className="flex items-start gap-2 rounded-lg border border-[var(--border)] p-2 text-sm"
            >
              <input
                type="checkbox"
                checked={enabledGames.includes(g.type)}
                onChange={() => toggleGame(g.type)}
                className="mt-1"
              />
              <span>
                <span className="font-medium">{g.label}</span>
                <br />
                <span className="text-xs text-black/60 dark:text-white/60">{g.hint}</span>
              </span>
            </label>
          ))}
        </div>
        {needsFourForVegas && (
          <p className="text-sm text-amber-600">Vegas needs exactly 4 players selected above.</p>
        )}
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn-primary self-start" onClick={onSubmit} disabled={submitting}>
        {submitting ? "Starting…" : "Start round"}
      </button>
    </div>
  );
}
