"use client";

import { useEffect, useRef, useState } from "react";
import { defaultLevels } from "@/data/levels";
import { LevelDefinition, Objective, SpecialBlock, Tile, TileColor } from "@/lib/game/types";
import {
  applyClearSet,
  cellKey,
  createSpecialsFromSwap,
  findMatchGroups,
  generateBoard,
  getComboClearSet,
  parseCellKey,
  resolveMatches,
  swapTiles
} from "@/lib/game/logic";
import {
  loadLevels,
  loadSettings,
  loadTutorialComplete,
  saveLevels,
  saveSettings,
  saveTutorialComplete,
  SettingsState
} from "@/lib/game/storage";

type View = "levels" | "game" | "editor";

interface GameProgress {
  score: number;
  movesLeft: number;
  collected: Record<TileColor, number>;
  clearedBlocks: Record<"ice" | "jelly", number>;
  cascades: number;
}

interface GameState extends GameProgress {
  level: LevelDefinition;
  board: Tile[][];
  overlayBlocks: Record<string, "ice" | "jelly">;
  selectedCell: string | null;
  status: "playing" | "won" | "lost";
  tutorialIndex: number;
  tutorialActive: boolean;
}

const tileColors: Record<TileColor, string> = {
  R: "#ff6b6b",
  G: "#54d98c",
  B: "#4d8dff",
  Y: "#ffd166",
  P: "#c77dff",
  O: "#ff922b"
};

const defaultProgress = (): GameProgress => ({
  score: 0,
  movesLeft: 0,
  collected: { R: 0, G: 0, B: 0, Y: 0, P: 0, O: 0 },
  clearedBlocks: { ice: 0, jelly: 0 },
  cascades: 0
});

const createOverlayBlocks = (blocks: SpecialBlock[]) => {
  const overlay: Record<string, "ice" | "jelly"> = {};
  blocks.forEach((block) => {
    block.cells.forEach((cell) => {
      overlay[cell] = block.type;
    });
  });
  return overlay;
};

const isAdjacent = (a: string, b: string) => {
  const { row: ar, col: ac } = parseCellKey(a);
  const { row: br, col: bc } = parseCellKey(b);
  return Math.abs(ar - br) + Math.abs(ac - bc) === 1;
};

const getClearedColors = (board: Tile[][], cleared: string[]) => {
  const counts: Partial<Record<TileColor, number>> = {};
  cleared.forEach((cell) => {
    const { row, col } = parseCellKey(cell);
    const tile = board[row]?.[col];
    if (!tile) return;
    counts[tile.color] = (counts[tile.color] ?? 0) + 1;
  });
  return counts;
};

const getObjectivesMet = (objectives: Objective[], progress: GameProgress) =>
  objectives.every((objective) => {
    if (objective.type === "score") {
      return progress.score >= objective.target.score;
    }
    if (objective.type === "collect") {
      return (progress.collected[objective.target.color] ?? 0) >= objective.target.count;
    }
    if (objective.type === "clear") {
      return (progress.clearedBlocks[objective.target.blockType] ?? 0) >= objective.target.count;
    }
    return false;
  });

const createLevelSummary = (objective: Objective) => {
  if (objective.type === "score") return `점수 ${objective.target.score}`;
  if (objective.type === "collect") return `${objective.target.color} ${objective.target.count}개`;
  return `${objective.target.blockType} ${objective.target.count}개 제거`;
};

const createBlankLevel = (): LevelDefinition => ({
  id: `level-${Date.now()}`,
  name: "New Level",
  board: { rows: 8, cols: 8, tileTypes: ["R", "G", "B", "Y", "P"] },
  movesLimit: 18,
  parMoves: 14,
  objectives: [{ type: "score", target: { score: 1000 } }],
  specialBlocks: [],
  tutorial: { enabled: false, steps: [] }
});

export default function Home() {
  const [view, setView] = useState<View>("levels");
  const [levels, setLevels] = useState<LevelDefinition[]>(defaultLevels);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<SettingsState>({ soundOn: true, vibrationOn: true });
  const [editorLevel, setEditorLevel] = useState<LevelDefinition>(createBlankLevel());
  const [editorJson, setEditorJson] = useState("");
  const [blockMode, setBlockMode] = useState<"ice" | "jelly">("ice");
  const audioRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    setLevels(loadLevels(defaultLevels));
    setSettings(loadSettings());
  }, []);

  useEffect(() => {
    if (editorLevel) {
      setEditorJson(JSON.stringify(editorLevel, null, 2));
    }
  }, [editorLevel]);

  const playSound = (type: "match" | "special" | "explosion" | "clear" | "fail") => {
    if (!settings.soundOn || typeof window === "undefined") return;
    if (!audioRef.current) {
      audioRef.current = new AudioContext();
    }
    const ctx = audioRef.current;
    if (!ctx) return;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const freqMap: Record<typeof type, number> = {
      match: 440,
      special: 660,
      explosion: 220,
      clear: 520,
      fail: 180
    };
    oscillator.frequency.value = freqMap[type];
    oscillator.type = "sine";
    gain.gain.value = 0.08;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.12);
  };

  const triggerVibration = (pattern: number | number[]) => {
    if (!settings.vibrationOn) return;
    if (typeof navigator === "undefined") return;
    if (typeof navigator.vibrate !== "function") return;
    navigator.vibrate(pattern);
  };

  const startGame = (level: LevelDefinition) => {
    const board = generateBoard(level.board);
    const overlayBlocks = createOverlayBlocks(level.specialBlocks);
    const progress = defaultProgress();
    const tutorialActive = level.tutorial?.enabled && !loadTutorialComplete();
    setGameState({
      level,
      board,
      overlayBlocks,
      selectedCell: null,
      status: "playing",
      movesLeft: level.movesLimit,
      tutorialIndex: 0,
      tutorialActive,
      ...progress
    });
    setView("game");
  };

  const handleSwap = (row: number, col: number) => {
    if (!gameState || gameState.status !== "playing") return;
    const cell = cellKey(row, col);
    if (!gameState.selectedCell) {
      setGameState({ ...gameState, selectedCell: cell });
      return;
    }
    if (gameState.selectedCell === cell) {
      setGameState({ ...gameState, selectedCell: null });
      return;
    }
    if (!isAdjacent(gameState.selectedCell, cell)) {
      setGameState({ ...gameState, selectedCell: cell });
      return;
    }

    const swapA = gameState.selectedCell;
    const swapB = cell;
    let workingBoard = swapTiles(gameState.board, swapA, swapB);
    const comboClearSet = getComboClearSet(workingBoard, swapA, swapB);
    const totalCleared: string[] = [];
    let scoreGained = 0;
    let cascades = 0;
    let overlayBlocks = { ...gameState.overlayBlocks };
    const collected = { ...gameState.collected };
    const clearedBlocks = { ...gameState.clearedBlocks };

    const applyClears = (boardBefore: Tile[][], clearedCells: string[]) => {
      const colorCounts = getClearedColors(boardBefore, clearedCells);
      Object.entries(colorCounts).forEach(([color, count]) => {
        const key = color as TileColor;
        collected[key] = (collected[key] ?? 0) + (count ?? 0);
      });
      clearedCells.forEach((cellKeyValue) => {
        const blockType = overlayBlocks[cellKeyValue];
        if (blockType) {
          clearedBlocks[blockType] += 1;
          delete overlayBlocks[cellKeyValue];
        }
      });
    };

    if (comboClearSet.size > 0) {
      const clearedCells = Array.from(comboClearSet);
      applyClears(workingBoard, clearedCells);
      totalCleared.push(...clearedCells);
      scoreGained += clearedCells.length * 15 + 100;
      triggerVibration([40]);
      playSound("explosion");
      const applied = applyClearSet(workingBoard, gameState.level.board, comboClearSet);
      workingBoard = applied.board;
    }

    if (comboClearSet.size === 0) {
      const matches = findMatchGroups(workingBoard);
      if (matches.length === 0) {
        setGameState({ ...gameState, selectedCell: null });
        return;
      }
      const { board: specialBoard, specials } = createSpecialsFromSwap(workingBoard, [
        swapA,
        swapB
      ]);
      workingBoard = specialBoard;
      if (specials.length > 0) {
        playSound("special");
        triggerVibration([30]);
      }
      const resolved = resolveMatches(
        workingBoard,
        gameState.level.board,
        new Set(specials.map((special) => special.cell))
      );
      if (resolved.cleared.length > 0) {
        applyClears(workingBoard, resolved.cleared);
        totalCleared.push(...resolved.cleared);
        scoreGained += resolved.score;
        cascades = resolved.cascades;
        workingBoard = resolved.board;
      }
    } else {
      const resolved = resolveMatches(workingBoard, gameState.level.board);
      if (resolved.cleared.length > 0) {
        applyClears(workingBoard, resolved.cleared);
        totalCleared.push(...resolved.cleared);
        scoreGained += resolved.score;
        cascades = resolved.cascades;
        workingBoard = resolved.board;
      }
    }

    if (totalCleared.length === 0) {
      setGameState({ ...gameState, selectedCell: null });
      return;
    }

    playSound("match");

    let movesLeft = gameState.movesLeft - 1;
    let score = gameState.score + scoreGained;
    const nextProgress: GameProgress = {
      score,
      movesLeft,
      collected,
      clearedBlocks,
      cascades
    };

    let status: GameState["status"] = "playing";
    const objectivesMet = getObjectivesMet(gameState.level.objectives, nextProgress);
    if (objectivesMet) {
      score += movesLeft * 50;
      status = "won";
      playSound("clear");
      triggerVibration([60, 40, 60]);
    } else if (movesLeft <= 0) {
      status = "lost";
      playSound("fail");
    }

    let tutorialActive = gameState.tutorialActive;
    let tutorialIndex = gameState.tutorialIndex;
    if (tutorialActive) {
      const totalSteps = gameState.level.tutorial?.steps.length ?? 0;
      if (tutorialIndex >= totalSteps - 1) {
        saveTutorialComplete();
        tutorialActive = false;
      } else {
        tutorialIndex += 1;
      }
    }

    setGameState({
      ...gameState,
      board: workingBoard,
      overlayBlocks,
      selectedCell: null,
      movesLeft,
      score,
      collected,
      clearedBlocks,
      cascades,
      status,
      tutorialIndex,
      tutorialActive
    });
  };

  const objectives = gameState?.level.objectives ?? [];
  const tutorialStep = gameState?.tutorialActive
    ? gameState.level.tutorial?.steps[gameState.tutorialIndex]
    : undefined;
  const highlightObjectives = tutorialStep?.type === "text" && tutorialStep.message.includes("목표");

  const handleTutorialClose = () => {
    if (!gameState || !gameState.tutorialActive) return;
    const totalSteps = gameState.level.tutorial?.steps.length ?? 0;
    if (gameState.tutorialIndex >= totalSteps - 1) {
      saveTutorialComplete();
      setGameState({ ...gameState, tutorialActive: false });
      return;
    }
    setGameState({ ...gameState, tutorialIndex: gameState.tutorialIndex + 1 });
  };

  const updateEditorObjective = (index: number, updates: Partial<Objective>) => {
    const nextObjectives = [...editorLevel.objectives];
    const objective = nextObjectives[index];
    nextObjectives[index] = { ...objective, ...updates } as Objective;
    setEditorLevel({ ...editorLevel, objectives: nextObjectives });
  };

  const toggleBlockCell = (cell: string) => {
    const blocks = [...editorLevel.specialBlocks];
    const blockIndex = blocks.findIndex((block) => block.type === blockMode);
    if (blockIndex === -1) {
      blocks.push({ type: blockMode, cells: [cell] });
    } else {
      const cells = new Set(blocks[blockIndex].cells);
      if (cells.has(cell)) {
        cells.delete(cell);
      } else {
        cells.add(cell);
      }
      blocks[blockIndex] = { ...blocks[blockIndex], cells: Array.from(cells) };
    }
    setEditorLevel({ ...editorLevel, specialBlocks: blocks });
  };

  const handleEditorSave = () => {
    const nextLevels = levels.some((level) => level.id === editorLevel.id)
      ? levels.map((level) => (level.id === editorLevel.id ? editorLevel : level))
      : [...levels, editorLevel];
    setLevels(nextLevels);
    saveLevels(nextLevels);
  };

  const handleEditorImport = () => {
    try {
      const parsed = JSON.parse(editorJson) as LevelDefinition;
      setEditorLevel(parsed);
    } catch (error) {
      console.error(error);
      alert("JSON 파싱에 실패했습니다.");
    }
  };

  const handleSettingsSave = () => {
    saveSettings(settings);
    setSettingsOpen(false);
  };

  return (
    <>
      <div className="header">
        <h1>Codex Match</h1>
        <div className="nav-buttons">
          <button className="secondary" onClick={() => setView("levels")}>
            레벨 선택
          </button>
          <button className="secondary" onClick={() => setView("editor")}>
            레벨 에디터
          </button>
          {gameState && (
            <button onClick={() => startGame(gameState.level)}>재도전</button>
          )}
          <button onClick={() => setSettingsOpen(true)}>설정</button>
        </div>
      </div>

      {view === "levels" && (
        <div className="card">
          <h2>레벨 선택</h2>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            {levels.map((level) => (
              <div key={level.id} className="card">
                <h3>{level.name}</h3>
                <p>Moves {level.movesLimit}</p>
                <ul>
                  {level.objectives.map((objective, index) => (
                    <li key={`${level.id}-obj-${index}`}>{createLevelSummary(objective)}</li>
                  ))}
                </ul>
                <button onClick={() => startGame(level)}>플레이</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === "game" && gameState && (
        <div className="card">
          <div className="hud">
            <div className="hud-item">Moves: {gameState.movesLeft}</div>
            <div className="hud-item">Score: {gameState.score}</div>
            <div className="hud-item">Cascades: {gameState.cascades}</div>
          </div>
          <div className={`objective-list ${highlightObjectives ? "highlight" : ""}`}>
            {objectives.map((objective, index) => {
              const completed = getObjectivesMet([objective], gameState);
              return (
                <div key={`obj-${index}`} className={`objective ${completed ? "highlight" : ""}`}>
                  {createLevelSummary(objective)}
                </div>
              );
            })}
          </div>
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${gameState.level.board.cols}, minmax(32px, 40px))`
            }}
          >
            {gameState.board.map((rowTiles, rowIndex) =>
              rowTiles.map((tile, colIndex) => {
                const cell = cellKey(rowIndex, colIndex);
                const overlay = gameState.overlayBlocks[cell];
                const isSelected = gameState.selectedCell === cell;
                return (
                  <div
                    key={tile.id}
                    role="button"
                    className={`tile ${tile.special ?? ""} ${tile.special ? "special" : ""} ${
                      isSelected ? "selected" : ""
                    }`}
                    style={{ background: tileColors[tile.color] }}
                    onClick={() => handleSwap(rowIndex, colIndex)}
                  >
                    {tile.color}
                    {overlay && <span className={`overlay-block ${overlay}`}>{overlay}</span>}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {view === "editor" && (
        <div className="card">
          <h2>레벨 에디터</h2>
          <div className="editor-controls">
            <label>
              레벨 선택
              <select
                value={editorLevel.id}
                onChange={(event) => {
                  const selected = levels.find((level) => level.id === event.target.value);
                  if (selected) setEditorLevel(selected);
                }}
              >
                {levels.map((level) => (
                  <option key={level.id} value={level.id}>
                    {level.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="nav-buttons">
              <button
                className="secondary"
                onClick={() =>
                  setEditorLevel({ ...editorLevel, id: `level-${Date.now()}`, name: `${editorLevel.name} Copy` })
                }
              >
                복제
              </button>
              <button
                className="secondary"
                onClick={() => {
                  if (levels.length <= 1) return;
                  const next = levels.filter((level) => level.id !== editorLevel.id);
                  setLevels(next);
                  saveLevels(next);
                  setEditorLevel(next[0]);
                }}
              >
                삭제
              </button>
            </div>
            <label>
              이름
              <input
                value={editorLevel.name}
                onChange={(event) => setEditorLevel({ ...editorLevel, name: event.target.value })}
              />
            </label>
            <label>
              Rows
              <input
                type="number"
                value={editorLevel.board.rows}
                onChange={(event) =>
                  setEditorLevel({
                    ...editorLevel,
                    board: { ...editorLevel.board, rows: Number(event.target.value) }
                  })
                }
              />
            </label>
            <label>
              Cols
              <input
                type="number"
                value={editorLevel.board.cols}
                onChange={(event) =>
                  setEditorLevel({
                    ...editorLevel,
                    board: { ...editorLevel.board, cols: Number(event.target.value) }
                  })
                }
              />
            </label>
            <label>
              Tile Types (comma)
              <input
                value={editorLevel.board.tileTypes.join(",")}
                onChange={(event) =>
                  setEditorLevel({
                    ...editorLevel,
                    board: {
                      ...editorLevel.board,
                      tileTypes: event.target.value
                        .split(",")
                        .map((value) => value.trim().toUpperCase())
                        .filter(Boolean) as TileColor[]
                    }
                  })
                }
              />
            </label>
            <label>
              Moves Limit
              <input
                type="number"
                value={editorLevel.movesLimit}
                onChange={(event) =>
                  setEditorLevel({ ...editorLevel, movesLimit: Number(event.target.value) })
                }
              />
            </label>
            <label>
              Par Moves
              <input
                type="number"
                value={editorLevel.parMoves}
                onChange={(event) =>
                  setEditorLevel({ ...editorLevel, parMoves: Number(event.target.value) })
                }
              />
            </label>
            <div>
              <strong>Objectives</strong>
              {editorLevel.objectives.map((objective, index) => (
                <div key={`obj-edit-${index}`} className="objective">
                  <select
                    value={objective.type}
                    onChange={(event) =>
                      updateEditorObjective(index, { type: event.target.value as Objective["type"] })
                    }
                  >
                    <option value="score">Score</option>
                    <option value="collect">Collect</option>
                    <option value="clear">Clear</option>
                  </select>
                  {objective.type === "score" && (
                    <input
                      type="number"
                      value={objective.target.score}
                      onChange={(event) =>
                        updateEditorObjective(index, {
                          target: { score: Number(event.target.value) }
                        } as Objective)
                      }
                    />
                  )}
                  {objective.type === "collect" && (
                    <>
                      <select
                        value={objective.target.color}
                        onChange={(event) =>
                          updateEditorObjective(index, {
                            target: { ...objective.target, color: event.target.value as TileColor }
                          } as Objective)
                        }
                      >
                        {editorLevel.board.tileTypes.map((color) => (
                          <option key={color} value={color}>
                            {color}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={objective.target.count}
                        onChange={(event) =>
                          updateEditorObjective(index, {
                            target: { ...objective.target, count: Number(event.target.value) }
                          } as Objective)
                        }
                      />
                    </>
                  )}
                  {objective.type === "clear" && (
                    <>
                      <select
                        value={objective.target.blockType}
                        onChange={(event) =>
                          updateEditorObjective(index, {
                            target: {
                              ...objective.target,
                              blockType: event.target.value as "ice" | "jelly"
                            }
                          } as Objective)
                        }
                      >
                        <option value="ice">ice</option>
                        <option value="jelly">jelly</option>
                      </select>
                      <input
                        type="number"
                        value={objective.target.count}
                        onChange={(event) =>
                          updateEditorObjective(index, {
                            target: { ...objective.target, count: Number(event.target.value) }
                          } as Objective)
                        }
                      />
                    </>
                  )}
                </div>
              ))}
              <button
                onClick={() =>
                  setEditorLevel({
                    ...editorLevel,
                    objectives: [...editorLevel.objectives, { type: "score", target: { score: 1200 } }]
                  })
                }
              >
                목표 추가
              </button>
            </div>
            <div>
              <strong>튜토리얼</strong>
              <label>
                <input
                  type="checkbox"
                  checked={editorLevel.tutorial?.enabled ?? false}
                  onChange={(event) =>
                    setEditorLevel({
                      ...editorLevel,
                      tutorial: {
                        enabled: event.target.checked,
                        steps: editorLevel.tutorial?.steps ?? []
                      }
                    })
                  }
                />
                활성화
              </label>
              {editorLevel.tutorial?.steps.map((step, index) => (
                <div key={`step-${index}`} className="objective">
                  <select
                    value={step.type}
                    onChange={(event) => {
                      const steps = [...(editorLevel.tutorial?.steps ?? [])];
                      if (event.target.value === "text") {
                        steps[index] = { type: "text", message: "" };
                      } else {
                        steps[index] = { type: "swapHint", cell: "4,4", direction: "right" };
                      }
                      setEditorLevel({
                        ...editorLevel,
                        tutorial: { enabled: true, steps }
                      });
                    }}
                  >
                    <option value="text">Text</option>
                    <option value="swapHint">Swap Hint</option>
                  </select>
                  {step.type === "text" ? (
                    <input
                      value={step.message}
                      onChange={(event) => {
                        const steps = [...(editorLevel.tutorial?.steps ?? [])];
                        steps[index] = { ...step, message: event.target.value };
                        setEditorLevel({
                          ...editorLevel,
                          tutorial: { enabled: true, steps }
                        });
                      }}
                    />
                  ) : (
                    <>
                      <input
                        value={step.cell}
                        onChange={(event) => {
                          const steps = [...(editorLevel.tutorial?.steps ?? [])];
                          steps[index] = { ...step, cell: event.target.value };
                          setEditorLevel({
                            ...editorLevel,
                            tutorial: { enabled: true, steps }
                          });
                        }}
                      />
                      <select
                        value={step.direction}
                        onChange={(event) => {
                          const steps = [...(editorLevel.tutorial?.steps ?? [])];
                          steps[index] = {
                            ...step,
                            direction: event.target.value as "up" | "down" | "left" | "right"
                          };
                          setEditorLevel({
                            ...editorLevel,
                            tutorial: { enabled: true, steps }
                          });
                        }}
                      >
                        <option value="up">up</option>
                        <option value="down">down</option>
                        <option value="left">left</option>
                        <option value="right">right</option>
                      </select>
                    </>
                  )}
                </div>
              ))}
              <button
                onClick={() =>
                  setEditorLevel({
                    ...editorLevel,
                    tutorial: {
                      enabled: true,
                      steps: [
                        ...(editorLevel.tutorial?.steps ?? []),
                        { type: "text", message: "튜토리얼 메시지" }
                      ]
                    }
                  })
                }
              >
                튜토리얼 스텝 추가
              </button>
            </div>
          </div>

          <div className="editor-grid">
            <div className="hud">
              <div className="hud-item">
                블록 타입:
                <select
                  value={blockMode}
                  onChange={(event) => setBlockMode(event.target.value as "ice" | "jelly")}
                >
                  <option value="ice">ice</option>
                  <option value="jelly">jelly</option>
                </select>
              </div>
            </div>
            <div
              className="grid"
              style={{ gridTemplateColumns: `repeat(${editorLevel.board.cols}, 32px)` }}
            >
              {Array.from({ length: editorLevel.board.rows }, (_, rowIndex) =>
                Array.from({ length: editorLevel.board.cols }, (_, colIndex) => {
                  const cell = cellKey(rowIndex, colIndex);
                  const overlay = createOverlayBlocks(editorLevel.specialBlocks)[cell];
                  return (
                    <div
                      key={`editor-${cell}`}
                      className="tile"
                      style={{ background: "#2c3365" }}
                      onClick={() => toggleBlockCell(cell)}
                    >
                      {overlay ? overlay.charAt(0).toUpperCase() : ""}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="editor-controls">
            <div>
              <strong>JSON Import/Export</strong>
              <textarea value={editorJson} onChange={(event) => setEditorJson(event.target.value)} />
              <div className="nav-buttons">
                <button onClick={() => setEditorJson(JSON.stringify(editorLevel, null, 2))}>
                  Export JSON
                </button>
                <button onClick={handleEditorImport}>Import JSON</button>
              </div>
            </div>
            <div className="nav-buttons">
              <button onClick={handleEditorSave}>저장</button>
              <button
                onClick={() => setEditorLevel(createBlankLevel())}
                className="secondary"
              >
                새 레벨
              </button>
              <button onClick={() => startGame(editorLevel)}>Test Play</button>
            </div>
          </div>
        </div>
      )}

      {gameState && gameState.status !== "playing" && (
        <div className="modal">
          <div className="modal-content">
            <h2>{gameState.status === "won" ? "레벨 클리어!" : "실패"}</h2>
            <p>최종 점수: {gameState.score}</p>
            <div className="nav-buttons">
              <button onClick={() => startGame(gameState.level)}>다시 도전</button>
              <button
                className="secondary"
                onClick={() => {
                  setGameState(null);
                  setView("levels");
                }}
              >
                레벨 선택
              </button>
            </div>
          </div>
        </div>
      )}

      {settingsOpen && (
        <div className="modal">
          <div className="modal-content">
            <h2>설정</h2>
            <label>
              <input
                type="checkbox"
                checked={settings.soundOn}
                onChange={(event) => setSettings({ ...settings, soundOn: event.target.checked })}
              />
              Sound
            </label>
            <label>
              <input
                type="checkbox"
                checked={settings.vibrationOn}
                onChange={(event) =>
                  setSettings({ ...settings, vibrationOn: event.target.checked })
                }
              />
              Vibration
            </label>
            <div className="nav-buttons">
              <button onClick={handleSettingsSave}>저장</button>
              <button className="secondary" onClick={() => setSettingsOpen(false)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {tutorialStep && gameState?.tutorialActive && (
        <div className="tutorial-overlay">
          <div className="tutorial-card">
            <h3>튜토리얼</h3>
            {tutorialStep.type === "text" && <p>{tutorialStep.message}</p>}
            {tutorialStep.type === "swapHint" && (
              <>
                <p>이렇게 스왑하세요</p>
                <div className="swap-hint">
                  <span>{tutorialStep.cell}</span>
                  <span>→ {tutorialStep.direction}</span>
                </div>
              </>
            )}
            <button onClick={handleTutorialClose}>다음</button>
          </div>
        </div>
      )}
    </>
  );
}
