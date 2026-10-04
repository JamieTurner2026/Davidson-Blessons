"use client";

import Image from "next/image";
import { useRef, type ReactNode } from "react";

import { MOTION_OK, gsap, useGSAP } from "@/components/motion/gsap";
import { levelFor, pilgrimStage } from "@/lib/game";
import { equippedItem, useStudy } from "@/lib/study-store";

interface Point {
  x: number;
  y: number;
}

const HEIGHT = 112;

/** Path string through the standing spots, for MotionPath. */
function walkD(points: Point[]): string {
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`).join(" ");
}

/**
 * The traveller. Stands (feet at `at`) beside the next stop, idles with a gentle bob,
 * and — when arriving from a finished stop — walks the trail to get here.
 * His look follows your level: youth → young man → grown man → elder.
 */
export function Pilgrim({ at, walkPath }: { at: Point; walkPath: Point[] | null }): ReactNode {
  const { xp, equipped } = useStudy();
  const stage = pilgrimStage(levelFor(xp).index) + 1;
  const companion = equippedItem(equipped, "companion");
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const timeline = gsap.timeline();
        if (walkPath && walkPath.length > 1) {
          const start = walkPath[0];
          timeline
            .set(root.current, { x: start.x - at.x, y: start.y - at.y })
            .to(root.current, {
              motionPath: { path: walkD(walkPath.map((point) => ({ x: point.x - at.x, y: point.y - at.y }))) },
              duration: 0.9 + walkPath.length * 0.5,
              ease: "power1.inOut",
              delay: 0.6,
            })
            .to(".pilgrim__figure", { y: -6, duration: 0.18, yoyo: true, repeat: walkPath.length * 4 - 1, ease: "sine.inOut" }, "<");
        }
        timeline.to(".pilgrim__figure", { y: -3, rotation: 1.2, duration: 1.3, yoyo: true, repeat: -1, ease: "sine.inOut", transformOrigin: "50% 100%" });
        gsap.to(".pilgrim__dove", { y: -7, rotation: -6, duration: 0.5, yoyo: true, repeat: -1, ease: "sine.inOut" });
        gsap.to(".pilgrim__lamb", { y: -2, duration: 0.4, yoyo: true, repeat: -1, ease: "sine.inOut", delay: 0.2 });
      });
    },
    { scope: root, dependencies: [at.x, at.y, walkPath?.length ?? 0] },
  );

  // Outer element owns the CSS anchor (feet on the spot); GSAP only moves the inner body,
  // so the two transforms never collide.
  return (
    <div className="pilgrim" style={{ left: at.x, top: at.y }} aria-hidden="true">
      <div ref={root} className="pilgrim__body">
        {companion === "companion-dove" && (
          <Image src="/pilgrim/dove.webp" alt="" width={46} height={41} className="pilgrim__dove" />
        )}
        <Image src={`/pilgrim/stage-${stage}.webp`} alt="" width={Math.round(HEIGHT * 0.5)} height={HEIGHT} className="pilgrim__figure" />
        {companion === "companion-lamb" && (
          <Image src="/pilgrim/lamb.webp" alt="" width={44} height={48} className="pilgrim__lamb" />
        )}
      </div>
    </div>
  );
}
