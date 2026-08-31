"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useRequireAuth } from "@/components/require-auth";
import { apiFetch, ApiError } from "@/lib/client-api";
import type { GamesConfig, HoleEntry, RoundResults } from "@/lib/games/types";
import { gameMeta } from "@/lib/games/catalog";
import { ThreadPanel } from "@/components/thread-panel";

function MainGameMark() {
  return <Image src="/greeni-mascot.png" alt="" width={20} height={16} className="shrink-0" />;
}

interface RoundDetail {
  id: string;
  ownerId: string;
  status: "IN_PROGRESS" | "COMPLETED";
  gamesConfig: GamesConfig;
  scoreData: HoleEntry[];
  courseName: string | null;
  course: { name: string } | null;
  owner: { id: string; displayName: string };
  followers: { userId: string }[];
  thread: { id: string } | null;
}

interface Player {
  id: string;
  displayName: string;
}

interface Wager {
  id: string;
  bettorId: string;
  targetUserId: string;
  description: string;
  status: string;
  bettor: { displayName: string };
  target: { displayName: string };
}

export default function RoundPage() {
  const { user, loading } = useRequireAuth();
  const params = useParams<{ id: string }>();
  const roundId = params.id;

  const [round, setRound] = useState<RoundDetail | null>(null);
  const [results, setResults] = useState<RoundResults | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [wagers, setWagers] = useState<Wager[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await apiFetch<{ round: RoundDetail; results: RoundResults; players: Player[] }>(
      `/api/rounds/${roundId}`
    );
    setRound(data.round);
    setResults(data.results);
    setPlayers(data.players);
    apiFetch<{ wagers: Wager[] }>(`/api/rounds/${roundId}/wagers`).then((d) => setWagers(d.wagers));
  }, [roundId]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  if (loading || !user || !round || !results) return null;

  const isOwner = round.ownerId === user.id;
  const isFollowing = round.followers.some((f) => f.userId === user.id);
  const nameFor = (id: string) => players.find((p) => p.id === id)?.displayName ?? id;
  const mainGameResults = results.games.filter((g) => gameMeta(g.game)?.group === "main");
  const sideGameResults = results.games.filter((g) => gameMeta(g.game)?.group === "side");

  async function setStrokes(holeNumber: number, playerId: string, value: string) {
    const strokes = value === "" ? null : Number(value);
    try {
      const data = await apiFetch<{ round: RoundDetail; results: RoundResults }>(`/api/rounds/${roundId}`, {
        method: "PATCH",
        json: { holeNumber, strokes: { [playerId]: strokes } },
      });
      setRound(data.round);
      setResults(data.results);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save score");
    }
  }

  async function setHoleMarker(holeNumber: number, field: "greenieWinner" | "bombWinner", playerId: string) {
    const current = round!.scoreData.find((h) => h.holeNumber === holeNumber)?.[field];
    const next = current === playerId ? null : playerId;
    const data = await apiFetch<{ round: RoundDetail; results: RoundResults }>(`/api/rounds/${roundId}`, {
      method: "PATCH",
      json: { holeNumber, [field]: next },
    });
    setRound(data.round);
    setResults(data.results);
  }

  async function completeRound() {
    try {
      await apiFetch(`/api/rounds/${roundId}/complete`, { method: "POST", json: {} });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't complete round");
    }
  }

  async function toggleFollow() {
    await apiFetch(`/api/rounds/${roundId}/follow`, { json: { follow: !isFollowing } });
    await load();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{round.course?.name ?? round.courseName ?? "Round"}</h1>
          <p className="text-sm text-[var(--muted)]">
            Hosted by {round.owner.displayName} ·{" "}
            {round.status === "IN_PROGRESS" ? <span className="glow-text font-medium">Live</span> : "Completed"}
          </p>
        </div>
        <div className="flex gap-2">
          {!isOwner && (
            <button className="btn-secondary" onClick={toggleFollow}>
              {isFollowing ? "Following" : "Follow"}
            </button>
          )}
          {isOwner && round.status === "IN_PROGRESS" && (
            <button className="btn-primary" onClick={completeRound}>
              Finish round
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      <Scorecard
        round={round}
        nameFor={nameFor}
        canEdit={round.status === "IN_PROGRESS" && (isOwner || round.gamesConfig.playerIds.includes(user.id))}
        onScore={setStrokes}
        onMarker={setHoleMarker}
      />

      <section className="card border-[var(--accent)]/30 p-4">
        <div className="mb-3 flex items-center gap-2">
          <MainGameMark />
          <h2 className="font-semibold">Stroke Play</h2>
        </div>
        <ul className="flex flex-col gap-1 text-sm">
          {results.leaderboard
            .slice()
            .sort((a, b) => (a.totalStrokes || 999) - (b.totalStrokes || 999))
            .map((row) => (
              <li key={row.playerId} className="flex justify-between">
                <span>{nameFor(row.playerId)}</span>
                <span>
                  {row.totalStrokes} strokes ({row.holesPlayed} holes)
                  {row.toPar !== null && (
                    <span className="ml-2 text-[var(--muted)]">
                      {row.toPar > 0 ? `+${row.toPar}` : row.toPar}
                    </span>
                  )}
                </span>
              </li>
            ))}
        </ul>
      </section>

      {mainGameResults.map((g) => (
        <section key={g.game} className="card border-[var(--accent)]/30 p-4">
          <div className="mb-2 flex items-center gap-2">
            <MainGameMark />
            <h2 className="font-semibold">{g.label}</h2>
          </div>
          <ul className="flex flex-col gap-1 text-sm">
            {g.standings
              .slice()
              .sort((a, b) => b.value - a.value)
              .map((s, i) => (
                // Nassau (and similar) emit one row per segment per player,
                // so playerId alone isn't a unique key here.
                <li key={`${s.playerId}-${i}`} className="flex justify-between">
                  <span>{nameFor(s.playerId)}</span>
                  <span>
                    {s.value}
                    {s.note ? ` — ${s.note}` : ""}
                  </span>
                </li>
              ))}
          </ul>
        </section>
      ))}

      {sideGameResults.length > 0 && (
        <section className="card p-4">
          <div className="mb-3 flex items-center gap-2">
            <span style={{ color: "var(--accent2)" }}>●</span>
            <h2 className="font-semibold">Side bets</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {sideGameResults.map((g) => (
              <div key={g.game}>
                <h3 className="mb-1 text-sm font-medium" style={{ color: "var(--accent2)" }}>
                  {g.label}
                </h3>
                <ul className="flex flex-col gap-1 text-sm">
                  {g.standings
                    .slice()
                    .sort((a, b) => b.value - a.value)
                    .map((s, i) => (
                      <li key={`${s.playerId}-${i}`} className="flex justify-between">
                        <span>{nameFor(s.playerId)}</span>
                        <span>
                          {s.value}
                          {s.note ? ` — ${s.note}` : ""}
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      <WagerPanel roundId={roundId} players={players} wagers={wagers} onChange={load} />

      {round.thread && <ThreadPanel threadId={round.thread.id} title="Round chat" />}
    </div>
  );
}

function Scorecard({
  round,
  nameFor,
  canEdit,
  onScore,
  onMarker,
}: {
  round: RoundDetail;
  nameFor: (id: string) => string;
  canEdit: boolean;
  onScore: (holeNumber: number, playerId: string, value: string) => void;
  onMarker: (holeNumber: number, field: "greenieWinner" | "bombWinner", playerId: string) => void;
}) {
  return (
    <section className="card overflow-x-auto p-4">
      <h2 className="mb-3 font-semibold">Scorecard</h2>
      <table className="w-full min-w-max border-collapse text-sm">
        <thead>
          <tr>
            <th className="p-1 text-left">Hole</th>
            <th className="p-1 text-left">Par</th>
            {round.gamesConfig.playerIds.map((pid) => (
              <th key={pid} className="p-1 text-left">
                {nameFor(pid)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {round.scoreData.map((hole) => (
            <tr key={hole.holeNumber} className="border-t border-[var(--border)]">
              <td className="p-1 font-medium">{hole.holeNumber}</td>
              <td className="p-1">{hole.par}</td>
              {round.gamesConfig.playerIds.map((pid) => (
                <td key={pid} className="p-1">
                  <input
                    type="number"
                    min={1}
                    max={15}
                    className="w-14"
                    disabled={!canEdit}
                    value={hole.strokes[pid] ?? ""}
                    onChange={(e) => onScore(hole.holeNumber, pid, e.target.value)}
                  />
                  {hole.par === 3 && (
                    <button
                      title="Greenie (closest to pin)"
                      disabled={!canEdit}
                      onClick={() => onMarker(hole.holeNumber, "greenieWinner", pid)}
                      className={`ml-1 rounded px-1 text-xs ${
                        hole.greenieWinner === pid
                          ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                          : "bg-white/5 text-[var(--muted)]"
                      }`}
                    >
                      G
                    </button>
                  )}
                  {hole.par !== 3 && (
                    <button
                      title="Bomb (longest drive)"
                      disabled={!canEdit}
                      onClick={() => onMarker(hole.holeNumber, "bombWinner", pid)}
                      className={`ml-1 rounded px-1 text-xs ${
                        hole.bombWinner === pid
                          ? "bg-[var(--accent2)] text-white"
                          : "bg-white/5 text-[var(--muted)]"
                      }`}
                    >
                      B
                    </button>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-[var(--muted)]">
        G = mark closest-to-pin (par 3s) for Greenie · B = mark longest drive for Bomb
      </p>
    </section>
  );
}

function WagerPanel({
  roundId,
  players,
  wagers,
  onChange,
}: {
  roundId: string;
  players: Player[];
  wagers: Wager[];
  onChange: () => void;
}) {
  const [targetUserId, setTargetUserId] = useState(players[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function placeWager() {
    setError(null);
    try {
      await apiFetch(`/api/rounds/${roundId}/wagers`, { json: { targetUserId, description } });
      setDescription("");
      onChange();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't place wager");
    }
  }

  async function settle(id: string, status: "SETTLED_WIN" | "SETTLED_LOSS" | "VOID") {
    await apiFetch(`/api/wagers/${id}`, { method: "PATCH", json: { status } });
    onChange();
  }

  return (
    <section className="card p-4">
      <h2 className="mb-2 font-semibold">Remote wagers</h2>
      <p className="mb-2 text-xs text-[var(--muted)]">
        Informal, no money changes hands here — just a running record of who said what.
      </p>
      <ul className="mb-3 flex flex-col gap-1 text-sm">
        {wagers.map((w) => (
          <li key={w.id} className="flex items-center justify-between gap-2">
            <span>
              {w.bettor.displayName} on {w.target.displayName}: {w.description}{" "}
              <em className="text-[var(--muted)]">({w.status})</em>
            </span>
            {w.status === "OPEN" && (
              <span className="flex gap-1">
                <button className="btn-secondary text-xs" onClick={() => settle(w.id, "SETTLED_WIN")}>
                  Win
                </button>
                <button className="btn-secondary text-xs" onClick={() => settle(w.id, "SETTLED_LOSS")}>
                  Loss
                </button>
                <button className="btn-secondary text-xs" onClick={() => settle(w.id, "VOID")}>
                  Void
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <select value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)}>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.displayName}
            </option>
          ))}
        </select>
        <input
          placeholder="Dale won't break 85 — $20"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="flex-1"
        />
        <button className="btn-primary" onClick={placeWager} disabled={!description}>
          Place
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-[var(--danger)]">{error}</p>}
    </section>
  );
}
