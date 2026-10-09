// "Which book is this from?" — recognisable verses from across the canon.
// Rules (checked by scripts/verify-trivia.ts): a verse must not name its own book
// ("But Ruth replied"), and must not have a near-identical twin in another book of the
// same testament (EXO.20.3 = DEU.5.7, MRK.10.45 ≈ MAT.20.28) — either gives the answer away.
export const QUIZ_POOL: ReadonlyArray<string> = [
  "GEN.1.1", "EXO.14.14", "LEV.19.18", "NUM.6.24", "DEU.6.5", "JOS.24.15", "JDG.21.25", "RUT.2.12",
  "1SA.2.2", "2SA.12.7", "1KI.19.12", "2KI.6.16", "1CH.29.11", "2CH.7.14", "EZR.8.22", "NEH.1.4",
  "EST.4.14", "JOB.19.25", "PSA.23.1", "PSA.46.10", "PSA.119.105", "PRO.3.5", "PRO.22.6", "ECC.3.1",
  "SNG.8.7", "ISA.40.31", "ISA.53.5", "JER.29.11", "LAM.3.23", "EZK.36.26", "DAN.3.17", "HOS.6.6",
  "JOL.2.28", "AMO.5.24", "JON.2.9", "MIC.6.8", "HAB.2.4", "ZEP.3.17", "ZEC.4.6", "MAL.3.10",
  "MAT.5.14", "MAT.6.34", "MAT.28.19", "MRK.4.39", "MRK.9.24", "LUK.2.11", "LUK.15.7", "JHN.1.1",
  "JHN.11.35", "JHN.14.6", "ACT.1.8", "ACT.2.42", "ROM.3.23", "ROM.12.2", "1CO.13.13", "2CO.5.17",
  "GAL.5.22", "EPH.2.8", "PHP.4.13", "COL.3.23", "1TH.5.17", "2TI.3.16", "HEB.11.1", "JAS.1.22",
  "1PE.5.7", "1JN.4.8", "REV.21.4", "REV.3.20",
];
