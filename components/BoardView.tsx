import { colorMap } from "../lib/game/engine";
import { Board, Tile } from "../lib/game/types";

interface BoardViewProps {
  board: Board;
  selected?: { row: number; col: number } | null;
  onSelect: (row: number, col: number) => void;
  highlightCell?: string;
}

const specialLabel = (tile: Tile) => {
  if (!tile.special) return null;
  if (tile.special === "line-h") return "—";
  if (tile.special === "line-v") return "|";
  if (tile.special === "bomb") return "✹";
  return "✦";
};

export default function BoardView({ board, selected, onSelect, highlightCell }: BoardViewProps) {
  return (
    <div
      className="board"
      style={{
        gridTemplateColumns: `repeat(${board.cols}, minmax(0, 1fr))`
      }}
    >
      {board.tiles.map((row, rowIndex) =>
        row.map((tile, colIndex) => {
          const isSelected = selected?.row === rowIndex && selected?.col === colIndex;
          const coord = `${rowIndex},${colIndex}`;
          const overlay = board.overlays[rowIndex][colIndex];
          return (
            <div
              key={tile.id}
              className={`tile ${tile.blocked ? "blocked" : ""} ${isSelected ? "selected" : ""} ${
                highlightCell === coord ? "highlight" : ""
              }`}
              style={{ background: tile.blocked ? undefined : colorMap[tile.color] }}
              onClick={() => !tile.blocked && onSelect(rowIndex, colIndex)}
            >
              {tile.special && <div className="special" />}
              {overlay.ice && <span className="icon">❄️</span>}
              {overlay.jelly && <span className="icon">🍮</span>}
              {tile.special && <span>{specialLabel(tile)}</span>}
            </div>
          );
        })
      )}
    </div>
  );
}
