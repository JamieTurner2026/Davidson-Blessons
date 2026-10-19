"use client";

import { useRef, type ReactNode } from "react";

import { MOTION_OK, SplitText, gsap, useGSAP } from "@/components/motion/gsap";

/** Display headline whose words rise out of a mask, one after another. */
export function SplitHeadline({ lines }: { lines: string[] }): ReactNode {
  const root = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        if (!root.current) return;
        const split = SplitText.create(root.current, {
          type: "words",
          mask: "words",
          autoSplit: true,
          onSplit(self) {
            return gsap.from(self.words, { yPercent: 110, duration: 0.9, ease: "power4.out", stagger: 0.09 });
          },
        });
        return () => split.revert();
      });
    },
    { scope: root },
  );

  return (
    <h1 ref={root} className="ws-display" style={{ textWrap: "wrap" }}>
      {lines.map((line) => (
        <span key={line} style={{ display: "block" }}>
          {line}
        </span>
      ))}
    </h1>
  );
}
