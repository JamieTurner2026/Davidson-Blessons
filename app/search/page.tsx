import type { Metadata } from "next";
import type { ReactNode } from "react";

import { SearchClient } from "@/components/SearchClient";

export const metadata: Metadata = { title: "Search" };

export default function SearchPage(): ReactNode {
  return (
    <div className="ws-stack">
      <h1 className="ws-display">Search</h1>
      <SearchClient />
    </div>
  );
}
