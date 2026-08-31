import type { GameType } from "./types";

export interface GameMeta {
  type: GameType;
  label: string;
  hint: string;
  group: "main" | "side";
}

// The 6 toggleable "main" games plus Stroke Play (the always-on leaderboard,
// not a separate GameType — total strokes is tracked no matter what's
// enabled) make up the 7 headline formats. Everything else is a smaller
// side-bet toggle layered on top of whichever main game(s) are running.
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

export const STROKE_PLAY_LABEL = "Stroke Play";
export const STROKE_PLAY_HINT = "Total strokes for the round — always tracked, every round";

export function gameMeta(type: GameType): GameMeta | undefined {
  return GAME_CATALOG.find((g) => g.type === type);
}
