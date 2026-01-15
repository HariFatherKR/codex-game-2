import type { TileColor } from "@/lib/game/types";

const BLOCK_SPRITE = {
  image: "/blocks.png",
  tileSize: 64,
  map: {
    R: { x: 0, y: 0 },
    G: { x: 64, y: 0 },
    B: { x: 128, y: 0 },
    Y: { x: 192, y: 0 },
    P: { x: 256, y: 0 }
  }
} as const;

type TileViewProps = {
  color: TileColor;
  size: number;
  selected?: boolean;
};

export default function TileView({ color, size, selected }: TileViewProps) {
  const { x, y } = BLOCK_SPRITE.map[color];
  const scale = size / BLOCK_SPRITE.tileSize;

  return (
    <div
      className={`tile ${selected ? "selected" : ""}`}
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${BLOCK_SPRITE.image})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: `${BLOCK_SPRITE.tileSize * 5 * scale}px ${
          BLOCK_SPRITE.tileSize * scale
        }px`,
        backgroundPosition: `-${x * scale}px -${y * scale}px`
      }}
    />
  );
}
