"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LevelDefinition } from "../../lib/game/types";
import { defaultLevels } from "../../lib/game/levels";
import { loadLevels, saveLevels } from "../../lib/storage/levels";

const emptyLevel = (): LevelDefinition => ({
  id: `level-${Date.now()}`,
  name: "New Level",
  board: {
    rows: 8,
    cols: 8,
    tileTypes: ["R", "G", "B", "Y", "P"],
    blockedCells: []
  },
  movesLimit: 18,
  parMoves: 12,
  objectives: [{ type: "score", target: { score: 1000 } }]
});

export default function EditorPage() {
  const [levels, setLevels] = useState<LevelDefinition[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [rawJson, setRawJson] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    const stored = loadLevels();
    setLevels(stored);
    setActiveId(stored[0]?.id ?? "");
  }, []);

  const activeLevel = useMemo(
    () => levels.find((level) => level.id === activeId) ?? levels[0],
    [levels, activeId]
  );

  useEffect(() => {
    if (activeLevel) {
      setRawJson(JSON.stringify(activeLevel, null, 2));
      setJsonError(null);
    }
  }, [activeLevel]);

  const updateLevels = (nextLevels: LevelDefinition[]) => {
    setLevels(nextLevels);
    saveLevels(nextLevels);
  };

  const handleCreate = () => {
    const next = [...levels, emptyLevel()];
    updateLevels(next);
    setActiveId(next[next.length - 1].id);
  };

  const handleDuplicate = () => {
    if (!activeLevel) return;
    const copy = { ...activeLevel, id: `${activeLevel.id}-copy`, name: `${activeLevel.name} Copy` };
    const next = [...levels, copy];
    updateLevels(next);
    setActiveId(copy.id);
  };

  const handleDelete = () => {
    if (!activeLevel) return;
    const next = levels.filter((level) => level.id !== activeLevel.id);
    updateLevels(next.length ? next : defaultLevels);
    setActiveId(next[0]?.id ?? defaultLevels[0].id);
  };

  const handleSaveJson = () => {
    try {
      const parsed = JSON.parse(rawJson) as LevelDefinition;
      if (!parsed.id) {
        throw new Error("Level id is required");
      }
      const next = levels.map((level) => (level.id === activeLevel?.id ? parsed : level));
      updateLevels(next);
      setActiveId(parsed.id);
      setJsonError(null);
    } catch (error) {
      setJsonError((error as Error).message);
    }
  };

  const toggleCell = (type: "blocked" | "ice" | "jelly", coord: string) => {
    if (!activeLevel) return;
    const nextLevel = { ...activeLevel };
    if (type === "blocked") {
      const blocked = new Set(nextLevel.board.blockedCells ?? []);
      if (blocked.has(coord)) {
        blocked.delete(coord);
      } else {
        blocked.add(coord);
      }
      nextLevel.board = { ...nextLevel.board, blockedCells: Array.from(blocked) };
    } else {
      const specialBlocks = nextLevel.specialBlocks ? [...nextLevel.specialBlocks] : [];
      const existing = specialBlocks.find((block) => block.type === type);
      if (existing) {
        const cells = new Set(existing.cells);
        if (cells.has(coord)) {
          cells.delete(coord);
        } else {
          cells.add(coord);
        }
        existing.cells = Array.from(cells);
      } else {
        specialBlocks.push({ type, cells: [coord] });
      }
      nextLevel.specialBlocks = specialBlocks;
    }
    const nextLevels = levels.map((level) => (level.id === activeLevel.id ? nextLevel : level));
    updateLevels(nextLevels);
  };

  const cellState = (coord: string) => {
    const blocked = activeLevel?.board.blockedCells?.includes(coord);
    const ice = activeLevel?.specialBlocks?.find((block) => block.type === "ice")?.cells.includes(coord);
    const jelly = activeLevel?.specialBlocks?.find((block) => block.type === "jelly")?.cells.includes(coord);
    return { blocked, ice, jelly };
  };

  if (!activeLevel) {
    return null;
  }

  return (
    <main>
      <div className="container">
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1>Level Editor</h1>
          <Link className="button secondary" href="/">
            Home
          </Link>
        </header>

        <div className="grid" style={{ gridTemplateColumns: "260px 1fr" }}>
          <div className="card">
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <button className="button" onClick={handleCreate}>
                New
              </button>
              <button className="button secondary" onClick={handleDuplicate}>
                Duplicate
              </button>
            </div>
            <div className="grid" style={{ maxHeight: 420, overflow: "auto" }}>
              {levels.map((level) => (
                <button
                  key={level.id}
                  className={`button ${level.id === activeId ? "" : "secondary"}`}
                  onClick={() => setActiveId(level.id)}
                >
                  {level.name}
                </button>
              ))}
            </div>
            <button
              className="button secondary"
              onClick={handleDelete}
              style={{ marginTop: 12, background: "rgba(239, 68, 68, 0.2)", color: "#fecaca" }}
            >
              Delete
            </button>
          </div>

          <div className="card">
            <h2 style={{ marginTop: 0 }}>{activeLevel.name}</h2>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <Link className="button" href={`/game/${activeLevel.id}`}>
                Test Play
              </Link>
              <button className="button secondary" onClick={handleSaveJson}>
                Save JSON
              </button>
            </div>

            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))" }}>
              {Array.from({ length: activeLevel.board.rows }).map((_, row) => (
                <div key={`row-${row}`} style={{ display: "flex", gap: 4 }}>
                  {Array.from({ length: activeLevel.board.cols }).map((__, col) => {
                    const coord = `${row},${col}`;
                    const state = cellState(coord);
                    return (
                      <button
                        key={coord}
                        className="button secondary"
                        style={{
                          width: 28,
                          height: 28,
                          padding: 0,
                          background: state.blocked
                            ? "#334155"
                            : state.ice
                              ? "#38bdf8"
                              : state.jelly
                                ? "#f472b6"
                                : "rgba(148, 163, 184, 0.2)"
                        }}
                        onClick={() => toggleCell("blocked", coord)}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          toggleCell("ice", coord);
                        }}
                        onDoubleClick={() => toggleCell("jelly", coord)}
                        title="Click: blocked, Right click: ice, Double click: jelly"
                      />
                    );
                  })}
                </div>
              ))}
            </div>

            <p style={{ marginTop: 12, fontSize: 12, color: "#94a3b8" }}>
              Click: blocked cell / Right click: ice / Double click: jelly
            </p>

            <textarea
              className="input"
              value={rawJson}
              onChange={(event) => setRawJson(event.target.value)}
            />
            {jsonError && <p style={{ color: "#f87171" }}>{jsonError}</p>}
          </div>
        </div>
      </div>
    </main>
  );
}
