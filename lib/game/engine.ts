import { Board, MatchResult, SpecialTile, Tile, TileColor } from "./types";

const specialScoreBonus: Record<SpecialTile, number> = {
  "line-h": 80,
  "line-v": 80,
  bomb: 120,
  color: 180
};

const tileColors: Record<TileColor, string> = {
  R: "#f87171",
  G: "#4ade80",
  B: "#60a5fa",
  Y: "#facc15",
  P: "#c084fc"
};

export const colorMap = tileColors;

const randomColor = (palette: TileColor[]) =>
  palette[Math.floor(Math.random() * palette.length)];

const createTile = (color: TileColor, overrides?: Partial<Tile>): Tile => ({
  id: `${color}-${Math.random().toString(36).slice(2, 9)}`,
  color,
  ...overrides
});

export const createBoard = (
  rows: number,
  cols: number,
  palette: TileColor[],
  blockedCells: string[] = [],
  overlays: { ice: string[]; jelly: string[] } = { ice: [], jelly: [] }
): Board => {
  const tiles: Tile[][] = [];
  const overlayGrid = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({}))
  );

  for (let row = 0; row < rows; row += 1) {
    const rowTiles: Tile[] = [];
    for (let col = 0; col < cols; col += 1) {
      const coord = `${row},${col}`;
      if (blockedCells.includes(coord)) {
        rowTiles.push(createTile(randomColor(palette), { blocked: true }));
        continue;
      }
      rowTiles.push(createTile(randomColor(palette)));
      if (overlays.ice.includes(coord)) {
        overlayGrid[row][col].ice = true;
      }
      if (overlays.jelly.includes(coord)) {
        overlayGrid[row][col].jelly = true;
      }
    }
    tiles.push(rowTiles);
  }

  return { rows, cols, tiles, overlays: overlayGrid };
};

const inBounds = (board: Board, row: number, col: number) =>
  row >= 0 && row < board.rows && col >= 0 && col < board.cols;

const cloneBoard = (board: Board): Board => ({
  rows: board.rows,
  cols: board.cols,
  tiles: board.tiles.map((row) => row.map((tile) => ({ ...tile }))),
  overlays: board.overlays.map((row) => row.map((cell) => ({ ...cell })))
});

const getMatches = (board: Board): MatchResult[] => {
  const matches: MatchResult[] = [];
  const visited = new Set<string>();

  for (let row = 0; row < board.rows; row += 1) {
    let run: { row: number; col: number }[] = [];
    for (let col = 0; col <= board.cols; col += 1) {
      const tile = col < board.cols ? board.tiles[row][col] : null;
      const last = run[run.length - 1];
      if (tile && !tile.blocked && (!last || board.tiles[last.row][last.col].color === tile.color)) {
        run.push({ row, col });
      } else {
        if (run.length >= 3) {
          matches.push({ matches: [...run], direction: "row" });
        }
        run = tile && !tile.blocked ? [{ row, col }] : [];
      }
    }
  }

  for (let col = 0; col < board.cols; col += 1) {
    let run: { row: number; col: number }[] = [];
    for (let row = 0; row <= board.rows; row += 1) {
      const tile = row < board.rows ? board.tiles[row][col] : null;
      const last = run[run.length - 1];
      if (tile && !tile.blocked && (!last || board.tiles[last.row][last.col].color === tile.color)) {
        run.push({ row, col });
      } else {
        if (run.length >= 3) {
          matches.push({ matches: [...run], direction: "col" });
        }
        run = tile && !tile.blocked ? [{ row, col }] : [];
      }
    }
  }

  return matches
    .map((match) => ({
      ...match,
      matches: match.matches.filter(({ row, col }) => {
        const key = `${row},${col}`;
        if (visited.has(key)) {
          return false;
        }
        visited.add(key);
        return true;
      })
    }))
    .filter((match) => match.matches.length >= 3);
};

const findSpecialFromMatches = (
  matches: MatchResult[],
  swapCells: { row: number; col: number }[]
): MatchResult[] => {
  return matches.map((match) => {
    const swapHit = match.matches.find((cell) =>
      swapCells.some((swap) => swap.row === cell.row && swap.col === cell.col)
    );
    if (!swapHit) {
      return match;
    }
    if (match.matches.length >= 5) {
      return { ...match, specialCreate: { ...swapHit, special: "color" } };
    }
    if (match.matches.length === 4) {
      return {
        ...match,
        specialCreate: {
          ...swapHit,
          special: match.direction === "row" ? "line-h" : "line-v"
        }
      };
    }
    return match;
  });
};

const detectTLShape = (matches: MatchResult[]): MatchResult[] => {
  const matchMap = new Map<string, number>();
  matches.forEach((match, index) => {
    match.matches.forEach((cell) => {
      const key = `${cell.row},${cell.col}`;
      matchMap.set(key, (matchMap.get(key) ?? 0) + 1);
    });
  });

  const tlCells = [...matchMap.entries()]
    .filter(([, count]) => count >= 2)
    .map(([coord]) => coord);

  if (tlCells.length === 0) {
    return matches;
  }

  return matches.map((match) => {
    const tl = match.matches.find((cell) => tlCells.includes(`${cell.row},${cell.col}`));
    if (!tl) {
      return match;
    }
    return { ...match, specialCreate: { ...tl, special: "bomb" } };
  });
};

const triggerSpecial = (
  board: Board,
  row: number,
  col: number,
  special: SpecialTile
): { cleared: { row: number; col: number }[]; score: number } => {
  const cleared: { row: number; col: number }[] = [];
  if (special === "line-h") {
    for (let c = 0; c < board.cols; c += 1) {
      cleared.push({ row, col: c });
    }
  } else if (special === "line-v") {
    for (let r = 0; r < board.rows; r += 1) {
      cleared.push({ row: r, col });
    }
  } else if (special === "bomb") {
    for (let r = row - 1; r <= row + 1; r += 1) {
      for (let c = col - 1; c <= col + 1; c += 1) {
        if (inBounds(board, r, c)) {
          cleared.push({ row: r, col: c });
        }
      }
    }
  } else if (special === "color") {
    const color = board.tiles[row][col].color;
    for (let r = 0; r < board.rows; r += 1) {
      for (let c = 0; c < board.cols; c += 1) {
        if (board.tiles[r][c].color === color && !board.tiles[r][c].blocked) {
          cleared.push({ row: r, col: c });
        }
      }
    }
  }
  return {
    cleared,
    score: specialScoreBonus[special] + cleared.length * 6
  };
};

const triggerCombo = (
  board: Board,
  a: { row: number; col: number; special?: SpecialTile },
  b: { row: number; col: number; special?: SpecialTile }
): { cleared: { row: number; col: number }[]; score: number } => {
  const specials = [a.special, b.special].filter(Boolean) as SpecialTile[];
  const cleared: { row: number; col: number }[] = [];
  if (specials.includes("color") && specials.length === 2) {
    for (let r = 0; r < board.rows; r += 1) {
      for (let c = 0; c < board.cols; c += 1) {
        if (!board.tiles[r][c].blocked) {
          cleared.push({ row: r, col: c });
        }
      }
    }
    return { cleared, score: 400 + cleared.length * 8 };
  }
  if (specials.includes("color")) {
    const otherColor = board.tiles[a.row][a.col].color;
    for (let r = 0; r < board.rows; r += 1) {
      for (let c = 0; c < board.cols; c += 1) {
        if (board.tiles[r][c].color === otherColor && !board.tiles[r][c].blocked) {
          cleared.push({ row: r, col: c });
        }
      }
    }
    return { cleared, score: 240 + cleared.length * 7 };
  }
  if (specials.includes("bomb") && specials.length === 2) {
    for (let r = a.row - 2; r <= a.row + 2; r += 1) {
      for (let c = a.col - 2; c <= a.col + 2; c += 1) {
        if (inBounds(board, r, c)) cleared.push({ row: r, col: c });
      }
    }
    return { cleared, score: 200 + cleared.length * 6 };
  }
  if (specials.every((special) => special === "line-h" || special === "line-v")) {
    const rows = new Set([a.row, b.row]);
    const cols = new Set([a.col, b.col]);
    rows.forEach((row) => {
      for (let c = 0; c < board.cols; c += 1) cleared.push({ row, col: c });
    });
    cols.forEach((col) => {
      for (let r = 0; r < board.rows; r += 1) cleared.push({ row: r, col });
    });
    return { cleared, score: 180 + cleared.length * 5 };
  }
  return { cleared: [], score: 0 };
};

const applyGravity = (board: Board, palette: TileColor[]): void => {
  for (let col = 0; col < board.cols; col += 1) {
    let writeRow = board.rows - 1;
    for (let row = board.rows - 1; row >= 0; row -= 1) {
      const tile = board.tiles[row][col];
      if (!tile.blocked) {
        board.tiles[writeRow][col] = tile;
        writeRow -= 1;
      } else {
        board.tiles[writeRow][col] = tile;
        writeRow = row - 1;
      }
    }
    for (let row = writeRow; row >= 0; row -= 1) {
      board.tiles[row][col] = createTile(randomColor(palette));
    }
  }
};

export const performSwap = (
  board: Board,
  a: { row: number; col: number },
  b: { row: number; col: number },
  palette: TileColor[]
): {
  board: Board;
  score: number;
  cleared: { row: number; col: number }[];
  specialTriggered: boolean;
  createdSpecial: boolean;
} => {
  const next = cloneBoard(board);
  const tileA = next.tiles[a.row][a.col];
  const tileB = next.tiles[b.row][b.col];
  if (tileA.blocked || tileB.blocked) {
    return { board, score: 0, cleared: [], specialTriggered: false, createdSpecial: false };
  }
  next.tiles[a.row][a.col] = tileB;
  next.tiles[b.row][b.col] = tileA;

  if (tileA.special || tileB.special) {
    const combo = triggerCombo(next, { ...a, special: tileA.special }, { ...b, special: tileB.special });
    if (combo.cleared.length > 0) {
      combo.cleared.forEach(({ row, col }) => {
        const overlay = next.overlays[row][col];
        if (overlay.ice) overlay.ice = false;
        if (overlay.jelly) overlay.jelly = false;
        next.tiles[row][col] = createTile(randomColor(palette));
      });
      applyGravity(next, palette);
      return {
        board: next,
        score: combo.score,
        cleared: combo.cleared,
        specialTriggered: true,
        createdSpecial: false
      };
    }
  }

  let matches = getMatches(next);
  if (matches.length === 0) {
    return { board, score: 0, cleared: [], specialTriggered: false, createdSpecial: false };
  }

  matches = findSpecialFromMatches(matches, [a, b]);
  matches = detectTLShape(matches);

  const cleared: { row: number; col: number }[] = [];
  let score = 0;
  let specialTriggered = false;
  let createdSpecial = false;

  matches.forEach((match) => {
    if (match.specialCreate) {
      const { row, col, special } = match.specialCreate;
      const existing = next.tiles[row][col];
      next.tiles[row][col] = createTile(existing.color, { special });
      createdSpecial = true;
      match.matches
        .filter((cell) => !(cell.row === row && cell.col === col))
        .forEach((cell) => {
          cleared.push(cell);
        });
    } else {
      match.matches.forEach((cell) => {
        cleared.push(cell);
      });
    }
  });

  cleared.forEach(({ row, col }) => {
    const tile = next.tiles[row][col];
    if (tile.special) {
      const blast = triggerSpecial(next, row, col, tile.special);
      blast.cleared.forEach((cell) => cleared.push(cell));
      score += blast.score;
      specialTriggered = true;
    }
  });

  const uniqueClears = Array.from(
    new Map(cleared.map((cell) => [`${cell.row},${cell.col}`, cell])).values()
  );

  uniqueClears.forEach(({ row, col }) => {
    const overlay = next.overlays[row][col];
    if (overlay.ice) {
      overlay.ice = false;
    } else if (overlay.jelly) {
      overlay.jelly = false;
    }
    next.tiles[row][col] = createTile(randomColor(palette));
  });

  score += uniqueClears.length * 10;

  applyGravity(next, palette);

  return { board: next, score, cleared: uniqueClears, specialTriggered, createdSpecial };
};

export const resolveBoard = (
  board: Board,
  palette: TileColor[]
): { board: Board; score: number; chain: number; cleared: { row: number; col: number }[] } => {
  let next = cloneBoard(board);
  let totalScore = 0;
  let chain = 0;
  let totalCleared: { row: number; col: number }[] = [];

  for (let i = 0; i < 8; i += 1) {
    const matches = getMatches(next);
    if (matches.length === 0) {
      break;
    }
    chain += 1;
    const cleared: { row: number; col: number }[] = [];
    matches.forEach((match) => {
      match.matches.forEach((cell) => cleared.push(cell));
    });
    const uniqueClears = Array.from(
      new Map(cleared.map((cell) => [`${cell.row},${cell.col}`, cell])).values()
    );
    uniqueClears.forEach(({ row, col }) => {
      next.tiles[row][col] = createTile(randomColor(palette));
    });
    totalScore += uniqueClears.length * 8 + chain * 12;
    applyGravity(next, palette);
    totalCleared = totalCleared.concat(uniqueClears);
  }

  return { board: next, score: totalScore, chain, cleared: totalCleared };
};
