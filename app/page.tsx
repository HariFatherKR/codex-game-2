'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { LevelDefinition } from '../lib/game/types';
import { loadLevels } from '../lib/storage';

export default function HomePage() {
  const [levels, setLevels] = useState<LevelDefinition[]>([]);

  useEffect(() => {
    setLevels(loadLevels());
  }, []);

  return (
    <main>
      <section className="panel" style={{ marginBottom: 24 }}>
        <span className="badge">3-Match 퍼즐</span>
        <h1 style={{ margin: '12px 0 6px' }}>Codex Match Quest</h1>
        <p style={{ color: 'var(--muted)' }}>
          특수 타일, 튜토리얼, 레벨 에디터까지 포함된 3-Match 퍼즐 게임.
        </p>
        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <Link className="button-primary" href="/editor">
            레벨 에디터
          </Link>
          <a className="button-secondary" href="#levels">
            레벨 선택
          </a>
        </div>
      </section>

      <section id="levels">
        <h2>레벨 선택</h2>
        <div className="card-list" style={{ marginTop: 16 }}>
          {levels.map((level) => (
            <Link key={level.id} href={`/game/${level.id}`} className="panel">
              <h3>{level.name}</h3>
              <p style={{ color: 'var(--muted)' }}>Moves: {level.movesLimit}</p>
              <p style={{ color: 'var(--muted)' }}>목표 {level.objectives.length}개</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
