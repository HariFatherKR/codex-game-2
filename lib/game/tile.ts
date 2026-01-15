import type { Tile, TileColor } from "./types";

export const tileColors: TileColor[] = ["R", "G", "B", "Y", "P"];

export function createTile(color: TileColor): Tile {
  return {
    id: crypto.randomUUID(),
    color
  };
}

export function getRandomColor(): TileColor {
  const index = Math.floor(Math.random() * tileColors.length);
  return tileColors[index] ?? "R";
}
