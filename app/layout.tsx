import type { Metadata } from "next";
import { Inter_Tight } from "next/font/google";
import type { ReactNode } from "react";

import { AccountSync } from "@/components/AccountSync";
import { Footer } from "@/components/Footer";
import { Celebrations } from "@/components/motion/Celebrations";
import { Nav } from "@/components/Nav";
import "./globals.css";

// Woset: Inter Tight stands in for Macan. Never load weights above 500.
const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: { default: "Davidson Blessons — Bible study", template: "%s · Davidson Blessons" },
  description: "Read Scripture, play its lessons and walk the trail, one stop at a time.",
};

export default function RootLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <html lang="en" className={interTight.variable}>
      <body>
        <div className="ws-container">
          <Nav />
        </div>
        <main className="ws-container">{children}</main>
        <div className="ws-container">
          <Footer />
        </div>
        <Celebrations />
        <AccountSync />
      </body>
    </html>
  );
}
