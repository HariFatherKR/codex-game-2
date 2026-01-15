export type TileColor = 'R' | 'G' | 'B' | 'Y' | 'P';
export type SpecialType = 'line-h' | 'line-v' | 'bomb' | 'color';

export interface Tile {
  id: string;
  color: TileColor;
  special?: SpecialType;
}

export interface Cell {
  tile: Tile | null;
  ice?: boolean;
  jelly?: boolean;
}

export interface BoardConfig {
  rows: number;
  cols: number;
  tileTypes: TileColor[];
}

export type ObjectiveType = 'score' | 'collect' | 'clear';

export interface Objective {
  type: ObjectiveType;
  target: {
    score?: number;
    color?: TileColor;
    count?: number;
    block?: 'ice' | 'jelly';
  };
}

export interface TutorialStep {
  type: 'swapHint' | 'text' | 'highlightObjective';
  cell?: string;
  direction?: 'up' | 'down' | 'left' | 'right';
  message?: string;
}

export interface LevelData {
  id: string;
  name: string;
  board: BoardConfig;
  movesLimit: number;
  parMoves: number;
  objectives: Objective[];
  specialBlocks?: {
    type: 'ice' | 'jelly';
    cells: string[];
  }[];
  tutorial?: {
    enabled: boolean;
    steps: TutorialStep[];
  };
  notes?: string;
}

export interface MatchGroup {
  cells: [number, number][];
  color: TileColor;
}

export interface CascadeResult {
  board: Cell[][];
  cleared: [number, number][];
  clearedTiles: { position: [number, number]; color: TileColor; special?: SpecialType }[];
  clearedBlocks: { ice: number; jelly: number };
  specialsCreated: { position: [number, number]; special: SpecialType }[];
  scoreDelta: number;
}

export interface SwapResult {
  board: Cell[][];
  swapped: boolean;
  cascades: CascadeResult[];
}
