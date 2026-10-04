"use client";

import { useRef, type ReactNode } from "react";

import { MOTION_OK, gsap, useGSAP } from "@/components/motion/gsap";

interface Props {
  lit: boolean;
  /** 0–1: how bright the glow is (grows with streak length). */
  glow?: number;
  size?: number;
}

/**
 * Hand-drawn clay oil lamp — Selah's streak symbol. The flame flickers while lit;
 * unlit, it's a quiet outline waiting for today's reading.
 */
export function Lamp({ lit, glow = 0.4, size = 44 }: Props): ReactNode {
  const root = useRef<SVGSVGElement>(null);

  useGSAP(
    () => {
      if (!lit) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.fromTo(".lamp__flame", { scale: 0.2, transformOrigin: "50% 100%" }, { scale: 1, duration: 0.6, ease: "back.out(3)" });
        gsap.to(".lamp__flame", {
          scaleY: 1.12,
          scaleX: 0.9,
          skewX: 4,
          transformOrigin: "50% 100%",
          duration: 0.32,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          repeatRefresh: true,
          delay: 0.6,
        });
        gsap.to(".lamp__glow", { scale: 1.08, transformOrigin: "50% 50%", duration: 1.4, ease: "sine.inOut", yoyo: true, repeat: -1 });
      });
    },
    { scope: root, dependencies: [lit], revertOnUpdate: true },
  );

  const glowRadius = 9 + glow * 9;

  return (
    <svg ref={root} width={size} height={size} viewBox="-6 -12 60 60" aria-hidden="true" className="lamp">
      {lit && <circle className="lamp__glow" cx="27" cy="13" r={glowRadius} fill="var(--ws-accent)" opacity={0.18 + glow * 0.22} />}
      {lit && (
        <path
          className="lamp__flame"
          d="M27 21c-3.2-.4-4.6-3-3.6-5.8.8-2.3 2.6-3.6 3.4-7.2 1.6 2.4 4.4 4.9 4 8.4-.3 2.6-1.6 4.6-3.8 4.6z"
          fill="var(--ws-accent)"
          stroke="var(--ws-fg)"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      )}
      <path
        d="M6.5 30.5c2-.8 5.2-1.1 8.6-.9 4.7.3 9 .2 13.3-.9 3.3-.8 6.4-2.6 8.6-5.1l2.9-.6c-.6 3.7-2.2 6.6-4.7 8.9-3.4 3.2-8.6 4.9-14.3 4.7-5.2-.2-9.5-2.1-11.6-4.5-.5-.6-.5-1.3 1.2-1.6z"
        fill="var(--ws-bg)"
        stroke="var(--ws-fg)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M26.5 29.4c.2-2.4.6-4.6.9-6.9" stroke="var(--ws-fg)" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      <path d="M17 36.3c1 2.2 3.1 3.4 6.4 3.4 3.1 0 5.1-1 6.3-3.1" stroke="var(--ws-fg)" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      <path d="M13 33.4c3.5 1 8.3 1.3 12.8.5" stroke="var(--ws-muted-soft)" strokeWidth="1" strokeLinecap="round" fill="none" />
    </svg>
  );
}
