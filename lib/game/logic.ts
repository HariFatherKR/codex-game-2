import { BoardConfig, Cell, CascadeResult, MatchGroup, SpecialType, SwapResult, Tile, TileColor } from './types';

const uid = () => Math.random().toString(36).slice(2, 9);

export const createTile = (color: TileColor, special?: SpecialType): Tile => ({
  id: uid(),
  color,
  special,
});

export const createBoard = (config: BoardConfig, specialBlocks: Cell[][] | null = null): Cell[][] => {
  const board: Cell[][] = Array.from({ length: config.rows }, () =>
    Array.from({ length: config.cols }, () => ({ tile: null }))
  );

  for (let r = 0; r < config.rows; r += 1) {
    for (let c = 0; c < config.cols; c += 1) {
      let color = randomColor(config.tileTypes);
      while (
        (r >= 2 && board[r - 1][c].tile?.color === color && board[r - 2][c].tile?.color === color) ||
        (c >= 2 && board[r][c - 1].tile?.color === color && board[r][c - 2].tile?.color === color)
      ) {
        color = randomColor(config.tileTypes);
      }
      board[r][c].tile = createTile(color);
    }
  }

  if (specialBlocks) {
    for (let r = 0; r < config.rows; r += 1) {
      for (let c = 0; c < config.cols; c += 1) {
        board[r][c].ice = specialBlocks[r][c].ice;
        board[r][c].jelly = specialBlocks[r][c].jelly;
      }
    }
  }

  return board;
};

export const randomColor = (colors: TileColor[]): TileColor => {
  return colors[Math.floor(Math.random() * colors.length)];
};

const cloneBoard = (board: Cell[][]): Cell[][] => board.map((row) => row.map((cell) => ({ ...cell, tile: cell.tile ? { ...cell.tile } : null })));

export const swapTiles = (board: Cell[][], a: [number, number], b: [number, number]): Cell[][] => {
  const cloned = cloneBoard(board);
  const [ar, ac] = a;
  const [br, bc] = b;
  const temp = cloned[ar][ac].tile;
  cloned[ar][ac].tile = cloned[br][bc].tile;
  cloned[br][bc].tile = temp;
  return cloned;
};

const inBounds = (board: Cell[][], r: number, c: number) => r >= 0 && c >= 0 && r < board.length && c < board[0].length;

export const findMatches = (board: Cell[][]): MatchGroup[] => {
  const matches: MatchGroup[] = [];
  const rows = board.length;
  const cols = board[0].length;

  for (let r = 0; r < rows; r += 1) {
    let start = 0;
    while (start < cols) {
      const tile = board[r][start].tile;
      if (!tile) {
        start += 1;
        continue;
      }
      let end = start + 1;
      while (end < cols && board[r][end].tile?.color === tile.color) {
        end += 1;
      }
      if (end - start >= 3) {
        matches.push({
          color: tile.color,
          cells: Array.from({ length: end - start }, (_, idx) => [r, start + idx]),
        });
      }
      start = end;
    }
  }

  for (let c = 0; c < cols; c += 1) {
    let start = 0;
    while (start < rows) {
      const tile = board[start][c].tile;
      if (!tile) {
        start += 1;
        continue;
      }
      let end = start + 1;
      while (end < rows && board[end][c].tile?.color === tile.color) {
        end += 1;
      }
      if (end - start >= 3) {
        matches.push({
          color: tile.color,
          cells: Array.from({ length: end - start }, (_, idx) => [start + idx, c]),
        });
      }
      start = end;
    }
  }

  return matches;
};

const getMatchCellSet = (matches: MatchGroup[]) => {
  const set = new Set<string>();
  matches.forEach((match) => {
    match.cells.forEach(([r, c]) => set.add(`${r},${c}`));
  });
  return set;
};

const detectSpecialCreation = (
  matches: MatchGroup[],
  swapTarget: [number, number]
): SpecialType | null => {
  const [sr, sc] = swapTarget;
  const matchAtSwap = matches.filter((match) => match.cells.some(([r, c]) => r === sr && c === sc));
  if (matchAtSwap.length === 0) return null;

  const longestLine = matchAtSwap.reduce((max, match) => Math.max(max, match.cells.length), 0);
  const hasHorizontal = matchAtSwap.some((match) => match.cells.some(([r, c]) => r === sr && c !== sc));
  const hasVertical = matchAtSwap.some((match) => match.cells.some(([r, c]) => c === sc && r !== sr));

  if (longestLine >= 5) return 'color';
  if (hasHorizontal && hasVertical) return 'bomb';
  if (longestLine === 4) {
    return hasHorizontal ? 'line-h' : 'line-v';
  }
  return null;
};

const expandSpecialClears = (
  board: Cell[][],
  baseClears: Set<string>,
  targetColor?: TileColor
): Set<string> => {
  const expanded = new Set<string>(baseClears);
  const rows = board.length;
  const cols = board[0].length;

  baseClears.forEach((key) => {
    const [r, c] = key.split(',').map(Number);
    const tile = board[r][c].tile;
    if (!tile?.special) return;

    if (tile.special === 'line-h') {
      for (let cc = 0; cc < cols; cc += 1) expanded.add(`${r},${cc}`);
    }
    if (tile.special === 'line-v') {
      for (let rr = 0; rr < rows; rr += 1) expanded.add(`${rr},${c}`);
    }
    if (tile.special === 'bomb') {
      for (let dr = -1; dr <= 1; dr += 1) {
        for (let dc = -1; dc <= 1; dc += 1) {
          const nr = r + dr;
          const nc = c + dc;
          if (inBounds(board, nr, nc)) expanded.add(`${nr},${nc}`);
        }
      }
    }
    if (tile.special === 'color') {
      const color = targetColor ?? tile.color;
      for (let rr = 0; rr < rows; rr += 1) {
        for (let cc = 0; cc < cols; cc += 1) {
          if (board[rr][cc].tile?.color === color) expanded.add(`${rr},${cc}`);
        }
      }
    }
  });

  return expanded;
};

const applyClears = (
  board: Cell[][],
  clearSet: Set<string>,
  scoreMultiplier: number
): CascadeResult => {
  const cleared: [number, number][] = [];
  const clearedTiles: { position: [number, number]; color: TileColor; special?: SpecialType }[] = [];
  const clearedBlocks = { ice: 0, jelly: 0 };
  const specialsCreated: { position: [number, number]; special: SpecialType }[] = [];

  clearSet.forEach((key) => {
    const [r, c] = key.split(',').map(Number);
    const cell = board[r][c];
    if (cell.tile) {
      cleared.push([r, c]);
      clearedTiles.push({ position: [r, c], color: cell.tile.color, special: cell.tile.special });
      cell.tile = null;
    }
    if (cell.ice) {
      cell.ice = false;
      clearedBlocks.ice += 1;
    }
    if (cell.jelly) {
      cell.jelly = false;
      clearedBlocks.jelly += 1;
    }
  });

  const scoreDelta = cleared.length * 10 * scoreMultiplier;

  return { board, cleared, clearedTiles, clearedBlocks, specialsCreated, scoreDelta };
};

const dropTiles = (board: Cell[][], config: BoardConfig): void => {
  const rows = board.length;
  const cols = board[0].length;

  for (let c = 0; c < cols; c += 1) {
    let write = rows - 1;
    for (let r = rows - 1; r >= 0; r -= 1) {
      if (board[r][c].tile) {
        if (write !== r) {
          board[write][c].tile = board[r][c].tile;
          board[r][c].tile = null;
        }
        write -= 1;
      }
    }
    for (let r = write; r >= 0; r -= 1) {
      board[r][c].tile = createTile(randomColor(config.tileTypes));
    }
  }
};

export const resolveBoard = (
  board: Cell[][],
  config: BoardConfig,
  swapColorTarget?: TileColor,
  scoreMultiplier = 1,
  protectedCell?: [number, number]
): CascadeResult[] => {
  const cascades: CascadeResult[] = [];
  let loopGuard = 0;

  while (loopGuard < 15) {
    const matches = findMatches(board);
    if (matches.length === 0) break;

    let clearSet = getMatchCellSet(matches);
    if (protectedCell && loopGuard === 0) {
      clearSet.delete(`${protectedCell[0]},${protectedCell[1]}`);
    }
    clearSet = expandSpecialClears(board, clearSet, swapColorTarget);

    const cascade = applyClears(board, clearSet, scoreMultiplier);
    cascades.push(cascade);

    dropTiles(board, config);
    loopGuard += 1;
  }

  return cascades;
};

export const swapAndResolve = (
  board: Cell[][],
  config: BoardConfig,
  a: [number, number],
  b: [number, number]
): SwapResult => {
  const [ar, ac] = a;
  const [br, bc] = b;
  if (Math.abs(ar - br) + Math.abs(ac - bc) !== 1) {
    return { board, swapped: false, cascades: [] };
  }

  const swapped = swapTiles(board, a, b);
  const matches = findMatches(swapped);
  const newBoard = cloneBoard(swapped);

  const swapTile = newBoard[br][bc].tile;
  const altTile = newBoard[ar][ac].tile;

  let swapColorTarget: TileColor | undefined;
  if (swapTile?.special === 'color') swapColorTarget = altTile?.color;
  if (altTile?.special === 'color') swapColorTarget = swapTile?.color;

  if (matches.length === 0 && swapColorTarget && (swapTile?.special === 'color' || altTile?.special === 'color')) {
    const colorPos: [number, number] = swapTile?.special === 'color' ? [br, bc] : [ar, ac];
    let clearSet = new Set<string>([`${colorPos[0]},${colorPos[1]}`]);
    clearSet = expandSpecialClears(newBoard, clearSet, swapColorTarget);
    const firstCascade = applyClears(newBoard, clearSet, 1);
    dropTiles(newBoard, config);
    const cascades = [firstCascade, ...resolveBoard(newBoard, config)];
    return { board: newBoard, swapped: true, cascades };
  }

  if (matches.length === 0) {
    return { board, swapped: false, cascades: [] };
  }

  const special = detectSpecialCreation(matches, [br, bc]);
  if (special && newBoard[br][bc].tile) {
    newBoard[br][bc].tile = { ...newBoard[br][bc].tile, special };
  }

  const cascades = resolveBoard(newBoard, config, swapColorTarget, 1, special ? [br, bc] : undefined);
  return { board: newBoard, swapped: true, cascades };
};
