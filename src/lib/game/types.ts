export type TileColor = "R" | "G" | "B" | "Y" | "P";

export type Tile = {
  id: string;
  color: TileColor;
};

export type Board = Tile[][];

export type GameStatus = "playing" | "clear" | "fail";

export type GamePhase = "idle" | "swapping" | "exploding" | "gravity" | "spawning";

export type CellPosition = {
  row: number;
  col: number;
};

export type GameState = {
  board: Board;
  score: number;
  movesLeft: number;
  status: GameStatus;
  phase: GamePhase;
  animatingCells?: CellPosition[];
};
