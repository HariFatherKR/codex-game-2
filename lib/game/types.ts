export type TileColor = "R" | "G" | "B" | "Y" | "P";

export type Tile = {
  id: string;
  color: TileColor;
};

export type BoardCell = Tile | null;

export type Board = BoardCell[][];

export type Position = {
  row: number;
  col: number;
};

export type GameState = {
  board: Board;
  score: number;
  movesLeft: number;
  status: "playing" | "clear" | "fail";
};

export type Progress = {
  unlockedLevelIds: string[];
  bestScores: Record<string, number>;
};
