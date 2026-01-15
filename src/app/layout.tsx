import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Match-3 MVP",
  description: "3-Match puzzle game MVP"
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
