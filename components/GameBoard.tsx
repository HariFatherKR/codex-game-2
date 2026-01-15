'use client';

import type { Cell } from '../lib/game/types';

interface GameBoardProps {
  board: Cell[][];
  selected: [number, number] | null;
  onSelect: (pos: [number, number]) => void;
  disabled?: boolean;
}

const specialIcon = (special?: string) => {
  switch (special) {
    case 'line-h':
      return '—';
    case 'line-v':
      return '|';
    case 'bomb':
      return '✹';
    case 'color':
      return '◎';
    default:
      return '';
  }
};

export const GameBoard = ({ board, selected, onSelect, disabled }: GameBoardProps) => {
  return (
    <div
      className="grid"
      style={{ gridTemplateColumns: `repeat(${board[0].length}, var(--tile-size))` }}
    >
      {board.map((row, r) =>
        row.map((cell, c) => {
          const tile = cell.tile;
          const isSelected = selected?.[0] === r && selected?.[1] === c;
          return (
            <button
              key={`${r}-${c}-${tile?.id ?? 'empty'}`}
              className={`tile ${tile?.color ?? ''} ${tile?.special ? 'special' : ''} ${isSelected ? 'selected' : ''}`}
              style={{ opacity: tile ? 1 : 0.3 }}
              onClick={() => onSelect([r, c])}
              disabled={disabled}
            >
              <span>{specialIcon(tile?.special)}</span>
              {cell.ice && <span style={{ position: 'absolute', fontSize: 12 }}>❄</span>}
              {cell.jelly && <span style={{ position: 'absolute', fontSize: 12 }}>✧</span>}
            </button>
          );
        })
      )}
    </div>
  );
};
