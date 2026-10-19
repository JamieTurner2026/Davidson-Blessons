import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A lockfile higher up in ~/ makes Next guess the wrong workspace root.
  turbopack: { root: import.meta.dirname },
};

export default nextConfig;
