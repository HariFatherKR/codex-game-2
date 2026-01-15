export type TileColor = 'R' | 'G' | 'B' | 'Y' | 'P';

export type SpecialType = 'lineH' | 'lineV' | 'bomb' | 'color';

export type LayerType = 'ice' | 'jelly';

export interface Tile {
  id: string;
  color: TileColor;
  special?: SpecialType;
}

export interface Cell {
  row: number;
  col: number;
  tile: Tile | null;
  layers: LayerType[];
  blocked?: boolean;
}

export interface BoardState {
  rows: number;
  cols: number;
  cells: Cell[][];
}

export interface MatchGroup {
  cells: { row: number; col: number }[];
  color: TileColor;
  shape: 'line' | 't-shape' | 'l-shape';
  length: number;
  orientation?: 'horizontal' | 'vertical';
}

export interface Objective {
  type: 'score' | 'collect' | 'clear' | 'bring';
  target: Record<string, number | string>;
}

export interface TutorialStep {
  type: 'swapHint' | 'text' | 'highlightObjective';
  cell?: string;
  direction?: 'up' | 'down' | 'left' | 'right';
  message?: string;
}

export interface LevelDefinition {
  id: string;
  name: string;
  board: {
    rows: number;
    cols: number;
    tileTypes: TileColor[];
  };
  movesLimit: number;
  parMoves: number;
  objectives: Objective[];
  specialBlocks?: { type: LayerType; cells: string[] }[];
  blockedCells?: string[];
  tutorial?: {
    enabled: boolean;
    steps: TutorialStep[];
  };
  notes?: string;
}

export interface MatchResult {
  board: BoardState;
  removed: { row: number; col: number; tile: Tile }[];
  specialsCreated: { row: number; col: number; special: SpecialType }[];
  scoreGained: number;
  clearedLayers: number;
  cascades: number;
}
