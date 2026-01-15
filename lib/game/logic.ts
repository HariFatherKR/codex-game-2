import { createTile, getRandomColor } from "./tile";
import type { Board, BoardCell, Position } from "./types";

export function swapTiles(board: Board, first: Position, second: Position): Board {
  const nextBoard = board.map((row) => row.slice());
  const firstTile = nextBoard[first.row]?.[first.col] ?? null;
  const secondTile = nextBoard[second.row]?.[second.col] ?? null;

  if (!firstTile || !secondTile) {
    return nextBoard;
  }

  nextBoard[first.row][first.col] = secondTile;
  nextBoard[second.row][second.col] = firstTile;

  return nextBoard;
}

export function findMatches(board: Board): Set<string> {
  const matches = new Set<string>();
  const size = board.length;

  for (let row = 0; row < size; row += 1) {
    let streakColor: string | null = null;
    let streakStart = 0;
    for (let col = 0; col <= size; col += 1) {
      const tile = col < size ? board[row]?.[col] ?? null : null;
      const color = tile?.color ?? null;
      if (color && color === streakColor) {
        continue;
      }

      const streakLength = col - streakStart;
      if (streakColor && streakLength >= 3) {
        for (let matchCol = streakStart; matchCol < col; matchCol += 1) {
          matches.add(`${row},${matchCol}`);
        }
      }

      streakColor = color;
      streakStart = col;
    }
  }

  for (let col = 0; col < size; col += 1) {
    let streakColor: string | null = null;
    let streakStart = 0;
    for (let row = 0; row <= size; row += 1) {
      const tile = row < size ? board[row]?.[col] ?? null : null;
      const color = tile?.color ?? null;
      if (color && color === streakColor) {
        continue;
      }

      const streakLength = row - streakStart;
      if (streakColor && streakLength >= 3) {
        for (let matchRow = streakStart; matchRow < row; matchRow += 1) {
          matches.add(`${matchRow},${col}`);
        }
      }

      streakColor = color;
      streakStart = row;
    }
  }

  return matches;
}

export function resolveBoard(board: Board): { board: Board; scoreGained: number } {
  let currentBoard = board.map((row) => row.slice());
  let scoreGained = 0;

  while (true) {
    const matches = findMatches(currentBoard);
    if (matches.size === 0) {
      break;
    }

    scoreGained += matches.size * 10;
    currentBoard = removeMatches(currentBoard, matches);
    currentBoard = collapseBoard(currentBoard);
    currentBoard = spawnNewTiles(currentBoard);
  }

  return { board: currentBoard, scoreGained };
}

export function spawnNewTiles(board: Board): Board {
  return board.map((row) =>
    row.map((cell) => {
      if (cell) {
        return cell;
      }
      return createTile(getRandomColor());
    })
  );
}

export function checkClearCondition(score: number, targetScore: number): boolean {
  return score >= targetScore;
}

function removeMatches(board: Board, matches: Set<string>): Board {
  return board.map((row, rowIndex) =>
    row.map((cell, colIndex) => {
      if (matches.has(`${rowIndex},${colIndex}`)) {
        return null;
      }
      return cell;
    })
  );
}

function collapseBoard(board: Board): Board {
  const size = board.length;
  const columns: BoardCell[][] = [];

  for (let col = 0; col < size; col += 1) {
    const column: BoardCell[] = [];
    for (let row = size - 1; row >= 0; row -= 1) {
      const cell = board[row]?.[col] ?? null;
      if (cell) {
        column.push(cell);
      }
    }
    columns.push(column);
  }

  const nextBoard: Board = [];
  for (let row = 0; row < size; row += 1) {
    const nextRow: BoardCell[] = [];
    for (let col = 0; col < size; col += 1) {
      const column = columns[col] ?? [];
      const cellIndexFromBottom = size - 1 - row;
      const cell = column[cellIndexFromBottom] ?? null;
      nextRow.push(cell);
    }
    nextBoard.push(nextRow);
  }

  return nextBoard;
}
