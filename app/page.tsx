import { levels } from "@/data/levels";
import LevelSelectClient from "@/components/LevelSelectClient";

export default function HomePage() {
  return (
    <main>
      <header className="header">
        <h1>Codex Match</h1>
        <p>Swap tiles to reach the score target before you run out of moves.</p>
      </header>
      <LevelSelectClient levels={levels} />
    </main>
  );
}
