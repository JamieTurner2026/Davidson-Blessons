"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";

import { MOTION_OK, gsap, useGSAP } from "@/components/motion/gsap";

interface Props {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Seconds between each child. */
  stagger?: number;
  delay?: number;
}

/** Staggers its direct children up into place on mount. */
export function Reveal({ children, className, style, stagger = 0.08, delay = 0 }: Props): ReactNode {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const items = root.current ? Array.from(root.current.children) : [];
        gsap.from(items, { y: 22, autoAlpha: 0, duration: 0.7, ease: "power3.out", stagger, delay, clearProps: "transform,opacity,visibility" });
      });
    },
    { scope: root },
  );

  return (
    <div ref={root} className={className} style={style}>
      {children}
    </div>
  );
}
