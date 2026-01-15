import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Codex Match",
  description: "3-Match puzzle game MVP",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">{children}</div>
      </body>
    </html>
  );
}
