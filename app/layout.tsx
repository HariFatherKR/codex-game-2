import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: '3-Match Puzzle Builder',
  description: 'Match-3 puzzle game with special tiles, tutorials, and level editor.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
