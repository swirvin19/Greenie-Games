import type {
  BankerConfig,
  BombConfig,
  ChaosConfig,
  GameResult,
  GameType,
  GamesConfig,
  GreenieConfig,
  HoleEntry,
  KotgConfig,
  LeaderboardRow,
  NassauConfig,
  PlayerId,
  RoundResults,
  SkinsConfig,
  StablefordConfig,
  VaultConfig,
  VegasConfig,
  WolfConfig,
} from "./types";

// ============================================================
// Greeni Games golf side-game scoring engine
//
// Pure functions only — no I/O, no Prisma. Takes a round's
// `gamesConfig` + `scoreData` (both plain JSON, matching the
// shapes in ./types) and returns a RoundResults the UI renders
// directly. This is what Round.gamesConfig / Round.scoreData
// are for in the data model.
//
// Games implemented, and the rules this engine uses for each
// (standard formats are standard; the informal/house games get
// an explicit convention below since there's no single accepted
// rule set):
//
//  NASSAU      — three match-play bets: front 9, back 9, overall.
//                Each segment awarded to whoever is up the most
//                holes when the segment ends (net of ties = push).
//  SKINS       — each hole won outright (strictly lowest gross
//                score, no ties) is a skin. `carryover: true`
//                rolls a tied hole's skin into the next hole.
//  STABLEFORD  — points per hole from strokes-to-par via a
//                configurable table (default: standard Stableford:
//                double bogey+ = 0, bogey = 1, par = 2, birdie = 3,
//                eagle = 4, albatross+ = 5).
//  VEGAS       — two 2-player teams; each team's two gross scores
//                combine into a 2-digit number (lower score first),
//                low number scores that many points against the
//                high number's points for the hole; the loser
//                sinks the diff. `flipOnBogey` reverses digit
//                order for a team with any player at bogey+.
//  WOLF        — rotating "wolf" (`wolf.order[(hole-1) % n]`) is
//                whoever tees off last and picks a partner (or
//                goes it alone for 2x). This engine scores it as:
//                wolf's team = lowest single score among
//                {wolf, partner} vs. best of the rest; since the app
//                doesn't capture the partner pick, it defaults to
//                "lone wolf vs. the field" (wolf's score vs. best
//                of everyone else) each hole — configurable later.
//  BANKER      — rotating banker (`banker.rotation[(hole-1) % n]`)
//                plays 1-vs-everyone; wins/loses individually
//                against each other player based on gross score
//                that hole (push on ties).
//  GREENIE     — closest-to-pin bonus on par 3s, using the
//                `greenieWinner` marked on that hole.
//  KOTG        — "King of the Green": a point to everyone who
//                reaches the green in regulation (marked via
//                `greenInRegulation`), tracked as a running total.
//  BOMB        — longest-drive bonus on non-par-3 holes, using
//                the `bombWinner` marked on that hole.
//  VAULT       — a pooled bonus that accumulates one entry per
//                hole (or the configured hole subset) and is paid
//                out in full to whoever won the most of those
//                holes outright (skins-style, ties split the vault).
//  CHAOS       — each hole's "live" game is picked pseudo-randomly
//                (seeded, so it's reproducible) from a pool of the
//                other games; that hole's winner is computed by
//                delegating to that game's per-hole logic.
//
// All of these are informal, on-course scoring conventions with
// no money attached — `stakeLabel` fields on each config are
// free-text display only (e.g. "$5/hole") and are never parsed
// or totaled as currency, consistent with RemoteWager's no-payment
// rule in the data model.
// ============================================================

const DEFAULT_STABLEFORD_TABLE: Record<string, number> = {
  "-3": 8,
  "-2": 5,
  "-1": 3,
  "0": 2,
  "1": 1,
  "2": 0,
};

function toParDelta(strokes: number, par: number) {
  return strokes - par;
}

function playedHoles(holes: HoleEntry[]) {
  return holes.filter((h) =>
    Object.values(h.strokes).some((s) => typeof s === "number")
  );
}

export function computeLeaderboard(
  playerIds: PlayerId[],
  holes: HoleEntry[]
): LeaderboardRow[] {
  return playerIds.map((playerId) => {
    let totalStrokes = 0;
    let totalPar = 0;
    let holesPlayed = 0;
    for (const hole of holes) {
      const strokes = hole.strokes[playerId];
      if (typeof strokes === "number") {
        totalStrokes += strokes;
        totalPar += hole.par;
        holesPlayed += 1;
      }
    }
    return {
      playerId,
      totalStrokes,
      holesPlayed,
      toPar: holesPlayed > 0 ? totalStrokes - totalPar : null,
    };
  });
}

/** Strictly-lowest-score winner of a hole among the given players, or null on a tie/no data. */
function holeWinner(hole: HoleEntry, playerIds: PlayerId[]): PlayerId | null {
  const scores = playerIds
    .map((id) => ({ id, s: hole.strokes[id] }))
    .filter((x): x is { id: PlayerId; s: number } => typeof x.s === "number");
  if (scores.length < playerIds.length) return null; // wait for everyone
  const min = Math.min(...scores.map((x) => x.s));
  const winners = scores.filter((x) => x.s === min);
  return winners.length === 1 ? winners[0].id : null;
}

function scoreNassau(
  cfg: NassauConfig | undefined,
  playerIds: PlayerId[],
  holes: HoleEntry[]
): GameResult {
  // Two-player match play only (the common case); more players fall back
  // to "leader by strokes" per segment.
  const segments: { label: string; range: [number, number] }[] = [
    { label: "Front 9", range: [1, 9] },
    { label: "Back 9", range: [10, 18] },
    { label: "Overall", range: [1, 18] },
  ];

  const standings: GameResult["standings"] = [];
  for (const seg of segments) {
    const segHoles = holes.filter(
      (h) => h.holeNumber >= seg.range[0] && h.holeNumber <= seg.range[1]
    );
    const rows = computeLeaderboard(playerIds, segHoles).filter(
      (r) => r.holesPlayed > 0
    );
    if (rows.length === 0) continue;
    const best = Math.min(...rows.map((r) => r.totalStrokes));
    const leaders = rows.filter((r) => r.totalStrokes === best);
    for (const r of rows) {
      standings.push({
        playerId: r.playerId,
        value: r.totalStrokes,
        note:
          leaders.length === 1 && r.playerId === leaders[0].playerId
            ? `${seg.label}: up`
            : leaders.length > 1
              ? `${seg.label}: push`
              : `${seg.label}`,
      });
    }
  }

  return { game: "NASSAU", label: "Nassau", standings };
}

function scoreSkins(
  cfg: SkinsConfig | undefined,
  playerIds: PlayerId[],
  holes: HoleEntry[]
): GameResult {
  const skinCount: Record<PlayerId, number> = Object.fromEntries(
    playerIds.map((id) => [id, 0])
  );
  const holeWinners: GameResult["holeWinners"] = [];
  let carried = 0;

  for (const hole of holes) {
    const scores = playerIds
      .map((id) => hole.strokes[id])
      .filter((s): s is number => typeof s === "number");
    if (scores.length < playerIds.length) continue;

    const winner = holeWinner(hole, playerIds);
    const potSize = 1 + carried;
    if (winner) {
      skinCount[winner] += potSize;
      holeWinners!.push({
        holeNumber: hole.holeNumber,
        winnerId: winner,
        note: potSize > 1 ? `won ${potSize} skins` : undefined,
      });
      carried = 0;
    } else if (cfg?.carryover) {
      carried = potSize;
      holeWinners!.push({ holeNumber: hole.holeNumber, winnerId: null, note: "carried over" });
    } else {
      holeWinners!.push({ holeNumber: hole.holeNumber, winnerId: null, note: "push" });
    }
  }

  return {
    game: "SKINS",
    label: "Skins",
    standings: playerIds.map((id) => ({ playerId: id, value: skinCount[id] })),
    holeWinners,
  };
}

function scoreStableford(
  cfg: StablefordConfig | undefined,
  playerIds: PlayerId[],
  holes: HoleEntry[]
): GameResult {
  const table = cfg?.pointsTable ?? DEFAULT_STABLEFORD_TABLE;
  const minDelta = Math.min(...Object.keys(table).map(Number));
  const maxDelta = Math.max(...Object.keys(table).map(Number));
  const points: Record<PlayerId, number> = Object.fromEntries(
    playerIds.map((id) => [id, 0])
  );

  for (const hole of holes) {
    for (const id of playerIds) {
      const s = hole.strokes[id];
      if (typeof s !== "number") continue;
      const delta = Math.min(maxDelta, Math.max(minDelta, toParDelta(s, hole.par)));
      points[id] += table[String(delta)] ?? 0;
    }
  }

  return {
    game: "STABLEFORD",
    label: "Stableford",
    standings: playerIds.map((id) => ({ playerId: id, value: points[id] })),
  };
}

function scoreVegas(
  cfg: VegasConfig | undefined,
  holes: HoleEntry[]
): GameResult {
  if (!cfg) return { game: "VEGAS", label: "Vegas", standings: [] };
  const [a1, a2] = cfg.teamA;
  const [b1, b2] = cfg.teamB;
  const points: Record<PlayerId, number> = {
    [a1]: 0,
    [a2]: 0,
    [b1]: 0,
    [b2]: 0,
  };
  const holeWinners: GameResult["holeWinners"] = [];

  const teamNumber = (s1: number, s2: number, bogeyPlus: boolean) => {
    const lo = Math.min(s1, s2);
    const hi = Math.max(s1, s2);
    const digits = cfg.flipOnBogey && bogeyPlus ? [hi, lo] : [lo, hi];
    return digits[0] * 10 + digits[1];
  };

  for (const hole of holes) {
    const sa1 = hole.strokes[a1];
    const sa2 = hole.strokes[a2];
    const sb1 = hole.strokes[b1];
    const sb2 = hole.strokes[b2];
    if (
      typeof sa1 !== "number" ||
      typeof sa2 !== "number" ||
      typeof sb1 !== "number" ||
      typeof sb2 !== "number"
    )
      continue;

    const aBogey = sa1 > hole.par || sa2 > hole.par;
    const bBogey = sb1 > hole.par || sb2 > hole.par;
    const numA = teamNumber(sa1, sa2, aBogey);
    const numB = teamNumber(sb1, sb2, bBogey);

    if (numA === numB) {
      holeWinners!.push({ holeNumber: hole.holeNumber, winnerId: null, note: "push" });
      continue;
    }
    const diff = Math.abs(numA - numB);
    if (numA < numB) {
      points[a1] += diff;
      points[a2] += diff;
      points[b1] -= diff;
      points[b2] -= diff;
      holeWinners!.push({ holeNumber: hole.holeNumber, winnerId: a1, note: `Team A +${diff}` });
    } else {
      points[b1] += diff;
      points[b2] += diff;
      points[a1] -= diff;
      points[a2] -= diff;
      holeWinners!.push({ holeNumber: hole.holeNumber, winnerId: b1, note: `Team B +${diff}` });
    }
  }

  return {
    game: "VEGAS",
    label: "Vegas",
    standings: Object.entries(points).map(([playerId, value]) => ({ playerId, value })),
    holeWinners,
  };
}

function scoreWolf(cfg: WolfConfig | undefined, holes: HoleEntry[]): GameResult {
  if (!cfg || cfg.order.length === 0) return { game: "WOLF", label: "Wolf", standings: [] };
  const points: Record<PlayerId, number> = Object.fromEntries(
    cfg.order.map((id) => [id, 0])
  );
  const holeWinners: GameResult["holeWinners"] = [];

  for (const hole of holes) {
    const wolf = cfg.order[(hole.holeNumber - 1) % cfg.order.length];
    const wolfScore = hole.strokes[wolf];
    const others = cfg.order.filter((id) => id !== wolf);
    const otherScores = others
      .map((id) => hole.strokes[id])
      .filter((s): s is number => typeof s === "number");
    if (typeof wolfScore !== "number" || otherScores.length < others.length) continue;

    const bestOther = Math.min(...otherScores);
    if (wolfScore < bestOther) {
      points[wolf] += 2 * others.length; // lone wolf beats the field: double points
      holeWinners!.push({ holeNumber: hole.holeNumber, winnerId: wolf, note: "lone wolf wins" });
    } else if (wolfScore > bestOther) {
      for (const id of others) points[id] += 2;
      holeWinners!.push({ holeNumber: hole.holeNumber, winnerId: null, note: "field beats wolf" });
    } else {
      holeWinners!.push({ holeNumber: hole.holeNumber, winnerId: null, note: "push" });
    }
  }

  return {
    game: "WOLF",
    label: "Wolf",
    standings: Object.entries(points).map(([playerId, value]) => ({ playerId, value })),
    holeWinners,
  };
}

function scoreBanker(cfg: BankerConfig | undefined, holes: HoleEntry[]): GameResult {
  if (!cfg || cfg.rotation.length === 0)
    return { game: "BANKER", label: "Banker", standings: [] };
  const points: Record<PlayerId, number> = Object.fromEntries(
    cfg.rotation.map((id) => [id, 0])
  );
  const holeWinners: GameResult["holeWinners"] = [];

  for (const hole of holes) {
    const banker = cfg.rotation[(hole.holeNumber - 1) % cfg.rotation.length];
    const bankerScore = hole.strokes[banker];
    if (typeof bankerScore !== "number") continue;
    let anyPlayed = false;
    for (const id of cfg.rotation) {
      if (id === banker) continue;
      const s = hole.strokes[id];
      if (typeof s !== "number") continue;
      anyPlayed = true;
      if (bankerScore < s) {
        points[banker] += 1;
        points[id] -= 1;
      } else if (bankerScore > s) {
        points[banker] -= 1;
        points[id] += 1;
      }
    }
    if (anyPlayed) {
      holeWinners!.push({
        holeNumber: hole.holeNumber,
        winnerId: null,
        note: `${banker} banked`,
      });
    }
  }

  return {
    game: "BANKER",
    label: "Banker",
    standings: Object.entries(points).map(([playerId, value]) => ({ playerId, value })),
    holeWinners,
  };
}

function scoreGreenie(
  cfg: GreenieConfig | undefined,
  playerIds: PlayerId[],
  holes: HoleEntry[]
): GameResult {
  const counts: Record<PlayerId, number> = Object.fromEntries(
    playerIds.map((id) => [id, 0])
  );
  const holeWinners: GameResult["holeWinners"] = [];
  for (const hole of holes) {
    if (hole.par !== 3 || !hole.greenieWinner) continue;
    counts[hole.greenieWinner] = (counts[hole.greenieWinner] ?? 0) + 1;
    holeWinners!.push({ holeNumber: hole.holeNumber, winnerId: hole.greenieWinner });
  }
  return {
    game: "GREENIE",
    label: "Greenie",
    standings: playerIds.map((id) => ({ playerId: id, value: counts[id] })),
    holeWinners,
  };
}

function scoreKotg(
  cfg: KotgConfig | undefined,
  playerIds: PlayerId[],
  holes: HoleEntry[]
): GameResult {
  const counts: Record<PlayerId, number> = Object.fromEntries(
    playerIds.map((id) => [id, 0])
  );
  for (const hole of holes) {
    for (const id of hole.greenInRegulation ?? []) {
      if (id in counts) counts[id] += 1;
    }
  }
  return {
    game: "KOTG",
    label: "King of the Green",
    standings: playerIds.map((id) => ({ playerId: id, value: counts[id] })),
  };
}

function scoreBomb(
  cfg: BombConfig | undefined,
  playerIds: PlayerId[],
  holes: HoleEntry[]
): GameResult {
  const counts: Record<PlayerId, number> = Object.fromEntries(
    playerIds.map((id) => [id, 0])
  );
  const holeWinners: GameResult["holeWinners"] = [];
  for (const hole of holes) {
    if (hole.par === 3 || !hole.bombWinner) continue;
    counts[hole.bombWinner] = (counts[hole.bombWinner] ?? 0) + 1;
    holeWinners!.push({ holeNumber: hole.holeNumber, winnerId: hole.bombWinner });
  }
  return {
    game: "BOMB",
    label: "Bomb (longest drive)",
    standings: playerIds.map((id) => ({ playerId: id, value: counts[id] })),
    holeWinners,
  };
}

function scoreVault(
  cfg: VaultConfig | undefined,
  playerIds: PlayerId[],
  holes: HoleEntry[]
): GameResult {
  const eligible = cfg?.holeNumbers
    ? holes.filter((h) => cfg.holeNumbers!.includes(h.holeNumber))
    : holes;
  const wins: Record<PlayerId, number> = Object.fromEntries(
    playerIds.map((id) => [id, 0])
  );
  let vaultSize = 0;
  for (const hole of eligible) {
    const scores = playerIds
      .map((id) => hole.strokes[id])
      .filter((s): s is number => typeof s === "number");
    if (scores.length < playerIds.length) continue;
    vaultSize += 1;
    const winner = holeWinner(hole, playerIds);
    if (winner) wins[winner] += 1;
  }

  const maxWins = Math.max(0, ...Object.values(wins));
  const vaultWinners = Object.entries(wins).filter(([, w]) => w === maxWins && maxWins > 0);
  const share = vaultWinners.length > 0 ? vaultSize / vaultWinners.length : 0;

  return {
    game: "VAULT",
    label: "Vault",
    standings: playerIds.map((id) => ({
      playerId: id,
      value: wins[id],
      note:
        maxWins > 0 && wins[id] === maxWins
          ? `splits vault of ${vaultSize} (${share.toFixed(1)} share)`
          : undefined,
    })),
  };
}

function scoreChaos(
  cfg: ChaosConfig | undefined,
  playerIds: PlayerId[],
  holes: HoleEntry[]
): GameResult {
  const pool: Exclude<GameType, "CHAOS">[] =
    cfg?.pool ?? ["SKINS", "STABLEFORD", "GREENIE", "BOMB", "KOTG"];
  const seed = cfg?.seed ?? 0;

  // simple deterministic LCG so the per-hole assignment is reproducible
  let state = seed || 1;
  const next = () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };

  const holeWinners: GameResult["holeWinners"] = [];
  const points: Record<PlayerId, number> = Object.fromEntries(
    playerIds.map((id) => [id, 0])
  );

  for (const hole of holes) {
    const pick = pool[Math.floor(next() * pool.length) % pool.length];
    const doubled = next() < 0.2; // 20% chance a hole is "double or nothing"
    const winner = holeWinner(hole, playerIds);
    if (winner) {
      points[winner] += doubled ? 2 : 1;
      holeWinners!.push({
        holeNumber: hole.holeNumber,
        winnerId: winner,
        note: `${pick}${doubled ? " (doubled)" : ""}`,
      });
    } else {
      holeWinners!.push({ holeNumber: hole.holeNumber, winnerId: null, note: pick });
    }
  }

  return {
    game: "CHAOS",
    label: "Chaos Mode",
    standings: playerIds.map((id) => ({ playerId: id, value: points[id] })),
    holeWinners,
  };
}

export function computeRoundResults(
  gamesConfig: GamesConfig,
  scoreData: HoleEntry[]
): RoundResults {
  const holes = playedHoles(scoreData).length > 0 ? scoreData : scoreData;
  const leaderboard = computeLeaderboard(gamesConfig.playerIds, scoreData);
  const games: GameResult[] = [];

  for (const g of gamesConfig.enabledGames) {
    switch (g) {
      case "NASSAU":
        games.push(scoreNassau(gamesConfig.nassau, gamesConfig.playerIds, holes));
        break;
      case "SKINS":
        games.push(scoreSkins(gamesConfig.skins, gamesConfig.playerIds, holes));
        break;
      case "STABLEFORD":
        games.push(scoreStableford(gamesConfig.stableford, gamesConfig.playerIds, holes));
        break;
      case "VEGAS":
        games.push(scoreVegas(gamesConfig.vegas, holes));
        break;
      case "WOLF":
        games.push(scoreWolf(gamesConfig.wolf, holes));
        break;
      case "BANKER":
        games.push(scoreBanker(gamesConfig.banker, holes));
        break;
      case "GREENIE":
        games.push(scoreGreenie(gamesConfig.greenie, gamesConfig.playerIds, holes));
        break;
      case "KOTG":
        games.push(scoreKotg(gamesConfig.kotg, gamesConfig.playerIds, holes));
        break;
      case "BOMB":
        games.push(scoreBomb(gamesConfig.bomb, gamesConfig.playerIds, holes));
        break;
      case "VAULT":
        games.push(scoreVault(gamesConfig.vault, gamesConfig.playerIds, holes));
        break;
      case "CHAOS":
        games.push(scoreChaos(gamesConfig.chaos, gamesConfig.playerIds, holes));
        break;
    }
  }

  return { leaderboard, games };
}
