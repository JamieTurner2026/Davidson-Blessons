"use client";

import { useRef, type ReactNode } from "react";

import { MOTION_OK, gsap, useGSAP } from "@/components/motion/gsap";
import { equippedItem, useStudy } from "@/lib/study-store";

interface Props {
  lit: boolean;
  /** 0–1: how bright the glow is (grows with streak length). */
  glow?: number;
  size?: number;
  /** Force a specific lamp (Workshop previews); defaults to the equipped one. */
  variant?: string;
}

const FLAME = "M27 21c-3.2-.4-4.6-3-3.6-5.8.8-2.3 2.6-3.6 3.4-7.2 1.6 2.4 4.4 4.9 4 8.4-.3 2.6-1.6 4.6-3.8 4.6z";
const CLAY_BODY =
  "M6.5 30.5c2-.8 5.2-1.1 8.6-.9 4.7.3 9 .2 13.3-.9 3.3-.8 6.4-2.6 8.6-5.1l2.9-.6c-.6 3.7-2.2 6.6-4.7 8.9-3.4 3.2-8.6 4.9-14.3 4.7-5.2-.2-9.5-2.1-11.6-4.5-.5-.6-.5-1.3 1.2-1.6z";

interface FlameSpot {
  /** Flame base position. */
  x: number;
  y: number;
  scale: number;
}

interface Design {
  flames: FlameSpot[];
  glow: { x: number; y: number; r: number };
  body: ReactNode;
}

const ink = { stroke: "var(--ws-fg)", strokeWidth: 1.5, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

const DESIGNS: Record<string, Design> = {
  "lamp-clay": {
    flames: [{ x: 27, y: 21, scale: 1 }],
    glow: { x: 27, y: 13, r: 9 },
    body: (
      <>
        <path d={CLAY_BODY} fill="var(--ws-bg)" {...ink} />
        <path d="M26.5 29.4c.2-2.4.6-4.6.9-6.9" fill="none" {...ink} strokeWidth={1.4} />
        <path d="M17 36.3c1 2.2 3.1 3.4 6.4 3.4 3.1 0 5.1-1 6.3-3.1" fill="none" {...ink} strokeWidth={1.4} />
        <path d="M13 33.4c3.5 1 8.3 1.3 12.8.5" stroke="var(--ws-muted-soft)" strokeWidth={1} strokeLinecap="round" fill="none" />
      </>
    ),
  },
  "lamp-brass": {
    flames: [{ x: 27, y: 21, scale: 1 }],
    glow: { x: 27, y: 13, r: 10 },
    body: (
      <>
        <path d={CLAY_BODY} fill="color-mix(in srgb, var(--ws-accent) 55%, var(--ws-bg))" {...ink} />
        <path d="M5.8 31.2c-3.6-.6-5.2 2.8-3.4 5.2 1.4 1.8 4 1.6 5.2.4" fill="none" {...ink} />
        <path d="M26.5 29.4c.2-2.4.6-4.6.9-6.9" fill="none" {...ink} strokeWidth={1.4} />
        <path d="M15 37.5h16.5M18.5 40.5h9.5" fill="none" {...ink} strokeWidth={1.4} />
        <path d="M12 32.6c4 1 9.5 1.1 14.6.2" stroke="var(--ws-fg)" strokeOpacity={0.35} strokeWidth={1} fill="none" />
      </>
    ),
  },
  "lamp-lantern": {
    flames: [{ x: 24, y: 24, scale: 0.85 }],
    glow: { x: 24, y: 18, r: 11 },
    body: (
      <>
        <circle cx="24" cy="-7" r="2.6" fill="none" {...ink} />
        <path d="M24 -4.4v3.4" fill="none" {...ink} />
        <path d="M14 6l10-7 10 7z" fill="var(--ws-bg)" {...ink} />
        <path d="M15.5 6h17v25.5h-17z" fill="none" {...ink} />
        <path d="M24 6v4M24 28v3.5M15.5 18.5h2.5M30 18.5h2.5" fill="none" {...ink} strokeWidth={1.2} />
        <path d="M13 31.5h22v4H13z" fill="var(--ws-bg)" {...ink} />
      </>
    ),
  },
  "lamp-menorah": {
    flames: [-3, -2, -1, 0, 1, 2, 3].map((k) => ({ x: 24 + k * 6.2, y: 10, scale: 0.42 })),
    glow: { x: 24, y: 4, r: 14 },
    body: (
      <>
        {[1, 2, 3].map((k) => (
          <path
            key={k}
            d={`M${24 - 6.2 * k} 10 Q${24 - 6.2 * k} ${12 + 5 * k} 24 ${12 + 5 * k} Q${24 + 6.2 * k} ${12 + 5 * k} ${24 + 6.2 * k} 10`}
            fill="none"
            {...ink}
            strokeWidth={1.4}
          />
        ))}
        <path d="M24 10v30M16 41c2.5-2 13.5-2 16 0" fill="none" {...ink} />
        {[-3, -2, -1, 0, 1, 2, 3].map((k) => (
          <path key={k} d={`M${24 + k * 6.2 - 1.6} 10h3.2`} fill="none" {...ink} strokeWidth={1.4} />
        ))}
      </>
    ),
  },
};

/**
 * Selah's streak symbol — the equipped lamp from the Workshop. Flames flicker while lit;
 * unlit, it's a quiet outline waiting for today's reading.
 */
export function Lamp({ lit, glow = 0.4, size = 44, variant }: Props): ReactNode {
  const root = useRef<SVGSVGElement>(null);
  const { equipped } = useStudy();
  const id = variant ?? equippedItem(equipped, "lamp");
  const design = DESIGNS[id] ?? DESIGNS["lamp-clay"];

  useGSAP(
    () => {
      if (!lit) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.fromTo(".lamp__flame", { scale: 0.2, transformOrigin: "50% 100%" }, { scale: 1, duration: 0.6, ease: "back.out(3)", stagger: 0.05 });
        gsap.to(".lamp__flame", {
          scaleY: 1.12,
          scaleX: 0.9,
          skewX: 4,
          transformOrigin: "50% 100%",
          duration: 0.32,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          delay: 0.6,
          stagger: { each: 0.07, from: "random" },
        });
        gsap.to(".lamp__glow", { scale: 1.08, transformOrigin: "50% 50%", duration: 1.4, ease: "sine.inOut", yoyo: true, repeat: -1 });
      });
    },
    { scope: root, dependencies: [lit, id], revertOnUpdate: true },
  );

  const glowRadius = design.glow.r + glow * 9;

  return (
    <svg ref={root} width={size} height={size} viewBox="-6 -12 60 60" aria-hidden="true" className="lamp">
      {lit && <circle className="lamp__glow" cx={design.glow.x} cy={design.glow.y} r={glowRadius} fill="var(--ws-accent)" opacity={0.18 + glow * 0.22} />}
      {design.body}
      {lit &&
        design.flames.map((spot, index) => (
          <g key={index} transform={`translate(${spot.x - 27 * spot.scale} ${spot.y - 21 * spot.scale}) scale(${spot.scale})`}>
            <path className="lamp__flame" d={FLAME} fill="var(--ws-accent)" stroke="var(--ws-fg)" strokeWidth={1.2 / spot.scale} strokeLinejoin="round" />
          </g>
        ))}
    </svg>
  );
}
