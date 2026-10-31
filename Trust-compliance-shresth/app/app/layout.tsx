import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SignalGate — Shark Tank Diligence Desk",
  description: "Agents that investigate deal and vendor requests through CrustData and finish the job.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
