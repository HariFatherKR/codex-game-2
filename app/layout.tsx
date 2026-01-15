import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Codex Match",
  description: "3-Match 퍼즐 게임"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <div className="app-shell">{children}</div>
      </body>
    </html>
  );
}
