import { LevelDefinition } from './types';

export const defaultLevels: LevelDefinition[] = [
  {
    id: 'level-1',
    name: '튜토리얼: 첫 스왑',
    board: { rows: 8, cols: 8, tileTypes: ['R', 'G', 'B', 'Y', 'P'] },
    movesLimit: 18,
    parMoves: 14,
    objectives: [{ type: 'score', target: { score: 800 } }],
    tutorial: {
      enabled: true,
      steps: [
        { type: 'text', message: '환영합니다! 인접한 타일을 스왑해 매치를 만드세요.' },
        { type: 'swapHint', cell: '4,3', direction: 'right' },
        { type: 'highlightObjective', message: '왼쪽 상단 목표를 확인하세요.' }
      ]
    },
    notes: '기본 스왑 소개'
  },
  {
    id: 'level-2',
    name: '튜토리얼: 특수 타일',
    board: { rows: 8, cols: 8, tileTypes: ['R', 'G', 'B', 'Y', 'P'] },
    movesLimit: 16,
    parMoves: 12,
    objectives: [{ type: 'collect', target: { color: 'R', count: 10 } }],
    tutorial: {
      enabled: true,
      steps: [
        { type: 'text', message: '4개 이상 매치하면 특수 타일이 생성됩니다!' },
        { type: 'swapHint', cell: '3,2', direction: 'down' }
      ]
    },
    notes: '특수 타일 소개'
  },
  {
    id: 'level-3',
    name: 'Special Intro',
    board: { rows: 8, cols: 8, tileTypes: ['R', 'G', 'B', 'Y', 'P'] },
    movesLimit: 16,
    parMoves: 12,
    objectives: [{ type: 'collect', target: { color: 'R', count: 12 } }],
    specialBlocks: [{ type: 'ice', cells: ['3,3', '3,4'] }],
    notes: '특수 타일 첫 등장 레벨'
  },
  {
    id: 'level-4',
    name: 'Jelly Clean',
    board: { rows: 8, cols: 8, tileTypes: ['R', 'G', 'B', 'Y', 'P'] },
    movesLimit: 18,
    parMoves: 13,
    objectives: [{ type: 'clear', target: { layer: 'jelly', count: 12 } }],
    specialBlocks: [{ type: 'jelly', cells: ['4,3', '4,4', '5,3', '5,4'] }]
  },
  {
    id: 'level-5',
    name: 'Color Bomb Goal',
    board: { rows: 8, cols: 8, tileTypes: ['R', 'G', 'B', 'Y', 'P'] },
    movesLimit: 20,
    parMoves: 15,
    objectives: [{ type: 'score', target: { score: 1200 } }]
  },
  {
    id: 'level-6',
    name: 'Ice Corridor',
    board: { rows: 8, cols: 8, tileTypes: ['R', 'G', 'B', 'Y', 'P'] },
    movesLimit: 18,
    parMoves: 14,
    objectives: [{ type: 'clear', target: { layer: 'ice', count: 14 } }],
    specialBlocks: [{ type: 'ice', cells: ['2,2', '2,3', '2,4', '2,5', '3,2', '3,5', '4,2', '4,5'] }]
  },
  {
    id: 'level-7',
    name: 'Combo Rush',
    board: { rows: 8, cols: 8, tileTypes: ['R', 'G', 'B', 'Y', 'P'] },
    movesLimit: 15,
    parMoves: 12,
    objectives: [{ type: 'score', target: { score: 1500 } }]
  },
  {
    id: 'level-8',
    name: 'Collect Blues',
    board: { rows: 8, cols: 8, tileTypes: ['R', 'G', 'B', 'Y', 'P'] },
    movesLimit: 17,
    parMoves: 13,
    objectives: [{ type: 'collect', target: { color: 'B', count: 14 } }]
  },
  {
    id: 'level-9',
    name: 'Layered Challenge',
    board: { rows: 8, cols: 8, tileTypes: ['R', 'G', 'B', 'Y', 'P'] },
    movesLimit: 18,
    parMoves: 14,
    objectives: [
      { type: 'clear', target: { layer: 'ice', count: 8 } },
      { type: 'collect', target: { color: 'G', count: 10 } }
    ],
    specialBlocks: [{ type: 'ice', cells: ['5,1', '5,2', '5,3', '6,1', '6,2', '6,3'] }]
  },
  {
    id: 'level-10',
    name: 'Final Sprint',
    board: { rows: 8, cols: 8, tileTypes: ['R', 'G', 'B', 'Y', 'P'] },
    movesLimit: 14,
    parMoves: 12,
    objectives: [{ type: 'score', target: { score: 1800 } }]
  }
];
