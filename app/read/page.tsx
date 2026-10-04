import { redirect } from "next/navigation";

import { DEFAULT_TRANSLATION } from "@/lib/bibles";

export default function ReadIndex(): never {
  redirect(`/read/${DEFAULT_TRANSLATION.slug}/JHN.1`);
}
