import { describe, expect, it } from "vitest";
import { computeRoundResults } from "./engine";
import type { GamesConfig, HoleEntry } from "./types";

function hole(n: number, par: number, strokes: Record<string, number>): HoleEntry {
  return { holeNumber: n, par, strokes };
}

describe("skins", () => {
  it("awards a skin to the strict low score and pushes ties", () => {
    const config: GamesConfig = {
      playerIds: ["a", "b"],
      enabledGames: ["SKINS"],
      skins: { carryover: false },
    };
    const holes = [
      hole(1, 4, { a: 4, b: 5 }),
      hole(2, 4, { a: 4, b: 4 }),
    ];
    const result = computeRoundResults(config, holes);
    const skins = result.games.find((g) => g.game === "SKINS")!;
    expect(skins.standings.find((s) => s.playerId === "a")!.value).toBe(1);
    expect(skins.standings.find((s) => s.playerId === "b")!.value).toBe(0);
  });

  it("carries a pushed hole's skin into the next winner", () => {
    const config: GamesConfig = {
      playerIds: ["a", "b"],
      enabledGames: ["SKINS"],
      skins: { carryover: true },
    };
    const holes = [
      hole(1, 4, { a: 4, b: 4 }),
      hole(2, 4, { a: 3, b: 5 }),
    ];
    const result = computeRoundResults(config, holes);
    const skins = result.games.find((g) => g.game === "SKINS")!;
    expect(skins.standings.find((s) => s.playerId === "a")!.value).toBe(2);
  });
});

describe("stableford", () => {
  it("scores default point table correctly", () => {
    const config: GamesConfig = {
      playerIds: ["a"],
      enabledGames: ["STABLEFORD"],
    };
    // birdie (-1) = 3, par (0) = 2
    const holes = [hole(1, 4, { a: 3 }), hole(2, 4, { a: 4 })];
    const result = computeRoundResults(config, holes);
    const sf = result.games.find((g) => g.game === "STABLEFORD")!;
    expect(sf.standings[0].value).toBe(5);
  });
});

describe("vegas", () => {
  it("combines team scores low-digit-first and settles the diff", () => {
    const config: GamesConfig = {
      playerIds: ["a1", "a2", "b1", "b2"],
      enabledGames: ["VEGAS"],
      vegas: { teamA: ["a1", "a2"], teamB: ["b1", "b2"] },
    };
    // team A: 4,5 -> 45; team B: 5,6 -> 56; diff 11, A wins
    const holes = [hole(1, 4, { a1: 4, a2: 5, b1: 5, b2: 6 })];
    const result = computeRoundResults(config, holes);
    const vegas = result.games.find((g) => g.game === "VEGAS")!;
    expect(vegas.standings.find((s) => s.playerId === "a1")!.value).toBe(11);
    expect(vegas.standings.find((s) => s.playerId === "b1")!.value).toBe(-11);
  });
});

describe("nassau", () => {
  it("tracks front/back/overall strokes leaders", () => {
    const config: GamesConfig = {
      playerIds: ["a", "b"],
      enabledGames: ["NASSAU"],
    };
    const holes: HoleEntry[] = Array.from({ length: 9 }, (_, i) =>
      hole(i + 1, 4, { a: 4, b: 5 })
    );
    const result = computeRoundResults(config, holes);
    const nassau = result.games.find((g) => g.game === "NASSAU")!;
    const frontA = nassau.standings.find(
      (s) => s.playerId === "a" && s.note?.includes("Front 9")
    );
    expect(frontA?.note).toContain("up");
  });
});

describe("leaderboard", () => {
  it("computes to-par only for holes played", () => {
    const config: GamesConfig = { playerIds: ["a"], enabledGames: [] };
    const holes = [hole(1, 4, { a: 5 }), hole(2, 3, {})];
    const result = computeRoundResults(config, holes);
    expect(result.leaderboard[0].holesPlayed).toBe(1);
    expect(result.leaderboard[0].toPar).toBe(1);
  });
});
