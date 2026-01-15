export type TileColor = "R" | "G" | "B" | "Y" | "P" | "O";

export type SpecialType = "line-h" | "line-v" | "bomb" | "color";

export interface Tile {
  id: string;
  color: TileColor;
  special?: SpecialType;
}

export interface BoardConfig {
  rows: number;
  cols: number;
  tileTypes: TileColor[];
}

export interface ObjectiveScore {
  type: "score";
  target: { score: number };
}

export interface ObjectiveCollect {
  type: "collect";
  target: { color: TileColor; count: number };
}

export interface ObjectiveClear {
  type: "clear";
  target: { blockType: "ice" | "jelly"; count: number };
}

export type Objective = ObjectiveScore | ObjectiveCollect | ObjectiveClear;

export interface TutorialStepSwapHint {
  type: "swapHint";
  cell: string;
  direction: "up" | "down" | "left" | "right";
}

export interface TutorialStepText {
  type: "text";
  message: string;
}

export type TutorialStep = TutorialStepSwapHint | TutorialStepText;

export interface TutorialConfig {
  enabled: boolean;
  steps: TutorialStep[];
}

export interface SpecialBlock {
  type: "ice" | "jelly";
  cells: string[];
}

export interface LevelDefinition {
  id: string;
  name: string;
  board: BoardConfig;
  movesLimit: number;
  parMoves: number;
  objectives: Objective[];
  specialBlocks: SpecialBlock[];
  tutorial?: TutorialConfig;
  notes?: string;
}

export interface MatchGroup {
  cells: string[];
}

export interface ResolveResult {
  board: Tile[][];
  cleared: string[];
  spawnedSpecials: { cell: string; special: SpecialType; color: TileColor }[];
  score: number;
  cascades: number;
}

export interface BoardState {
  board: Tile[][];
  overlayBlocks: Record<string, "ice" | "jelly">;
}
