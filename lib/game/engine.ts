import { BoardState, Cell, LevelDefinition, MatchGroup, MatchResult, SpecialType, Tile, TileColor } from './types';

const idSeed = () => Math.random().toString(36).slice(2, 9);

export const buildBoard = (level: LevelDefinition): BoardState => {
  const { rows, cols, tileTypes } = level.board;
  const cells: Cell[][] = Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => ({
      row,
      col,
      tile: null,
      layers: [],
      blocked: false
    }))
  );

  if (level.specialBlocks) {
    level.specialBlocks.forEach((block) => {
      block.cells.forEach((cell) => {
        const [r, c] = cell.split(',').map(Number);
        const target = cells[r]?.[c];
        if (target) {
          target.layers.push(block.type);
        }
      });
    });
  }

  if (level.blockedCells) {
    level.blockedCells.forEach((cell) => {
      const [r, c] = cell.split(',').map(Number);
      const target = cells[r]?.[c];
      if (target) {
        target.blocked = true;
      }
    });
  }

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (cells[row][col].blocked) continue;
      cells[row][col].tile = createRandomTile(tileTypes, cells, row, col);
    }
  }

  return { rows, cols, cells };
};

const createRandomTile = (tileTypes: TileColor[], cells: Cell[][], row: number, col: number): Tile => {
  let tries = 0;
  while (tries < 10) {
    const color = tileTypes[Math.floor(Math.random() * tileTypes.length)];
    if (wouldCreateMatch(cells, row, col, color)) {
      tries += 1;
      continue;
    }
    return { id: idSeed(), color };
  }
  const fallback = tileTypes[Math.floor(Math.random() * tileTypes.length)];
  return { id: idSeed(), color: fallback };
};

const wouldCreateMatch = (cells: Cell[][], row: number, col: number, color: TileColor): boolean => {
  const left1 = cells[row]?.[col - 1]?.tile?.color;
  const left2 = cells[row]?.[col - 2]?.tile?.color;
  if (left1 === color && left2 === color) return true;
  const up1 = cells[row - 1]?.[col]?.tile?.color;
  const up2 = cells[row - 2]?.[col]?.tile?.color;
  return up1 === color && up2 === color;
};

export const cloneBoard = (board: BoardState): BoardState => ({
  rows: board.rows,
  cols: board.cols,
  cells: board.cells.map((row) =>
    row.map((cell) => ({
      ...cell,
      tile: cell.tile ? { ...cell.tile } : null,
      layers: [...cell.layers]
    }))
  )
});

export const swapTiles = (board: BoardState, a: { row: number; col: number }, b: { row: number; col: number }) => {
  const next = cloneBoard(board);
  const cellA = next.cells[a.row]?.[a.col];
  const cellB = next.cells[b.row]?.[b.col];
  if (!cellA || !cellB || cellA.blocked || cellB.blocked) return next;
  const temp = cellA.tile;
  cellA.tile = cellB.tile;
  cellB.tile = temp;
  return next;
};

const gatherLineMatches = (board: BoardState): MatchGroup[] => {
  const matches: MatchGroup[] = [];
  for (let row = 0; row < board.rows; row += 1) {
    let start = 0;
    while (start < board.cols) {
      const cell = board.cells[row][start];
      const color = cell.tile?.color;
      if (!color) {
        start += 1;
        continue;
      }
      let end = start + 1;
      while (end < board.cols && board.cells[row][end].tile?.color === color) {
        end += 1;
      }
      const length = end - start;
      if (length >= 3) {
        matches.push({
          color,
          length,
          shape: 'line',
          orientation: 'horizontal',
          cells: Array.from({ length }, (_, idx) => ({ row, col: start + idx }))
        });
      }
      start = end;
    }
  }

  for (let col = 0; col < board.cols; col += 1) {
    let start = 0;
    while (start < board.rows) {
      const cell = board.cells[start][col];
      const color = cell.tile?.color;
      if (!color) {
        start += 1;
        continue;
      }
      let end = start + 1;
      while (end < board.rows && board.cells[end][col].tile?.color === color) {
        end += 1;
      }
      const length = end - start;
      if (length >= 3) {
        matches.push({
          color,
          length,
          shape: 'line',
          orientation: 'vertical',
          cells: Array.from({ length }, (_, idx) => ({ row: start + idx, col }))
        });
      }
      start = end;
    }
  }

  return matches;
};

const detectShapeMatches = (lineMatches: MatchGroup[]): MatchGroup[] => {
  const combos: MatchGroup[] = [];
  const horizontal = lineMatches.filter((match) => match.orientation === 'horizontal');
  const vertical = lineMatches.filter((match) => match.orientation === 'vertical');

  horizontal.forEach((hMatch) => {
    vertical.forEach((vMatch) => {
      const intersection = hMatch.cells.find((cell) =>
        vMatch.cells.some((vCell) => vCell.row === cell.row && vCell.col === cell.col)
      );
      if (intersection) {
        const combined = [...hMatch.cells, ...vMatch.cells].reduce<{ row: number; col: number }[]>((acc, cell) => {
          if (!acc.some((entry) => entry.row === cell.row && entry.col === cell.col)) {
            acc.push(cell);
          }
          return acc;
        }, []);
        combos.push({
          color: hMatch.color,
          length: combined.length,
          shape: 't-shape',
          cells: combined
        });
      }
    });
  });

  return combos;
};

const uniqueCells = (cells: { row: number; col: number }[]) =>
  cells.filter((cell, index, arr) => arr.findIndex((item) => item.row === cell.row && item.col === cell.col) === index);

const resolveSpecialAt = (match: MatchGroup): SpecialType | null => {
  if (match.shape !== 'line') return 'bomb';
  if (match.length >= 5) return 'color';
  if (match.length === 4) return match.orientation === 'horizontal' ? 'lineH' : 'lineV';
  return null;
};

const expandSpecialRemoval = (board: BoardState, cell: { row: number; col: number }, targetColor?: TileColor) => {
  const result: { row: number; col: number }[] = [];
  const tile = board.cells[cell.row]?.[cell.col]?.tile;
  if (!tile) return result;
  if (tile.special === 'lineH') {
    for (let col = 0; col < board.cols; col += 1) {
      result.push({ row: cell.row, col });
    }
  } else if (tile.special === 'lineV') {
    for (let row = 0; row < board.rows; row += 1) {
      result.push({ row, col: cell.col });
    }
  } else if (tile.special === 'bomb') {
    for (let row = cell.row - 1; row <= cell.row + 1; row += 1) {
      for (let col = cell.col - 1; col <= cell.col + 1; col += 1) {
        if (row >= 0 && col >= 0 && row < board.rows && col < board.cols) {
          result.push({ row, col });
        }
      }
    }
  } else if (tile.special === 'color') {
    const color = targetColor ?? tile.color;
    for (let row = 0; row < board.rows; row += 1) {
      for (let col = 0; col < board.cols; col += 1) {
        if (board.cells[row][col].tile?.color === color) {
          result.push({ row, col });
        }
      }
    }
  }
  return result;
};

export const resolveMatches = (
  board: BoardState,
  swapPositions: { row: number; col: number }[] = []
): MatchResult | null => {
  const lineMatches = gatherLineMatches(board);
  const shapeMatches = detectShapeMatches(lineMatches);
  const allMatches = [...lineMatches, ...shapeMatches];
  if (allMatches.length === 0) return null;

  const matches = allMatches.reduce<MatchGroup[]>((acc, match) => {
    if (match.shape !== 'line') {
      acc.push(match);
      return acc;
    }
    const coveredByShape = shapeMatches.some((shape) =>
      match.cells.some((cell) => shape.cells.some((sCell) => sCell.row === cell.row && sCell.col === cell.col))
    );
    if (!coveredByShape) acc.push(match);
    return acc;
  }, []);

  const next = cloneBoard(board);
  const removedCells: { row: number; col: number; tile: Tile }[] = [];
  const specialsCreated: { row: number; col: number; special: SpecialType }[] = [];
  let scoreGained = 0;
  let clearedLayers = 0;

  const removals: { row: number; col: number }[] = [];

  matches.forEach((match) => {
    const specialType = resolveSpecialAt(match);
    let specialCell: { row: number; col: number } | null = null;
    if (specialType) {
      specialCell = swapPositions.find((pos) => match.cells.some((cell) => cell.row === pos.row && cell.col === pos.col)) ||
        match.cells[Math.floor(match.cells.length / 2)] ||
        null;
    }

    match.cells.forEach((cell) => {
      if (specialCell && cell.row === specialCell.row && cell.col === specialCell.col) return;
      removals.push(cell);
    });

    if (specialType && specialCell) {
      const target = next.cells[specialCell.row]?.[specialCell.col];
      if (target?.tile) {
        target.tile.special = specialType;
        specialsCreated.push({ row: specialCell.row, col: specialCell.col, special: specialType });
      }
    }
  });

  const expandedRemovals = [...removals];
  removals.forEach((cell) => {
    const tile = next.cells[cell.row]?.[cell.col]?.tile;
    if (tile?.special) {
      expandedRemovals.push(...expandSpecialRemoval(next, cell, tile.color));
    }
  });

  uniqueCells(expandedRemovals).forEach((cell) => {
    const target = next.cells[cell.row]?.[cell.col];
    if (!target?.tile) return;
    removedCells.push({ row: cell.row, col: cell.col, tile: target.tile });
    scoreGained += 10;
    target.tile = null;
    if (target.layers.length > 0) {
      target.layers.pop();
      scoreGained += 20;
      clearedLayers += 1;
    }
  });

  applyGravity(next);
  fillEmpty(next, board);

  return {
    board: next,
    removed: removedCells,
    specialsCreated,
    scoreGained,
    clearedLayers,
    cascades: 0
  };
};

const applyGravity = (board: BoardState) => {
  for (let col = 0; col < board.cols; col += 1) {
    for (let row = board.rows - 1; row >= 0; row -= 1) {
      if (board.cells[row][col].blocked) continue;
      if (board.cells[row][col].tile) continue;
      let above = row - 1;
      while (above >= 0 && (!board.cells[above][col].tile || board.cells[above][col].blocked)) {
        above -= 1;
      }
      if (above >= 0) {
        board.cells[row][col].tile = board.cells[above][col].tile;
        board.cells[above][col].tile = null;
      }
    }
  }
};

const fillEmpty = (board: BoardState, original: BoardState) => {
  const tileTypes = original.cells
    .flat()
    .map((cell) => cell.tile?.color)
    .filter(Boolean) as TileColor[];
  const palette = tileTypes.length > 0 ? Array.from(new Set(tileTypes)) : (['R', 'G', 'B', 'Y', 'P'] as TileColor[]);
  for (let row = 0; row < board.rows; row += 1) {
    for (let col = 0; col < board.cols; col += 1) {
      if (board.cells[row][col].blocked) continue;
      if (!board.cells[row][col].tile) {
        board.cells[row][col].tile = createRandomTile(palette, board.cells, row, col);
      }
    }
  }
};

export const resolveCascade = (
  board: BoardState,
  swapPositions: { row: number; col: number }[] = []
): MatchResult | null => {
  const first = resolveMatches(board, swapPositions);
  if (!first) return null;
  let current = first;
  let cascades = 0;
  while (cascades < 10) {
    const next = resolveMatches(current.board, []);
    if (!next) break;
    current = {
      ...next,
      removed: [...current.removed, ...next.removed],
      specialsCreated: [...current.specialsCreated, ...next.specialsCreated],
      scoreGained: current.scoreGained + next.scoreGained,
      clearedLayers: current.clearedLayers + next.clearedLayers,
      cascades: current.cascades + 1
    };
    cascades += 1;
  }
  current.cascades = cascades;
  return current;
};

export const resolveSpecialCombo = (
  board: BoardState,
  a: { row: number; col: number },
  b: { row: number; col: number }
): MatchResult | null => {
  const next = cloneBoard(board);
  const tileA = next.cells[a.row]?.[a.col]?.tile;
  const tileB = next.cells[b.row]?.[b.col]?.tile;
  if (!tileA?.special || !tileB?.special) return null;

  const removals: { row: number; col: number }[] = [];
  if (tileA.special === 'lineH' && tileB.special === 'lineV' || tileA.special === 'lineV' && tileB.special === 'lineH') {
    removals.push(...expandSpecialRemoval(next, a));
    removals.push(...expandSpecialRemoval(next, b));
  } else if (tileA.special === 'bomb' && tileB.special === 'bomb') {
    for (let row = a.row - 2; row <= a.row + 2; row += 1) {
      for (let col = a.col - 2; col <= a.col + 2; col += 1) {
        if (row >= 0 && col >= 0 && row < next.rows && col < next.cols) {
          removals.push({ row, col });
        }
      }
    }
  } else if (tileA.special === 'color' || tileB.special === 'color') {
    const targetColor = tileA.special === 'color' ? tileB.color : tileA.color;
    for (let row = 0; row < next.rows; row += 1) {
      for (let col = 0; col < next.cols; col += 1) {
        if (next.cells[row][col].tile?.color === targetColor) {
          removals.push({ row, col });
        }
      }
    }
  } else {
    removals.push(...expandSpecialRemoval(next, a));
    removals.push(...expandSpecialRemoval(next, b));
  }

  const unique = uniqueCells(removals);
  const removedCells: { row: number; col: number; tile: Tile }[] = [];
  let scoreGained = 0;
  let clearedLayers = 0;
  unique.forEach((cell) => {
    const target = next.cells[cell.row][cell.col];
    if (!target.tile) return;
    removedCells.push({ row: cell.row, col: cell.col, tile: target.tile });
    target.tile = null;
    scoreGained += 15;
    if (target.layers.length > 0) {
      target.layers.pop();
      clearedLayers += 1;
    }
  });

  applyGravity(next);
  fillEmpty(next, board);

  return {
    board: next,
    removed: removedCells,
    specialsCreated: [],
    scoreGained,
    clearedLayers,
    cascades: 0
  };
};
