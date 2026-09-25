// Standard USFM/Paratext three-letter book codes. This is a public, stable
// convention used across Bible software generally — it is NOT YouVersion-
// specific and is not Scripture text, so hardcoding it does not violate the
// "never fabricate Scripture" rule. YouVersion's own book identifiers should
// still be confirmed against a live GET /v1/bibles/{bible_id}/books response
// once real credentials are available; usfmToVersionBookId() below is the
// seam where that confirmed mapping gets plugged in.

export const BOOKS = [
  { name: "Genesis", usfm: "GEN", testament: "OT", chapters: 50 },
  { name: "Exodus", usfm: "EXO", testament: "OT", chapters: 40 },
  { name: "Leviticus", usfm: "LEV", testament: "OT", chapters: 27 },
  { name: "Numbers", usfm: "NUM", testament: "OT", chapters: 36 },
  { name: "Deuteronomy", usfm: "DEU", testament: "OT", chapters: 34 },
  { name: "Joshua", usfm: "JOS", testament: "OT", chapters: 24 },
  { name: "Judges", usfm: "JDG", testament: "OT", chapters: 21 },
  { name: "Ruth", usfm: "RUT", testament: "OT", chapters: 4 },
  { name: "1 Samuel", usfm: "1SA", testament: "OT", chapters: 31 },
  { name: "2 Samuel", usfm: "2SA", testament: "OT", chapters: 24 },
  { name: "1 Kings", usfm: "1KI", testament: "OT", chapters: 22 },
  { name: "2 Kings", usfm: "2KI", testament: "OT", chapters: 25 },
  { name: "1 Chronicles", usfm: "1CH", testament: "OT", chapters: 29 },
  { name: "2 Chronicles", usfm: "2CH", testament: "OT", chapters: 36 },
  { name: "Ezra", usfm: "EZR", testament: "OT", chapters: 10 },
  { name: "Nehemiah", usfm: "NEH", testament: "OT", chapters: 13 },
  { name: "Esther", usfm: "EST", testament: "OT", chapters: 10 },
  { name: "Job", usfm: "JOB", testament: "OT", chapters: 42 },
  { name: "Psalms", usfm: "PSA", testament: "OT", chapters: 150 },
  { name: "Proverbs", usfm: "PRO", testament: "OT", chapters: 31 },
  { name: "Ecclesiastes", usfm: "ECC", testament: "OT", chapters: 12 },
  { name: "Song of Solomon", usfm: "SNG", testament: "OT", chapters: 8 },
  { name: "Isaiah", usfm: "ISA", testament: "OT", chapters: 66 },
  { name: "Jeremiah", usfm: "JER", testament: "OT", chapters: 52 },
  { name: "Lamentations", usfm: "LAM", testament: "OT", chapters: 5 },
  { name: "Ezekiel", usfm: "EZK", testament: "OT", chapters: 48 },
  { name: "Daniel", usfm: "DAN", testament: "OT", chapters: 12 },
  { name: "Hosea", usfm: "HOS", testament: "OT", chapters: 14 },
  { name: "Joel", usfm: "JOL", testament: "OT", chapters: 3 },
  { name: "Amos", usfm: "AMO", testament: "OT", chapters: 9 },
  { name: "Obadiah", usfm: "OBA", testament: "OT", chapters: 1 },
  { name: "Jonah", usfm: "JON", testament: "OT", chapters: 4 },
  { name: "Micah", usfm: "MIC", testament: "OT", chapters: 7 },
  { name: "Nahum", usfm: "NAM", testament: "OT", chapters: 3 },
  { name: "Habakkuk", usfm: "HAB", testament: "OT", chapters: 3 },
  { name: "Zephaniah", usfm: "ZEP", testament: "OT", chapters: 3 },
  { name: "Haggai", usfm: "HAG", testament: "OT", chapters: 2 },
  { name: "Zechariah", usfm: "ZEC", testament: "OT", chapters: 14 },
  { name: "Malachi", usfm: "MAL", testament: "OT", chapters: 4 },
  { name: "Matthew", usfm: "MAT", testament: "NT", chapters: 28 },
  { name: "Mark", usfm: "MRK", testament: "NT", chapters: 16 },
  { name: "Luke", usfm: "LUK", testament: "NT", chapters: 24 },
  { name: "John", usfm: "JHN", testament: "NT", chapters: 21 },
  { name: "Acts", usfm: "ACT", testament: "NT", chapters: 28 },
  { name: "Romans", usfm: "ROM", testament: "NT", chapters: 16 },
  { name: "1 Corinthians", usfm: "1CO", testament: "NT", chapters: 16 },
  { name: "2 Corinthians", usfm: "2CO", testament: "NT", chapters: 13 },
  { name: "Galatians", usfm: "GAL", testament: "NT", chapters: 6 },
  { name: "Ephesians", usfm: "EPH", testament: "NT", chapters: 6 },
  { name: "Philippians", usfm: "PHP", testament: "NT", chapters: 4 },
  { name: "Colossians", usfm: "COL", testament: "NT", chapters: 4 },
  { name: "1 Thessalonians", usfm: "1TH", testament: "NT", chapters: 5 },
  { name: "2 Thessalonians", usfm: "2TH", testament: "NT", chapters: 3 },
  { name: "1 Timothy", usfm: "1TI", testament: "NT", chapters: 6 },
  { name: "2 Timothy", usfm: "2TI", testament: "NT", chapters: 4 },
  { name: "Titus", usfm: "TIT", testament: "NT", chapters: 3 },
  { name: "Philemon", usfm: "PHM", testament: "NT", chapters: 1 },
  { name: "Hebrews", usfm: "HEB", testament: "NT", chapters: 13 },
  { name: "James", usfm: "JAS", testament: "NT", chapters: 5 },
  { name: "1 Peter", usfm: "1PE", testament: "NT", chapters: 5 },
  { name: "2 Peter", usfm: "2PE", testament: "NT", chapters: 3 },
  { name: "1 John", usfm: "1JN", testament: "NT", chapters: 5 },
  { name: "2 John", usfm: "2JN", testament: "NT", chapters: 1 },
  { name: "3 John", usfm: "3JN", testament: "NT", chapters: 1 },
  { name: "Jude", usfm: "JUD", testament: "NT", chapters: 1 },
  { name: "Revelation", usfm: "REV", testament: "NT", chapters: 22 }
];

export function findBookByName(name) {
  const needle = String(name || "").trim().toLowerCase();
  return BOOKS.find(
    (b) => b.name.toLowerCase() === needle || b.usfm.toLowerCase() === needle
  );
}
