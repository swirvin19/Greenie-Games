// Shared types for the golf side-game scoring engine.
//
// A Round's `scoreData` JSON is a HoleEntry[] and `gamesConfig` JSON is a
// GamesConfig — see the doc comment at the top of engine.ts for the full
// list of games and how each one is scored.

export type PlayerId = string;

export interface HoleEntry {
  holeNumber: number;
  par: number;
  /** playerId -> gross strokes taken. Missing/null = not yet played. */
  strokes: Record<PlayerId, number | null>;
  /** playerId who won closest-to-pin on this hole (Greenie games, par 3s only). */
  greenieWinner?: PlayerId | null;
  /** playerId who hit the longest drive on this hole (Bomb games, non-par-3s). */
  bombWinner?: PlayerId | null;
  /** playerId(s) who reached the green in regulation, used by King of the Green. */
  greenInRegulation?: PlayerId[];
}

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

export interface NassauConfig {
  /** informal stakes, display-only text like "$5" — never parsed as money */
  stakeLabel?: string;
  pressAllowed?: boolean;
}

export interface SkinsConfig {
  stakeLabel?: string;
  carryover?: boolean;
}

/** Points awarded per strokes-relative-to-net-par. Keys are stringified deltas, e.g. "-2", "0", "1". */
export type StablefordTable = Record<string, number>;

export interface StablefordConfig {
  pointsTable?: StablefordTable;
}

export interface VegasConfig {
  teamA: [PlayerId, PlayerId];
  teamB: [PlayerId, PlayerId];
  stakeLabel?: string;
  /** flip low/high digit ordering when a team makes bogey+ (traditional Vegas "flip" rule) */
  flipOnBogey?: boolean;
}

export interface WolfConfig {
  /** tee-off order; the wolf for hole N is order[(N-1) % order.length] */
  order: PlayerId[];
  stakeLabel?: string;
}

export interface BankerConfig {
  /** banker for hole N is rotation[(N-1) % rotation.length] */
  rotation: PlayerId[];
  stakeLabel?: string;
}

export interface GreenieConfig {
  stakeLabel?: string;
}

export interface KotgConfig {
  stakeLabel?: string;
}

export interface BombConfig {
  stakeLabel?: string;
}

export interface VaultConfig {
  /** holes that feed the vault; defaults to all holes */
  holeNumbers?: number[];
  stakeLabel?: string;
}

export interface ChaosConfig {
  /** deterministic seed so the per-hole game assignment is reproducible */
  seed: number;
  /** pool of games chaos mode rotates through; defaults to a standard pool */
  pool?: Exclude<GameType, "CHAOS">[];
}

export interface GamesConfig {
  playerIds: PlayerId[];
  enabledGames: GameType[];
  nassau?: NassauConfig;
  skins?: SkinsConfig;
  stableford?: StablefordConfig;
  vegas?: VegasConfig;
  wolf?: WolfConfig;
  banker?: BankerConfig;
  greenie?: GreenieConfig;
  kotg?: KotgConfig;
  bomb?: BombConfig;
  vault?: VaultConfig;
  chaos?: ChaosConfig;
}

export interface LeaderboardRow {
  playerId: PlayerId;
  totalStrokes: number;
  holesPlayed: number;
  toPar: number | null;
}

export interface GameResult {
  game: GameType;
  label: string;
  /** freeform per-game summary rows, rendered as-is in the UI */
  standings: { playerId: PlayerId; value: number; note?: string }[];
  holeWinners?: { holeNumber: number; winnerId: PlayerId | null; note?: string }[];
}

export interface RoundResults {
  leaderboard: LeaderboardRow[];
  games: GameResult[];
}
