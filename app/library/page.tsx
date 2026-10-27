import type { Metadata } from "next";
import type { ReactNode } from "react";

import { LibraryClient } from "@/components/LibraryClient";

export const metadata: Metadata = { title: "Library" };

export default function LibraryPage(): ReactNode {
  return (
    <div className="ws-stack">
      <h1 className="ws-display">Library</h1>
      <LibraryClient />
    </div>
  );
}
