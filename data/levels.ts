import { LevelDefinition } from "@/lib/game/types";

export const defaultLevels: LevelDefinition[] = [
  {
    id: "level-1",
    name: "First Swipe",
    board: { rows: 8, cols: 8, tileTypes: ["R", "G", "B", "Y", "P"] },
    movesLimit: 12,
    parMoves: 10,
    objectives: [{ type: "score", target: { score: 800 } }],
    specialBlocks: [],
    tutorial: {
      enabled: true,
      steps: [
        { type: "swapHint", cell: "4,4", direction: "right" },
        { type: "text", message: "이렇게 스왑하세요! 3개를 맞추면 점수가 올라갑니다." }
      ]
    },
    notes: "기본 스왑 튜토리얼"
  },
  {
    id: "level-2",
    name: "Special Intro",
    board: { rows: 8, cols: 8, tileTypes: ["R", "G", "B", "Y", "P"] },
    movesLimit: 14,
    parMoves: 12,
    objectives: [{ type: "collect", target: { color: "R", count: 12 } }],
    specialBlocks: [],
    tutorial: {
      enabled: true,
      steps: [
        { type: "text", message: "4개 이상 매치하면 특수 타일이 생성됩니다!" }
      ]
    },
    notes: "특수 타일 첫 등장"
  },
  {
    id: "level-3",
    name: "Ice Breaker",
    board: { rows: 8, cols: 8, tileTypes: ["R", "G", "B", "Y", "P"] },
    movesLimit: 16,
    parMoves: 13,
    objectives: [{ type: "clear", target: { blockType: "ice", count: 6 } }],
    specialBlocks: [{ type: "ice", cells: ["2,2", "2,3", "2,4", "5,3", "5,4", "5,5"] }]
  },
  {
    id: "level-4",
    name: "Jelly Pop",
    board: { rows: 8, cols: 8, tileTypes: ["R", "G", "B", "Y", "P", "O"] },
    movesLimit: 18,
    parMoves: 14,
    objectives: [{ type: "clear", target: { blockType: "jelly", count: 8 } }],
    specialBlocks: [{ type: "jelly", cells: ["1,1", "1,2", "1,3", "6,4", "6,5", "6,6", "2,6", "3,6"] }]
  },
  {
    id: "level-5",
    name: "Red Rush",
    board: { rows: 8, cols: 8, tileTypes: ["R", "G", "B", "Y", "P", "O"] },
    movesLimit: 15,
    parMoves: 12,
    objectives: [
      { type: "collect", target: { color: "R", count: 18 } },
      { type: "score", target: { score: 1200 } }
    ],
    specialBlocks: []
  },
  {
    id: "level-6",
    name: "Double Clear",
    board: { rows: 9, cols: 9, tileTypes: ["R", "G", "B", "Y", "P"] },
    movesLimit: 20,
    parMoves: 16,
    objectives: [
      { type: "clear", target: { blockType: "ice", count: 6 } },
      { type: "collect", target: { color: "B", count: 14 } }
    ],
    specialBlocks: [{ type: "ice", cells: ["3,3", "3,4", "3,5", "4,3", "4,4", "4,5"] }]
  },
  {
    id: "level-7",
    name: "Combo Lane",
    board: { rows: 8, cols: 8, tileTypes: ["R", "G", "B", "Y", "P", "O"] },
    movesLimit: 17,
    parMoves: 13,
    objectives: [{ type: "score", target: { score: 1600 } }],
    specialBlocks: []
  },
  {
    id: "level-8",
    name: "Frozen Corners",
    board: { rows: 8, cols: 8, tileTypes: ["R", "G", "B", "Y", "P", "O"] },
    movesLimit: 18,
    parMoves: 14,
    objectives: [
      { type: "clear", target: { blockType: "ice", count: 8 } },
      { type: "score", target: { score: 1400 } }
    ],
    specialBlocks: [{ type: "ice", cells: ["0,0", "0,7", "7,0", "7,7", "0,1", "1,0", "7,6", "6,7"] }]
  },
  {
    id: "level-9",
    name: "Jelly Chain",
    board: { rows: 8, cols: 8, tileTypes: ["R", "G", "B", "Y", "P", "O"] },
    movesLimit: 19,
    parMoves: 15,
    objectives: [
      { type: "clear", target: { blockType: "jelly", count: 10 } },
      { type: "collect", target: { color: "G", count: 10 } }
    ],
    specialBlocks: [{ type: "jelly", cells: ["3,1", "3,2", "3,3", "4,4", "4,5", "4,6", "2,5", "5,2", "2,2", "5,5"] }]
  },
  {
    id: "level-10",
    name: "Final Mix",
    board: { rows: 9, cols: 9, tileTypes: ["R", "G", "B", "Y", "P", "O"] },
    movesLimit: 22,
    parMoves: 18,
    objectives: [
      { type: "score", target: { score: 2200 } },
      { type: "clear", target: { blockType: "ice", count: 10 } }
    ],
    specialBlocks: [{ type: "ice", cells: ["2,2", "2,3", "2,4", "3,2", "4,2", "6,6", "6,7", "7,6", "7,7", "5,6"] }]
  }
];
