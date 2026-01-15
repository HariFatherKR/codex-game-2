import { createTile, getRandomColor } from "./tile";
import type { Board } from "./types";

const BOARD_SIZE = 8;

export function createInitialBoard(): Board {
  const board: Board = [];

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    const rowTiles = [];
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      rowTiles.push(createTile(getRandomColor()));
    }
    board.push(rowTiles);
  }

  return board;
}
