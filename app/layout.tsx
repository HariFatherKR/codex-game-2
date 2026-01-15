import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Codex Match",
  description: "3-Match puzzle game MVP"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
