import { BoardConfig, MatchGroup, ResolveResult, SpecialType, Tile, TileColor } from "./types";

let tileIdCounter = 0;

const randomFrom = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

export const cellKey = (row: number, col: number) => `${row},${col}`;

export const parseCellKey = (cell: string) => {
  const [row, col] = cell.split(",").map(Number);
  return { row, col };
};

export const createTile = (color: TileColor, special?: SpecialType): Tile => ({
  id: `t-${tileIdCounter++}`,
  color,
  special
});

export const generateBoard = (config: BoardConfig): Tile[][] => {
  tileIdCounter = 0;
  const board: Tile[][] = Array.from({ length: config.rows }, () => []);
  for (let row = 0; row < config.rows; row += 1) {
    for (let col = 0; col < config.cols; col += 1) {
      let color = randomFrom(config.tileTypes);
      let attempts = 0;
      while (attempts < 10) {
        const left1 = board[row]?.[col - 1];
        const left2 = board[row]?.[col - 2];
        const up1 = board[row - 1]?.[col];
        const up2 = board[row - 2]?.[col];
        if (left1 && left2 && left1.color === color && left2.color === color) {
          color = randomFrom(config.tileTypes);
        } else if (up1 && up2 && up1.color === color && up2.color === color) {
          color = randomFrom(config.tileTypes);
        } else {
          break;
        }
        attempts += 1;
      }
      board[row][col] = createTile(color);
    }
  }
  return board;
};

const withinBounds = (board: Tile[][], row: number, col: number) =>
  row >= 0 && col >= 0 && row < board.length && col < board[0].length;

export const swapTiles = (board: Tile[][], a: string, b: string): Tile[][] => {
  const { row: ar, col: ac } = parseCellKey(a);
  const { row: br, col: bc } = parseCellKey(b);
  const next = board.map((row) => row.slice());
  const temp = next[ar][ac];
  next[ar][ac] = next[br][bc];
  next[br][bc] = temp;
  return next;
};

export const findMatchGroups = (board: Tile[][]): MatchGroup[] => {
  const rows = board.length;
  const cols = board[0].length;
  const groups: MatchGroup[] = [];

  for (let row = 0; row < rows; row += 1) {
    let count = 1;
    for (let col = 1; col < cols; col += 1) {
      if (board[row][col].color === board[row][col - 1].color) {
        count += 1;
      } else {
        if (count >= 3) {
          const cells = Array.from({ length: count }, (_, i) => cellKey(row, col - 1 - i));
          groups.push({ cells });
        }
        count = 1;
      }
    }
    if (count >= 3) {
      const cells = Array.from({ length: count }, (_, i) => cellKey(row, cols - 1 - i));
      groups.push({ cells });
    }
  }

  for (let col = 0; col < cols; col += 1) {
    let count = 1;
    for (let row = 1; row < rows; row += 1) {
      if (board[row][col].color === board[row - 1][col].color) {
        count += 1;
      } else {
        if (count >= 3) {
          const cells = Array.from({ length: count }, (_, i) => cellKey(row - 1 - i, col));
          groups.push({ cells });
        }
        count = 1;
      }
    }
    if (count >= 3) {
      const cells = Array.from({ length: count }, (_, i) => cellKey(rows - 1 - i, col));
      groups.push({ cells });
    }
  }

  return groups;
};

export const getMatchLengths = (board: Tile[][]) => {
  const rows = board.length;
  const cols = board[0].length;
  const horizontal: number[][] = Array.from({ length: rows }, () => Array(cols).fill(1));
  const vertical: number[][] = Array.from({ length: rows }, () => Array(cols).fill(1));

  for (let row = 0; row < rows; row += 1) {
    let count = 1;
    for (let col = 1; col < cols; col += 1) {
      if (board[row][col].color === board[row][col - 1].color) {
        count += 1;
      } else {
        if (count >= 2) {
          for (let i = 0; i < count; i += 1) {
            horizontal[row][col - 1 - i] = count;
          }
        }
        count = 1;
      }
    }
    if (count >= 2) {
      for (let i = 0; i < count; i += 1) {
        horizontal[row][cols - 1 - i] = count;
      }
    }
  }

  for (let col = 0; col < cols; col += 1) {
    let count = 1;
    for (let row = 1; row < rows; row += 1) {
      if (board[row][col].color === board[row - 1][col].color) {
        count += 1;
      } else {
        if (count >= 2) {
          for (let i = 0; i < count; i += 1) {
            vertical[row - 1 - i][col] = count;
          }
        }
        count = 1;
      }
    }
    if (count >= 2) {
      for (let i = 0; i < count; i += 1) {
        vertical[rows - 1 - i][col] = count;
      }
    }
  }

  return { horizontal, vertical };
};

export const createSpecialsFromSwap = (
  board: Tile[][],
  swapCells: string[]
): { board: Tile[][]; specials: { cell: string; special: SpecialType; color: TileColor }[] } => {
  const { horizontal, vertical } = getMatchLengths(board);
  const next = board.map((row) => row.slice());
  const specials: { cell: string; special: SpecialType; color: TileColor }[] = [];

  swapCells.forEach((cell) => {
    const { row, col } = parseCellKey(cell);
    if (!withinBounds(board, row, col)) return;
    const h = horizontal[row][col];
    const v = vertical[row][col];
    if (h < 3 && v < 3) return;
    let special: SpecialType | null = null;
    if (h >= 5 || v >= 5) {
      special = "color";
    } else if (h >= 3 && v >= 3) {
      special = "bomb";
    } else if (h === 4) {
      special = "line-h";
    } else if (v === 4) {
      special = "line-v";
    }

    if (special) {
      const tile = next[row][col];
      next[row][col] = createTile(tile.color, special);
      specials.push({ cell, special, color: tile.color });
    }
  });

  return { board: next, specials };
};

const clearWithSpecial = (board: Tile[][], cell: string, clearSet: Set<string>) => {
  const { row, col } = parseCellKey(cell);
  if (!withinBounds(board, row, col)) return;
  const tile = board[row][col];
  if (!tile.special) return;
  const rows = board.length;
  const cols = board[0].length;
  if (tile.special === "line-h") {
    for (let c = 0; c < cols; c += 1) clearSet.add(cellKey(row, c));
  }
  if (tile.special === "line-v") {
    for (let r = 0; r < rows; r += 1) clearSet.add(cellKey(r, col));
  }
  if (tile.special === "bomb") {
    for (let r = row - 1; r <= row + 1; r += 1) {
      for (let c = col - 1; c <= col + 1; c += 1) {
        if (withinBounds(board, r, c)) clearSet.add(cellKey(r, c));
      }
    }
  }
  if (tile.special === "color") {
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        if (board[r][c].color === tile.color) {
          clearSet.add(cellKey(r, c));
        }
      }
    }
  }
};

export const resolveMatches = (
  board: Tile[][],
  config: BoardConfig,
  protectedCells: Set<string> = new Set()
): ResolveResult => {
  let working = board.map((row) => row.slice());
  const clearedTotal: string[] = [];
  let score = 0;
  let cascades = 0;
  const spawnedSpecials: { cell: string; special: SpecialType; color: TileColor }[] = [];

  for (let iteration = 0; iteration < 15; iteration += 1) {
    const matchGroups = findMatchGroups(working);
    if (matchGroups.length === 0) break;
    cascades += 1;

    const clearSet = new Set<string>();
    matchGroups.forEach((group) => group.cells.forEach((cell) => clearSet.add(cell)));
    protectedCells.forEach((cell) => clearSet.delete(cell));
    matchGroups.forEach((group) => {
      group.cells.forEach((cell) => clearWithSpecial(working, cell, clearSet));
    });
    protectedCells.forEach((cell) => clearSet.delete(cell));

    const clearedNow = Array.from(clearSet);
    const baseScore = clearedNow.length * 10;
    const cascadeBonus = Math.max(0, cascades - 1) * 20;
    score += baseScore + cascadeBonus;
    clearedTotal.push(...clearedNow);

    const next = working.map((row) => row.slice());
    clearedNow.forEach((cell) => {
      const { row, col } = parseCellKey(cell);
      next[row][col] = null as unknown as Tile;
    });

    for (let col = 0; col < config.cols; col += 1) {
      const columnTiles: Tile[] = [];
      for (let row = config.rows - 1; row >= 0; row -= 1) {
        const tile = next[row][col];
        if (tile) columnTiles.push(tile);
      }
      for (let row = config.rows - 1; row >= 0; row -= 1) {
        const tile = columnTiles.shift();
        if (tile) {
          next[row][col] = tile;
        } else {
          next[row][col] = createTile(randomFrom(config.tileTypes));
        }
      }
    }

    working = next;
  }

  return { board: working, cleared: clearedTotal, spawnedSpecials, score, cascades };
};

export const getComboClearSet = (board: Tile[][], a: string, b: string) => {
  const { row: ar, col: ac } = parseCellKey(a);
  const { row: br, col: bc } = parseCellKey(b);
  if (!withinBounds(board, ar, ac) || !withinBounds(board, br, bc)) return new Set<string>();
  const tileA = board[ar][ac];
  const tileB = board[br][bc];
  const clearSet = new Set<string>();
  const rows = board.length;
  const cols = board[0].length;

  if (!tileA.special && !tileB.special) return clearSet;

  if (tileA.special === "color" && tileB.special) {
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        clearSet.add(cellKey(r, c));
      }
    }
    return clearSet;
  }

  if (tileB.special === "color" && tileA.special) {
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        clearSet.add(cellKey(r, c));
      }
    }
    return clearSet;
  }

  if (tileA.special === "color") {
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        if (board[r][c].color === tileB.color) clearSet.add(cellKey(r, c));
      }
    }
    return clearSet;
  }

  if (tileB.special === "color") {
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        if (board[r][c].color === tileA.color) clearSet.add(cellKey(r, c));
      }
    }
    return clearSet;
  }

  if (tileA.special?.startsWith("line") && tileB.special?.startsWith("line")) {
    for (let c = 0; c < cols; c += 1) {
      clearSet.add(cellKey(ar, c));
      clearSet.add(cellKey(br, c));
    }
    for (let r = 0; r < rows; r += 1) {
      clearSet.add(cellKey(r, ac));
      clearSet.add(cellKey(r, bc));
    }
    return clearSet;
  }

  if (tileA.special === "bomb" && tileB.special === "bomb") {
    for (let r = ar - 2; r <= ar + 2; r += 1) {
      for (let c = ac - 2; c <= ac + 2; c += 1) {
        if (withinBounds(board, r, c)) clearSet.add(cellKey(r, c));
      }
    }
    for (let r = br - 2; r <= br + 2; r += 1) {
      for (let c = bc - 2; c <= bc + 2; c += 1) {
        if (withinBounds(board, r, c)) clearSet.add(cellKey(r, c));
      }
    }
    return clearSet;
  }

  if (tileA.special) clearWithSpecial(board, a, clearSet);
  if (tileB.special) clearWithSpecial(board, b, clearSet);
  return clearSet;
};

export const applyClearSet = (board: Tile[][], config: BoardConfig, clearSet: Set<string>) => {
  const next = board.map((row) => row.slice());
  const cleared = Array.from(clearSet);
  cleared.forEach((cell) => {
    const { row, col } = parseCellKey(cell);
    next[row][col] = null as unknown as Tile;
  });

  for (let col = 0; col < config.cols; col += 1) {
    const columnTiles: Tile[] = [];
    for (let row = config.rows - 1; row >= 0; row -= 1) {
      const tile = next[row][col];
      if (tile) columnTiles.push(tile);
    }
    for (let row = config.rows - 1; row >= 0; row -= 1) {
      const tile = columnTiles.shift();
      if (tile) {
        next[row][col] = tile;
      } else {
        next[row][col] = createTile(randomFrom(config.tileTypes));
      }
    }
  }

  return { board: next, cleared };
};
