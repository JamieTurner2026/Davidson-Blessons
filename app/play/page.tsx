import type { Metadata } from "next";
import type { ReactNode } from "react";
import { z } from "zod";

import { PlayHub } from "@/components/games/PlayHub";
import { getBook } from "@/lib/canon";

export const metadata: Metadata = { title: "Play" };

const paramsSchema = z.object({
  book: z.string().max(3).optional(),
  at: z.coerce.number().int().min(1).max(150).optional(),
});

export default async function PlayPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<ReactNode> {
  const parsed = paramsSchema.safeParse(await searchParams);
  const book = parsed.success && parsed.data.book ? getBook(parsed.data.book) : undefined;
  const checkpoint = book && parsed.success && parsed.data.at && parsed.data.at <= book.chapters ? { bookId: book.id, at: parsed.data.at } : null;

  return (
    <div className="ws-stack">
      <h1 className="ws-display">Play</h1>
      <PlayHub key={checkpoint ? `${checkpoint.bookId}:${checkpoint.at}` : "hub"} checkpoint={checkpoint} />
    </div>
  );
}
