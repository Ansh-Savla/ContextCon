import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { themeBootScript } from "@/lib/theme";
import "./globals.css";

const sans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "SignalGate — diligence desk for investors and lenders",
  description: "Agents that verify a company and its people through CrustData's identity graph, then complete investor diligence or lender KYB and credit work.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="font-sans" suppressHydrationWarning>
        {/* Theme boot runs before anything paints. It lives in <body>, not <head>, because browser extensions
            inject their own <script> tags into <head> and would shift React's hydration comparison. */}
        <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
      </body>
    </html>
  );
}
