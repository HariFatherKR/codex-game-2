export type TileColor = "R" | "G" | "B" | "Y" | "P";

export type SpecialTile = "line-h" | "line-v" | "bomb" | "color";

export interface Tile {
  id: string;
  color: TileColor;
  special?: SpecialTile;
  blocked?: boolean;
}

export interface CellOverlay {
  ice?: boolean;
  jelly?: boolean;
}

export interface Board {
  rows: number;
  cols: number;
  tiles: Tile[][];
  overlays: CellOverlay[][];
}

export type ObjectiveType = "score" | "collect" | "clear";

export interface Objective {
  type: ObjectiveType;
  target: {
    score?: number;
    color?: TileColor;
    count?: number;
    blockType?: "ice" | "jelly";
  };
}

export interface TutorialStep {
  type: "swapHint" | "text" | "highlightHud" | "highlightBoard";
  cell?: string;
  direction?: "up" | "down" | "left" | "right";
  message?: string;
}

export interface LevelDefinition {
  id: string;
  name: string;
  board: {
    rows: number;
    cols: number;
    tileTypes: TileColor[];
    blockedCells?: string[];
  };
  movesLimit: number;
  parMoves: number;
  objectives: Objective[];
  specialBlocks?: {
    type: "ice" | "jelly";
    cells: string[];
  }[];
  tutorial?: {
    enabled: boolean;
    steps: TutorialStep[];
  };
  notes?: string;
}

export interface MatchResult {
  matches: { row: number; col: number }[];
  direction: "row" | "col";
  specialCreate?: { row: number; col: number; special: SpecialTile };
}

export interface SwapResult {
  board: Board;
  scoreDelta: number;
  createdSpecial: boolean;
  cleared: { row: number; col: number }[];
  combo: number;
}
