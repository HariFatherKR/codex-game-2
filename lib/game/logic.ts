import { Board, Position, Tile } from "./types";
import { TILE_COLORS, createTile } from "./tiles";

const BOARD_SIZE = 8;

type MatchResult = {
  positions: Position[];
};

type ResolveResult = {
  board: Board;
  removedTiles: number;
};

const isWithinBounds = (position: Position): boolean => {
  return (
    position.row >= 0 &&
    position.row < BOARD_SIZE &&
    position.col >= 0 &&
    position.col < BOARD_SIZE
  );
};

const cloneBoard = (board: Board): Board => {
  return board.map((row) => row.map((tile) => tile));
};

export const swapTiles = (board: Board, first: Position, second: Position): Board => {
  const nextBoard = cloneBoard(board);
  const firstTile = nextBoard[first.row]?.[first.col];
  const secondTile = nextBoard[second.row]?.[second.col];

  if (!firstTile || !secondTile) {
    return nextBoard;
  }

  nextBoard[first.row][first.col] = secondTile;
  nextBoard[second.row][second.col] = firstTile;

  return nextBoard;
};

export const findMatches = (board: Board): MatchResult => {
  const positions = new Set<string>();

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    let runStart = 0;
    for (let col = 1; col <= BOARD_SIZE; col += 1) {
      const current = board[row]?.[col];
      const previous = board[row]?.[col - 1];
      if (col < BOARD_SIZE && current?.color === previous?.color) {
        continue;
      }

      const runLength = col - runStart;
      if (runLength >= 3) {
        for (let c = runStart; c < col; c += 1) {
          positions.add(`${row}-${c}`);
        }
      }
      runStart = col;
    }
  }

  for (let col = 0; col < BOARD_SIZE; col += 1) {
    let runStart = 0;
    for (let row = 1; row <= BOARD_SIZE; row += 1) {
      const current = board[row]?.[col];
      const previous = board[row - 1]?.[col];
      if (row < BOARD_SIZE && current?.color === previous?.color) {
        continue;
      }

      const runLength = row - runStart;
      if (runLength >= 3) {
        for (let r = runStart; r < row; r += 1) {
          positions.add(`${r}-${col}`);
        }
      }
      runStart = row;
    }
  }

  const matches = Array.from(positions).map((key) => {
    const [row, col] = key.split("-").map(Number);
    return { row, col };
  });

  return { positions: matches };
};

const dropTiles = (board: (Tile | null)[][]): (Tile | null)[][] => {
  const nextBoard = board.map((row) => row.slice());

  for (let col = 0; col < BOARD_SIZE; col += 1) {
    const columnTiles: (Tile | null)[] = [];
    for (let row = BOARD_SIZE - 1; row >= 0; row -= 1) {
      const tile = nextBoard[row]?.[col] ?? null;
      if (tile) {
        columnTiles.push(tile);
      }
    }

    for (let row = BOARD_SIZE - 1; row >= 0; row -= 1) {
      const tile = columnTiles[BOARD_SIZE - 1 - row] ?? null;
      nextBoard[row][col] = tile;
    }
  }

  return nextBoard;
};

export const spawnNewTiles = (board: (Tile | null)[][]): Board => {
  return board.map((row) =>
    row.map((tile) => {
      if (tile) {
        return tile;
      }
      const color = TILE_COLORS[Math.floor(Math.random() * TILE_COLORS.length)];
      return createTile(color);
    })
  );
};

const removeMatchedTiles = (board: Board, matches: Position[]): (Tile | null)[][] => {
  const nextBoard: (Tile | null)[][] = board.map((row) => row.map((tile) => tile));
  for (const match of matches) {
    if (!isWithinBounds(match)) {
      continue;
    }
    nextBoard[match.row][match.col] = null;
  }
  return nextBoard;
};

export const resolveBoard = (board: Board): ResolveResult => {
  let workingBoard: Board = cloneBoard(board);
  let removedTiles = 0;

  while (true) {
    const { positions } = findMatches(workingBoard);
    if (positions.length === 0) {
      break;
    }

    removedTiles += positions.length;
    const boardWithHoles = removeMatchedTiles(workingBoard, positions);
    const droppedBoard = dropTiles(boardWithHoles);
    workingBoard = spawnNewTiles(droppedBoard);
  }

  return { board: workingBoard, removedTiles };
};

export const checkClearCondition = (score: number, targetScore: number): boolean => {
  return score >= targetScore;
};
