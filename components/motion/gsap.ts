"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Physics2DPlugin } from "gsap/Physics2DPlugin";
import { SplitText } from "gsap/SplitText";

// Register once, at module load, before any component calls useGSAP.
gsap.registerPlugin(useGSAP, SplitText, Physics2DPlugin);

export const MOTION_OK = "(prefers-reduced-motion: no-preference)";
export const MOTION_REDUCED = "(prefers-reduced-motion: reduce)";

export { gsap, SplitText, useGSAP };
