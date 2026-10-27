import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ResetPassword } from "@/components/ResetPassword";

export const metadata: Metadata = { title: "Reset your password", robots: { index: false } };

export default function ResetPasswordPage(): ReactNode {
  return (
    <div className="ws-stack" style={{ alignItems: "center", textAlign: "center" }}>
      <ResetPassword />
    </div>
  );
}
