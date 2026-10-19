import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A lockfile higher up in ~/ makes Next guess the wrong workspace root.
  // Study notes are read from disk at request time; make sure they ship with the function.
  outputFileTracingIncludes: { "/read/[translation]/[chapter]": ["./public/data/notes/**/*"] },
  turbopack: { root: import.meta.dirname },
};

export default nextConfig;
