import type { Metadata } from "next";
import type { ReactNode } from "react";

import { PlansClient } from "@/components/PlansClient";

export const metadata: Metadata = { title: "Reading plans" };

export default function PlansPage(): ReactNode {
  return (
    <div className="ws-stack">
      <h1 className="ws-display">Reading plans</h1>
      <PlansClient />
    </div>
  );
}
