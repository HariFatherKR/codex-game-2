import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '3-Match Puzzle - Codex',
  description: 'Special tiles, tutorial, and level editor demo.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
