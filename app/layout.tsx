import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "APEX-SENTINEL — Live Intelligence",
  description: "Acoustic drone detection & counter-UAS system",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
