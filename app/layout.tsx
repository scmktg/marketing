import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Beachie Midweek Engine",
  description: "AI-powered midweek events and accommodation packages",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
