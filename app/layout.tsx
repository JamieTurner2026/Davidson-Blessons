import type { Metadata } from "next";
import { Inter_Tight } from "next/font/google";
import type { ReactNode } from "react";

import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import "./globals.css";

// Woset: Inter Tight stands in for Macan. Never load weights above 500.
const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: { default: "Selah — Bible study", template: "%s · Selah" },
  description: "Read, search, highlight and take notes on Scripture. A quiet place to study.",
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
      </body>
    </html>
  );
}
