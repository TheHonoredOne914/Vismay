"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";

interface ObservatoryIllustrationProps {
  /** Scroll parallax intensity (0 = none, 0.06 = 6% displacement). */
  intensity?: number;
  opacity?: number;
  className?: string;
}

/**
 * A refined classical observatory / archway illustration positioned toward
 * the right edge of the hero. Stone texture, dome, columns, and balustrade.
 * Scrolls with the gentlest parallax (~6%) — it's the "nearest" architectural
 * element so it moves least.
 *
 * Hidden on the calm (topic) variant.
 *
 * Decorative only.
 */
export function ObservatoryIllustration({
  intensity = 0.06,
  opacity = 0.72,
  className,
}: ObservatoryIllustrationProps) {
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
      className={`pointer-events-none absolute bottom-5 right-0 hidden h-[560px] w-[min(29vw,400px)] select-none md:block ${className ?? ""}`}
      style={{ y: reduceMotion ? 0 : y, opacity }}
    >
      <Image
        src="/visuals/observatory-arch.svg"
        alt=""
        fill
        priority
        sizes="(max-width: 700px) 50vw, 28vw"
        className="object-contain object-right-bottom"
      />
    </motion.div>
  );
}

export default ObservatoryIllustration;
