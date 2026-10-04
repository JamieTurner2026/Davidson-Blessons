"use client";

import { useRef, type ReactNode } from "react";

import { MOTION_OK, gsap, useGSAP } from "@/components/motion/gsap";

/** Renders `value`, tweening from the previous value whenever it changes. */
export function CountUp({ value, duration = 0.9 }: { value: number; duration?: number }): ReactNode {
  const node = useRef<HTMLSpanElement>(null);
  const shown = useRef({ n: 0 });

  useGSAP(
    () => {
      const render = (): void => {
        if (node.current) node.current.textContent = Math.round(shown.current.n).toLocaleString();
      };
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.to(shown.current, { n: value, duration, ease: "power2.out", onUpdate: render });
      });
      mm.add("(prefers-reduced-motion: reduce)", () => {
        shown.current.n = value;
        render();
      });
    },
    { dependencies: [value] },
  );

  return <span ref={node} style={{ fontVariantNumeric: "tabular-nums" }}>{value.toLocaleString()}</span>;
}
