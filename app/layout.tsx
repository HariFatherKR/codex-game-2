import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Codex Match-3",
  description: "A simple 3-match puzzle game"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
