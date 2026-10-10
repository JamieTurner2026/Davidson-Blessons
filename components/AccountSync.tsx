"use client";

import { useEffect, type ReactNode } from "react";

import { startSync } from "@/lib/sync";

/** Mounted once in the layout: starts optional account sync in the browser. Renders nothing. */
export function AccountSync(): ReactNode {
  useEffect(() => {
    startSync();
  }, []);
  return null;
}
