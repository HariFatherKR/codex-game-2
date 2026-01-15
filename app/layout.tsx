import "../styles/globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "3-Match Quest",
  description: "Special tiles, tutorials, and level editor ready for Vercel."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        {children}
      </body>
    </html>
  );
}
