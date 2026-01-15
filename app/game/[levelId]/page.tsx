import { notFound } from "next/navigation";
import { levels } from "@/data/levels";
import GameClient from "@/components/GameClient";

export default function GamePage({ params }: { params: { levelId: string } }) {
  const level = levels.find((entry) => entry.id === params.levelId);
  if (!level) {
    notFound();
  }

  return <GameClient level={level} levels={levels} />;
}
