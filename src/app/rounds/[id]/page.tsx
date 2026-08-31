"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useRequireAuth } from "@/components/require-auth";
import { apiFetch, ApiError } from "@/lib/client-api";
import type { GamesConfig, HoleEntry, RoundResults } from "@/lib/games/types";
import { ThreadPanel } from "@/components/thread-panel";

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
          <p className="text-sm text-black/60 dark:text-white/60">
            Hosted by {round.owner.displayName} · {round.status === "IN_PROGRESS" ? "Live" : "Completed"}
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

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Scorecard
        round={round}
        nameFor={nameFor}
        canEdit={round.status === "IN_PROGRESS" && (isOwner || round.gamesConfig.playerIds.includes(user.id))}
        onScore={setStrokes}
        onMarker={setHoleMarker}
      />

      <section className="card p-4">
        <h2 className="mb-3 font-semibold">Leaderboard</h2>
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
                    <span className="ml-2 text-black/60 dark:text-white/60">
                      {row.toPar > 0 ? `+${row.toPar}` : row.toPar}
                    </span>
                  )}
                </span>
              </li>
            ))}
        </ul>
      </section>

      {results.games.map((g) => (
        <section key={g.game} className="card p-4">
          <h2 className="mb-2 font-semibold">{g.label}</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {g.standings
              .slice()
              .sort((a, b) => b.value - a.value)
              .map((s) => (
                <li key={s.playerId} className="flex justify-between">
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
                        hole.greenieWinner === pid ? "bg-[var(--accent)] text-white" : "bg-black/5 dark:bg-white/10"
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
                        hole.bombWinner === pid ? "bg-[var(--accent)] text-white" : "bg-black/5 dark:bg-white/10"
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
      <p className="mt-2 text-xs text-black/50 dark:text-white/50">
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
      <p className="mb-2 text-xs text-black/50 dark:text-white/50">
        Informal, no money changes hands here — just a running record of who said what.
      </p>
      <ul className="mb-3 flex flex-col gap-1 text-sm">
        {wagers.map((w) => (
          <li key={w.id} className="flex items-center justify-between gap-2">
            <span>
              {w.bettor.displayName} on {w.target.displayName}: {w.description}{" "}
              <em className="text-black/50 dark:text-white/50">({w.status})</em>
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
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </section>
  );
}
