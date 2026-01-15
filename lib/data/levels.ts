import { LevelData } from '../game/types';

export const defaultLevels: LevelData[] = [
  {
    id: 'level-1',
    name: 'First Swap',
    board: { rows: 8, cols: 8, tileTypes: ['R', 'G', 'B', 'Y', 'P'] },
    movesLimit: 18,
    parMoves: 14,
    objectives: [{ type: 'score', target: { score: 1200 } }],
    tutorial: {
      enabled: true,
      steps: [
        { type: 'swapHint', cell: '4,4', direction: 'right', message: '이렇게 스왑하세요!' },
        { type: 'highlightObjective', message: '목표를 확인하세요.' }
      ]
    },
    notes: '튜토리얼 스왑 소개'
  },
  {
    id: 'level-2',
    name: 'Special Start',
    board: { rows: 8, cols: 8, tileTypes: ['R', 'G', 'B', 'Y', 'P'] },
    movesLimit: 16,
    parMoves: 12,
    objectives: [{ type: 'collect', target: { color: 'R', count: 10 } }],
    tutorial: {
      enabled: true,
      steps: [
        { type: 'text', message: '4개 이상 매치하면 특수 타일이 생성됩니다!' }
      ]
    },
    notes: '특수 타일 첫 등장'
  },
  {
    id: 'level-3',
    name: 'Ice Break',
    board: { rows: 8, cols: 8, tileTypes: ['R', 'G', 'B', 'Y', 'P'] },
    movesLimit: 18,
    parMoves: 14,
    objectives: [{ type: 'clear', target: { block: 'ice', count: 6 } }],
    specialBlocks: [{ type: 'ice', cells: ['2,2', '2,3', '3,2', '3,3', '4,2', '4,3'] }],
    notes: '얼음 블록 제거'
  },
  {
    id: 'level-4',
    name: 'Jelly Party',
    board: { rows: 8, cols: 8, tileTypes: ['R', 'G', 'B', 'Y', 'P'] },
    movesLimit: 20,
    parMoves: 15,
    objectives: [{ type: 'clear', target: { block: 'jelly', count: 8 } }],
    specialBlocks: [{ type: 'jelly', cells: ['5,1', '5,2', '5,3', '6,1', '6,2', '6,3', '4,2', '4,3'] }],
    notes: '젤리 제거'
  },
  {
    id: 'level-5',
    name: 'Combo Focus',
    board: { rows: 8, cols: 8, tileTypes: ['R', 'G', 'B', 'Y', 'P'] },
    movesLimit: 16,
    parMoves: 12,
    objectives: [
      { type: 'collect', target: { color: 'B', count: 12 } },
      { type: 'score', target: { score: 1500 } }
    ],
    notes: '콤보를 활용하세요'
  },
  {
    id: 'level-6',
    name: 'Color Burst',
    board: { rows: 8, cols: 8, tileTypes: ['R', 'G', 'B', 'Y', 'P'] },
    movesLimit: 18,
    parMoves: 14,
    objectives: [{ type: 'collect', target: { color: 'P', count: 14 } }],
    notes: '컬러 폭탄 연습'
  },
  {
    id: 'level-7',
    name: 'Dual Goals',
    board: { rows: 8, cols: 8, tileTypes: ['R', 'G', 'B', 'Y', 'P'] },
    movesLimit: 20,
    parMoves: 15,
    objectives: [
      { type: 'collect', target: { color: 'Y', count: 14 } },
      { type: 'clear', target: { block: 'ice', count: 6 } }
    ],
    specialBlocks: [{ type: 'ice', cells: ['1,1', '1,2', '1,3', '2,1', '2,2', '2,3'] }]
  },
  {
    id: 'level-8',
    name: 'Edge Pressure',
    board: { rows: 8, cols: 8, tileTypes: ['R', 'G', 'B', 'Y', 'P'] },
    movesLimit: 18,
    parMoves: 13,
    objectives: [{ type: 'score', target: { score: 1800 } }],
    specialBlocks: [{ type: 'jelly', cells: ['0,0', '0,7', '7,0', '7,7'] }]
  },
  {
    id: 'level-9',
    name: 'Tight Moves',
    board: { rows: 8, cols: 8, tileTypes: ['R', 'G', 'B', 'Y', 'P'] },
    movesLimit: 14,
    parMoves: 11,
    objectives: [{ type: 'score', target: { score: 1600 } }]
  },
  {
    id: 'level-10',
    name: 'Final Spark',
    board: { rows: 8, cols: 8, tileTypes: ['R', 'G', 'B', 'Y', 'P'] },
    movesLimit: 20,
    parMoves: 16,
    objectives: [
      { type: 'collect', target: { color: 'G', count: 16 } },
      { type: 'clear', target: { block: 'jelly', count: 8 } }
    ],
    specialBlocks: [{ type: 'jelly', cells: ['3,3', '3,4', '4,3', '4,4', '2,4', '4,2', '5,3', '5,4'] }],
    notes: '마지막 챌린지'
  }
];
