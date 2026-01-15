import type { Tile, TileColor } from "@/lib/game/types";

export function createTile(color: TileColor): Tile {
  return {
    id: crypto.randomUUID(),
    color
  };
}
