import type { Metadata } from "next";
import type { ReactNode } from "react";

import { SignInCallback } from "@/components/SignInCallback";

export const metadata: Metadata = { title: "Signing in", robots: { index: false } };

export default function AuthCallbackPage(): ReactNode {
  return (
    <div className="ws-stack" style={{ alignItems: "center", textAlign: "center" }}>
      <SignInCallback />
    </div>
  );
}
