// Translations this app will request. Anything not listed here is rejected before
// it reaches API.Bible, so a crafted URL can't spend quota on arbitrary bibles.
//
// Translations with `selfHosted` set are public domain and come from our own Bible API
// (lib/selfbible.ts, github.com/JamieTurner2026/API-bible) instead of API.Bible, so they
// spend no quota. The value is that API's translation id. `apiId` is kept for reference.

export interface Translation {
  slug: string;
  abbreviation: string;
  name: string;
  apiId: string;
  selfHosted?: string;
}

export const TRANSLATIONS: ReadonlyArray<Translation> = [
  { slug: "bsb", abbreviation: "BSB", name: "Berean Standard Bible", apiId: "bba9f40183526463-01", selfHosted: "bsb" },
  { slug: "niv", abbreviation: "NIV", name: "New International Version", apiId: "78a9f6124f344018-01" },
  { slug: "kjv", abbreviation: "KJV", name: "King James Version", apiId: "de4e12af7f28f599-02" },
  { slug: "web", abbreviation: "WEB", name: "World English Bible", apiId: "9879dbb7cfe39e4d-04", selfHosted: "web" },
  { slug: "asv", abbreviation: "ASV", name: "American Standard Version", apiId: "06125adad2d5898a-01", selfHosted: "asv" },
  { slug: "lsv", abbreviation: "LSV", name: "Literal Standard Version", apiId: "01b29f4b342acc35-01" },
];

export const DEFAULT_TRANSLATION = TRANSLATIONS[0];

export function getTranslation(slug: string): Translation | undefined {
  return TRANSLATIONS.find((translation) => translation.slug === slug);
}
