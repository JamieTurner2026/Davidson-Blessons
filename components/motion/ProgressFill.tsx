"use client";

import { useRef, type ReactNode } from "react";

import { MOTION_OK, gsap, useGSAP } from "@/components/motion/gsap";

interface Props {
  /** 0–1 */
  value: number;
  label: string;
  tall?: boolean;
}

/** Ink bar on a hairline track that tweens to its new value. */
export function ProgressFill({ value, label, tall = false }: Props): ReactNode {
  const fill = useRef<HTMLSpanElement>(null);
  const clamped = Math.max(0, Math.min(1, value));

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.to(fill.current, { scaleX: clamped, duration: 1, ease: "power3.out" });
      });
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(fill.current, { scaleX: clamped });
      });
    },
    { dependencies: [clamped] },
  );

  return (
    <div
      className={tall ? "progress progress--tall" : "progress"}
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(clamped * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span ref={fill} style={{ width: "100%", transform: "scaleX(0)", transformOrigin: "left center" }} />
    </div>
  );
}
