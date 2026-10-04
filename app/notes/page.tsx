import type { Metadata } from "next";
import type { ReactNode } from "react";

import { NotesClient } from "@/components/NotesClient";

export const metadata: Metadata = { title: "Notes" };

export default function NotesPage(): ReactNode {
  return (
    <div className="ws-stack">
      <h1 className="ws-display">Notes</h1>
      <NotesClient />
    </div>
  );
}
