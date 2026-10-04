import type { Metadata } from "next";
import type { ReactNode } from "react";

import { JourneyClient } from "@/components/JourneyClient";

export const metadata: Metadata = { title: "Your journey" };

export default function JourneyPage(): ReactNode {
  return (
    <div className="ws-stack">
      <JourneyClient />
    </div>
  );
}
