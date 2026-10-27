import type { Metadata } from "next";
import type { ReactNode } from "react";

import { JourneyClient } from "@/components/JourneyClient";
import { getNotesIndex } from "@/lib/notes";

export const metadata: Metadata = { title: "Your journey" };

export default async function JourneyPage(): Promise<ReactNode> {
  const notesReady = await getNotesIndex();
  return (
    <div className="ws-stack">
      <JourneyClient notesReady={notesReady.length} />
    </div>
  );
}
