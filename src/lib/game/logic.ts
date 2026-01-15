import type { Board, Tile, TileColor } from "@/lib/game/types";
import { createTile } from "@/lib/game/tiles";
import type { Level } from "@/data/levels";

const BOARD_SIZE = 8;
const COLORS: TileColor[] = ["R", "G", "B", "Y", "P"];

type Position = {
  row: number;
  col: number;
};

function getRandomColor(): TileColor {
  const index = Math.floor(Math.random() * COLORS.length);
  return COLORS[index] ?? "R";
}

function createRandomTile(): Tile {
  return createTile(getRandomColor());
}

export function createInitialBoard(): Board {
  let board: Board = [];
  let attempts = 0;

  do {
    board = Array.from({ length: BOARD_SIZE }, () =>
      Array.from({ length: BOARD_SIZE }, () => createRandomTile())
    );
    attempts += 1;
  } while (findMatches(board).size > 0 && attempts < 50);

  return board;
}

export function swapTiles(board: Board, first: Position, second: Position): Board {
  const nextBoard = board.map((row) => row.slice());
  const temp = nextBoard[first.row]?.[first.col];

  if (!temp) {
    return nextBoard;
  }

  nextBoard[first.row][first.col] = nextBoard[second.row]?.[second.col] ?? temp;
  nextBoard[second.row][second.col] = temp;
  return nextBoard;
}

export function findMatches(board: Board): Set<string> {
  const matches = new Set<string>();
  const size = board.length;

  for (let row = 0; row < size; row += 1) {
    let runLength = 1;
    for (let col = 1; col <= size; col += 1) {
      const prev = board[row]?.[col - 1];
      const current = board[row]?.[col];
      const isSame = current && prev && current.color === prev.color;

      if (isSame) {
        runLength += 1;
      } else {
        if (runLength >= 3 && prev) {
          for (let offset = 0; offset < runLength; offset += 1) {
            matches.add(`${row}-${col - 1 - offset}`);
          }
        }
        runLength = 1;
      }
    }
  }

  for (let col = 0; col < size; col += 1) {
    let runLength = 1;
    for (let row = 1; row <= size; row += 1) {
      const prev = board[row - 1]?.[col];
      const current = board[row]?.[col];
      const isSame = current && prev && current.color === prev.color;

      if (isSame) {
        runLength += 1;
      } else {
        if (runLength >= 3 && prev) {
          for (let offset = 0; offset < runLength; offset += 1) {
            matches.add(`${row - 1 - offset}-${col}`);
          }
        }
        runLength = 1;
      }
    }
  }

  return matches;
}

export function spawnNewTiles(count: number): Tile[] {
  return Array.from({ length: count }, () => createRandomTile());
}

export function resolveBoard(board: Board): {
  board: Board;
  matchedCount: number;
  didMatch: boolean;
} {
  const matches = findMatches(board);
  if (matches.size === 0) {
    return { board, matchedCount: 0, didMatch: false };
  }

  const size = board.length;
  const working: Array<Array<Tile | null>> = board.map((row) => row.slice());

  matches.forEach((key) => {
    const [rowText, colText] = key.split("-");
    const row = Number(rowText);
    const col = Number(colText);
    if (Number.isInteger(row) && Number.isInteger(col)) {
      if (working[row]?.[col]) {
        working[row][col] = null;
      }
    }
  });

  for (let col = 0; col < size; col += 1) {
    const columnTiles: Tile[] = [];
    for (let row = size - 1; row >= 0; row -= 1) {
      const tile = working[row]?.[col];
      if (tile) {
        columnTiles.push(tile);
      }
    }

    const missingCount = size - columnTiles.length;
    const newTiles = spawnNewTiles(missingCount);
    const rebuilt = [...newTiles, ...columnTiles];

    for (let row = 0; row < size; row += 1) {
      const nextTile = rebuilt[row];
      if (nextTile) {
        working[row][col] = nextTile;
      }
    }
  }

  const nextBoard: Board = working.map((row) =>
    row.map((tile) => tile ?? createRandomTile())
  );

  return { board: nextBoard, matchedCount: matches.size, didMatch: true };
}

export function checkClearCondition(score: number, level: Level): boolean {
  return score >= level.targetScore;
}
