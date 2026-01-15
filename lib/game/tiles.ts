import { Tile, TileColor } from "./types";

export const TILE_COLORS: TileColor[] = ["R", "G", "B", "Y", "P"];

export function createTile(color: TileColor): Tile {
  return {
    id: crypto.randomUUID(),
    color
  };
}
