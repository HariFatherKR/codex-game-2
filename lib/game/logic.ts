import type { Board, Position, Tile, TileColor } from "@/lib/game/types";

const tileColors: TileColor[] = ["R", "G", "B", "Y", "P"];

export function createTile(color: TileColor): Tile {
  return {
    id: crypto.randomUUID(),
    color,
  };
}

function getRandomColor(): TileColor {
  const index = Math.floor(Math.random() * tileColors.length);
  return tileColors[index];
}

export function createInitialBoard(size = 8): Board {
  const board: Tile[][] = [];

  for (let row = 0; row < size; row += 1) {
    const rowTiles: Tile[] = [];
    for (let col = 0; col < size; col += 1) {
      let color = getRandomColor();
      let matches = true;
      while (matches) {
        const leftMatch =
          col >= 2 && rowTiles[col - 1]?.color === color && rowTiles[col - 2]?.color === color;
        const upMatch =
          row >= 2 &&
          board[row - 1]?.[col]?.color === color &&
          board[row - 2]?.[col]?.color === color;
        matches = leftMatch || upMatch;
        if (matches) {
          color = getRandomColor();
        }
      }

      rowTiles.push(createTile(color));
    }
    board.push(rowTiles);
  }

  return board;
}

function cloneBoard(board: Board): Board {
  return board.map((row) => row.slice());
}

export function swapTiles(board: Board, first: Position, second: Position): Board {
  const nextBoard = cloneBoard(board);
  const temp = nextBoard[first.row]?.[first.col];
  if (!temp) {
    return nextBoard;
  }
  nextBoard[first.row][first.col] = nextBoard[second.row][second.col];
  nextBoard[second.row][second.col] = temp;
  return nextBoard;
}

export function findMatches(board: Board): Position[] {
  const matches = new Set<string>();
  const size = board.length;

  for (let row = 0; row < size; row += 1) {
    let runColor: TileColor | null = null;
    let runStart = 0;
    for (let col = 0; col <= size; col += 1) {
      const tile = board[row]?.[col];
      if (tile && tile.color === runColor) {
        continue;
      }
      if (runColor) {
        const runLength = col - runStart;
        if (runLength >= 3) {
          for (let fill = runStart; fill < col; fill += 1) {
            matches.add(`${row}-${fill}`);
          }
        }
      }
      runColor = tile ? tile.color : null;
      runStart = col;
    }
  }

  for (let col = 0; col < size; col += 1) {
    let runColor: TileColor | null = null;
    let runStart = 0;
    for (let row = 0; row <= size; row += 1) {
      const tile = board[row]?.[col];
      if (tile && tile.color === runColor) {
        continue;
      }
      if (runColor) {
        const runLength = row - runStart;
        if (runLength >= 3) {
          for (let fill = runStart; fill < row; fill += 1) {
            matches.add(`${fill}-${col}`);
          }
        }
      }
      runColor = tile ? tile.color : null;
      runStart = row;
    }
  }

  return Array.from(matches).map((entry) => {
    const [row, col] = entry.split("-").map(Number);
    return { row, col };
  });
}

function collapseBoard(board: (Tile | null)[][]): (Tile | null)[][] {
  const size = board.length;
  const nextBoard: (Tile | null)[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => null)
  );

  for (let col = 0; col < size; col += 1) {
    let writeRow = size - 1;
    for (let row = size - 1; row >= 0; row -= 1) {
      const tile = board[row]?.[col];
      if (tile) {
        nextBoard[writeRow][col] = tile;
        writeRow -= 1;
      }
    }
  }

  return nextBoard;
}

export function spawnNewTiles(board: (Tile | null)[][]): Board {
  return board.map((row) =>
    row.map((tile) => {
      if (tile) {
        return tile;
      }
      return createTile(getRandomColor());
    })
  );
}

export function resolveBoard(board: Board): { board: Board; matchedCount: number } {
  let working: (Tile | null)[][] = board.map((row) => row.map((tile) => tile));
  let totalMatched = 0;

  while (true) {
    const matches = findMatches(working as Board);
    if (matches.length === 0) {
      break;
    }
    totalMatched += matches.length;
    for (const match of matches) {
      if (working[match.row]?.[match.col]) {
        working[match.row][match.col] = null;
      }
    }
    const collapsed = collapseBoard(working);
    working = spawnNewTiles(collapsed);
  }

  return { board: working as Board, matchedCount: totalMatched };
}

export function checkClearCondition(score: number, targetScore: number): boolean {
  return score >= targetScore;
}
