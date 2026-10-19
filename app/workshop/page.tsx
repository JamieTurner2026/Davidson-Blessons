import type { Metadata } from "next";
import type { ReactNode } from "react";

import { WorkshopClient } from "@/components/WorkshopClient";

export const metadata: Metadata = { title: "Workshop" };

export default function WorkshopPage(): ReactNode {
  return (
    <div className="ws-stack">
      <h1 className="ws-display">Workshop</h1>
      <WorkshopClient />
    </div>
  );
}
