export type Level = {
  id: string;
  name: string;
  targetScore: number;
  movesLimit: number;
};

export const levels: Level[] = [
  {
    id: "level-1",
    name: "Easy Start",
    targetScore: 800,
    movesLimit: 15,
  },
  {
    id: "level-2",
    name: "Getting Harder",
    targetScore: 1200,
    movesLimit: 14,
  },
  {
    id: "level-3",
    name: "Tricky Rush",
    targetScore: 1600,
    movesLimit: 13,
  },
];
