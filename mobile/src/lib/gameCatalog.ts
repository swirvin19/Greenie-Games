// Mirrors src/lib/games/catalog.ts + types.ts in the web app. Duplicated
// rather than imported — Metro (this app's bundler) resolves modules from
// this project's own root, and the real logic lives server-side anyway
// (this app only needs the *shapes* and display labels, never the engine
// itself, since the API always returns already-computed results).

export type GameType =
  | "NASSAU"
  | "SKINS"
  | "STABLEFORD"
  | "VEGAS"
  | "WOLF"
  | "BANKER"
  | "GREENIE"
  | "KOTG"
  | "BOMB"
  | "VAULT"
  | "CHAOS";

export interface GameMeta {
  type: GameType;
  label: string;
  hint: string;
  group: "main" | "side";
}

export const GAME_CATALOG: GameMeta[] = [
  { type: "WOLF", label: "Wolf", hint: "Rotating wolf vs. the field", group: "main" },
  { type: "VEGAS", label: "Vegas", hint: "2v2 teams, combined-digit scoring", group: "main" },
  { type: "STABLEFORD", label: "Stableford", hint: "Points per hole relative to par", group: "main" },
  { type: "NASSAU", label: "Nassau", hint: "Front 9 / back 9 / overall match play", group: "main" },
  { type: "BANKER", label: "Banker", hint: "Rotating banker plays everyone", group: "main" },
  { type: "VAULT", label: "Vault", hint: "Pooled bonus, most holes won takes it", group: "main" },
  { type: "SKINS", label: "Skins", hint: "Lowest score wins the hole outright", group: "side" },
  { type: "GREENIE", label: "Greenie", hint: "Closest to the pin on par 3s", group: "side" },
  { type: "KOTG", label: "King of the Green", hint: "Point per green hit in regulation", group: "side" },
  { type: "BOMB", label: "Bomb", hint: "Longest drive on non-par-3s", group: "side" },
  { type: "CHAOS", label: "Chaos Mode", hint: "A random game each hole", group: "side" },
];

export const MAIN_GAMES = GAME_CATALOG.filter((g) => g.group === "main");
export const SIDE_GAMES = GAME_CATALOG.filter((g) => g.group === "side");

export function gameMeta(type: GameType): GameMeta | undefined {
  return GAME_CATALOG.find((g) => g.type === type);
}

export interface HoleEntry {
  holeNumber: number;
  par: number;
  strokes: Record<string, number | null>;
  greenieWinner?: string | null;
  bombWinner?: string | null;
  greenInRegulation?: string[];
}

export interface GamesConfig {
  playerIds: string[];
  enabledGames: GameType[];
  vegas?: { teamA: [string, string]; teamB: [string, string] };
  wolf?: { order: string[] };
  banker?: { rotation: string[] };
  skins?: { carryover?: boolean };
  vault?: { holeNumbers?: number[] };
  chaos?: { seed: number };
}

export interface LeaderboardRow {
  playerId: string;
  totalStrokes: number;
  holesPlayed: number;
  toPar: number | null;
}

export interface GameResult {
  game: GameType;
  label: string;
  standings: { playerId: string; value: number; note?: string }[];
}

export interface RoundResults {
  leaderboard: LeaderboardRow[];
  games: GameResult[];
}
