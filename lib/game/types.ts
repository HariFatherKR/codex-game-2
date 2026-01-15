export type TileColor = "R" | "G" | "B" | "Y" | "P";

export type Tile = {
  id: string;
  color: TileColor;
};

export type Board = Tile[][];

export type Position = {
  row: number;
  col: number;
};

export type GameStatus = "playing" | "clear" | "fail";

export type GameState = {
  board: Board;
  score: number;
  movesLeft: number;
  status: GameStatus;
};
