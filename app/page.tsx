import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <div className="container">
        <div className="card" style={{ textAlign: "center" }}>
          <h1>3-Match Quest</h1>
          <p>특수 타일, 튜토리얼, 레벨 에디터가 포함된 3-Match 퍼즐 게임입니다.</p>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            <Link className="button" href="/levels">
              Level Select
            </Link>
            <Link className="button secondary" href="/editor">
              Level Editor
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
