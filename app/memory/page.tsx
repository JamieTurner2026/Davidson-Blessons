import type { Metadata } from "next";
import type { ReactNode } from "react";

import { MemoryClient } from "@/components/MemoryClient";

export const metadata: Metadata = { title: "Memory" };

export default function MemoryPage(): ReactNode {
  return (
    <div className="ws-stack">
      <h1 className="ws-display">Memory</h1>
      <MemoryClient />
    </div>
  );
}
