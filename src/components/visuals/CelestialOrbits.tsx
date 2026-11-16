"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";

interface CelestialOrbitsProps {
  /** Scroll parallax intensity (0 = none, 0.18 = 18% displacement). */
  intensity?: number;
  opacity?: number;
  className?: string;
}

/**
 * Delicate orbital and constellation patterns occupying the upper portion
 * of the hero. Scattered stars, dashed orbital ellipses, and small
 * constellation lines in antique gold and sage.
 *
 * The entire layer drifts with the strongest parallax (~16–18%) so it
 * feels like the most distant celestial sphere.
 *
 * Decorative only.
 */
export function CelestialOrbits({
  intensity = 0.16,
  opacity = 0.6,
  className,
}: CelestialOrbitsProps) {
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
      className={`pointer-events-none absolute inset-x-0 top-0 h-[75%] select-none ${className ?? ""}`}
      style={{ y: reduceMotion ? 0 : y, opacity }}
    >
      <Image
        src="/visuals/celestial-lines.svg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-fill"
      />
    </motion.div>
  );
}

export default CelestialOrbits;
