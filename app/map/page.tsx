import type { Metadata } from "next";
import type { ReactNode } from "react";
import { z } from "zod";

import { MapClient } from "@/components/map/MapClient";
import { getBook, parseChapterId } from "@/lib/canon";

export const metadata: Metadata = { title: "The trail" };

const paramsSchema = z.object({
  book: z.string().max(3).optional(),
  from: z.string().max(10).optional(),
});

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<ReactNode> {
  const parsed = paramsSchema.safeParse(await searchParams);
  const book = parsed.success && parsed.data.book && getBook(parsed.data.book) ? parsed.data.book : null;
  const from = parsed.success && parsed.data.from && parseChapterId(parsed.data.from) ? parsed.data.from : null;

  return (
    <div className="ws-stack">
      <h1 className="ws-display">The trail</h1>
      <MapClient book={book} from={from} />
    </div>
  );
}
