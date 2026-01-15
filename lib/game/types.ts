import type { Level } from "@/data/levels";

export type TileColor = "R" | "G" | "B" | "Y" | "P";

export type Tile = {
  id: string;
  color: TileColor;
};

export type Board = Tile[][];

export type GameState = {
  board: Board;
  score: number;
  movesLeft: number;
  status: "playing" | "clear" | "fail";
};

export type Position = {
  row: number;
  col: number;
};

export type LevelSummary = Pick<Level, "id" | "name" | "targetScore" | "movesLimit">;
