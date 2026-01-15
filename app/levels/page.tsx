"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadLevels } from "../../lib/storage/levels";
import { LevelDefinition } from "../../lib/game/types";

export default function LevelsPage() {
  const [levels, setLevels] = useState<LevelDefinition[]>([]);

  useEffect(() => {
    setLevels(loadLevels());
  }, []);

  return (
    <main>
      <div className="container">
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1>Level Select</h1>
          <Link className="button secondary" href="/">
            Home
          </Link>
        </header>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          {levels.map((level) => (
            <div key={level.id} className="card">
              <h3 style={{ marginTop: 0 }}>{level.name}</h3>
              <p style={{ margin: "4px 0" }}>Moves: {level.movesLimit}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {level.objectives.map((objective, index) => (
                  <span key={`${level.id}-${index}`} className="badge">
                    {objective.type}
                  </span>
                ))}
              </div>
              <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                <Link className="button" href={`/game/${level.id}`}>
                  Play
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
