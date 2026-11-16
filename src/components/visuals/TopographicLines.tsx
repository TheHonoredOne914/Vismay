"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";

interface TopographicLinesProps {
  /** Scroll parallax intensity. */
  intensity?: number;
  opacity?: number;
  className?: string;
}

/**
 * Subtle topographic contour lines drifting across the mid-ground of the
 * hero. Very low opacity so it adds depth without competing with the
 * celestial or landscape layers.
 *
 * Scrolls with a slow parallax (~5%) — it reads as distant terrain.
 *
 * Decorative only.
 */
export function TopographicLines({
  intensity = 0.05,
  opacity = 0.35,
  className,
}: TopographicLinesProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", `${intensity * 100}%`]);

  return (
    <motion.div
      ref={ref}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-0 top-[35%] h-[300px] select-none ${className ?? ""}`}
      style={{ y: reduceMotion ? 0 : y, opacity }}
    >
      <Image
        src="/visuals/topographic-lines.svg"
        alt=""
        fill
        sizes="100vw"
        className="object-cover object-center"
      />
    </motion.div>
  );
}

export default TopographicLines;
