"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";

interface ParallaxLandscapeProps {
  /** Scroll parallax intensity as a fraction (0 = none, 0.15 = 15% displacement). */
  intensity?: number;
  /** Opacity multiplier for the whole layer. */
  opacity?: number;
  className?: string;
}

/**
 * Layered misty mountain landscape — the most prominent background element
 * on the homepage. Sits at the bottom of the hero, scrolls with a gentle
 * vertical parallax (~10% of scroll displacement).
 *
 * Decorative only: pointer-events and user-select are disabled.
 */
export function ParallaxLandscape({
  intensity = 0.1,
  opacity = 0.92,
  className,
}: ParallaxLandscapeProps) {
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
      className={`pointer-events-none absolute inset-x-0 bottom-0 h-[360px] select-none ${className ?? ""}`}
      style={{ y: reduceMotion ? 0 : y, opacity }}
    >
      <Image
        src="/visuals/misty-landscape.svg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-bottom"
      />
    </motion.div>
  );
}

export default ParallaxLandscape;
