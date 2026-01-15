import { LevelDefinition } from "./types";

export const defaultLevels: LevelDefinition[] = [
  {
    id: "level-1",
    name: "Tutorial: First Swap",
    board: {
      rows: 8,
      cols: 8,
      tileTypes: ["R", "G", "B", "Y", "P"]
    },
    movesLimit: 18,
    parMoves: 12,
    objectives: [{ type: "score", target: { score: 800 } }],
    tutorial: {
      enabled: true,
      steps: [
        { type: "swapHint", cell: "4,4", direction: "right", message: "이렇게 스왑하세요!" },
        { type: "text", message: "이렇게 스왑하세요!" },
        { type: "highlightHud", message: "목표 점수를 달성하세요." }
      ]
    },
    notes: "튜토리얼 기본 스왑"
  },
  {
    id: "level-2",
    name: "Tutorial: Special Tiles",
    board: {
      rows: 8,
      cols: 8,
      tileTypes: ["R", "G", "B", "Y", "P"]
    },
    movesLimit: 16,
    parMoves: 12,
    objectives: [{ type: "collect", target: { color: "R", count: 10 } }],
    tutorial: {
      enabled: true,
      steps: [
        { type: "text", message: "4개 이상 매치하면 특수 타일이 생성됩니다!" },
        { type: "highlightBoard" }
      ]
    },
    notes: "특수 타일 소개"
  },
  {
    id: "level-3",
    name: "Special Intro",
    board: {
      rows: 8,
      cols: 8,
      tileTypes: ["R", "G", "B", "Y", "P"]
    },
    movesLimit: 16,
    parMoves: 12,
    objectives: [{ type: "collect", target: { color: "B", count: 12 } }],
    specialBlocks: [{ type: "ice", cells: ["3,3", "3,4"] }],
    notes: "특수 타일 첫 등장 레벨"
  },
  {
    id: "level-4",
    name: "Icy Steps",
    board: {
      rows: 8,
      cols: 8,
      tileTypes: ["R", "G", "B", "Y", "P"],
      blockedCells: ["0,0", "0,7", "7,0", "7,7"]
    },
    movesLimit: 18,
    parMoves: 14,
    objectives: [{ type: "clear", target: { blockType: "ice", count: 10 } }],
    specialBlocks: [
      { type: "ice", cells: ["2,2", "2,3", "3,2", "4,4", "4,5"] }
    ],
    notes: "아이스트 깨기"
  },
  {
    id: "level-5",
    name: "Jelly Garden",
    board: {
      rows: 8,
      cols: 8,
      tileTypes: ["R", "G", "B", "Y", "P"]
    },
    movesLimit: 20,
    parMoves: 15,
    objectives: [{ type: "clear", target: { blockType: "jelly", count: 12 } }],
    specialBlocks: [
      { type: "jelly", cells: ["1,1", "1,2", "2,1", "5,5", "6,5", "6,6"] }
    ],
    notes: "젤리 제거"
  },
  {
    id: "level-6",
    name: "Combo Rush",
    board: {
      rows: 8,
      cols: 8,
      tileTypes: ["R", "G", "B", "Y", "P"]
    },
    movesLimit: 14,
    parMoves: 10,
    objectives: [{ type: "score", target: { score: 1400 } }],
    notes: "콤보 점수"
  },
  {
    id: "level-7",
    name: "Color Focus",
    board: {
      rows: 8,
      cols: 8,
      tileTypes: ["R", "G", "B", "Y", "P"]
    },
    movesLimit: 16,
    parMoves: 12,
    objectives: [{ type: "collect", target: { color: "G", count: 16 } }],
    notes: "색 수집"
  },
  {
    id: "level-8",
    name: "Frozen Corners",
    board: {
      rows: 8,
      cols: 8,
      tileTypes: ["R", "G", "B", "Y", "P"],
      blockedCells: ["0,0", "0,7", "7,0", "7,7"]
    },
    movesLimit: 18,
    parMoves: 13,
    objectives: [{ type: "clear", target: { blockType: "ice", count: 8 } }],
    specialBlocks: [
      { type: "ice", cells: ["0,1", "1,0", "0,6", "1,7", "6,0", "7,1", "6,7", "7,6"] }
    ]
  },
  {
    id: "level-9",
    name: "Mixed Goals",
    board: {
      rows: 8,
      cols: 8,
      tileTypes: ["R", "G", "B", "Y", "P"]
    },
    movesLimit: 18,
    parMoves: 14,
    objectives: [
      { type: "collect", target: { color: "Y", count: 10 } },
      { type: "clear", target: { blockType: "jelly", count: 6 } }
    ],
    specialBlocks: [{ type: "jelly", cells: ["3,3", "3,4", "4,3", "4,4"] }]
  },
  {
    id: "level-10",
    name: "Final Sprint",
    board: {
      rows: 8,
      cols: 8,
      tileTypes: ["R", "G", "B", "Y", "P"]
    },
    movesLimit: 12,
    parMoves: 10,
    objectives: [{ type: "score", target: { score: 1800 } }],
    notes: "마지막 도전"
  }
];
