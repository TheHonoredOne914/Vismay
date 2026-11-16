"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";

interface BotanicalIllustrationProps {
  /** Scroll parallax intensity. */
  intensity?: number;
  opacity?: number;
  /** Position: "left" or "right" edge. */
  side?: "left" | "right";
  className?: string;
}

/**
 * Delicate botanical illustration — a branch with leaves and a small bud.
 * Positioned toward the left edge of the hero, providing organic warmth
 * to balance the architectural observatory on the right.
 *
 * Scrolls with a medium parallax (~8%), between the landscape and the arch.
 *
 * Decorative only.
 */
export function BotanicalIllustration({
  intensity = 0.08,
  opacity = 0.5,
  side = "left",
  className,
}: BotanicalIllustrationProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", `${intensity * 100}%`]);
  const sideClass = side === "left" ? "left-0" : "right-0";

  return (
    <motion.div
      ref={ref}
      aria-hidden="true"
      className={`pointer-events-none absolute bottom-20 ${sideClass} hidden h-[420px] w-[260px] select-none lg:block ${className ?? ""}`}
      style={{ y: reduceMotion ? 0 : y, opacity }}
    >
      <Image
        src="/visuals/botanical-illustration.svg"
        alt=""
        fill
        sizes="260px"
        className="object-contain object-bottom"
      />
    </motion.div>
  );
}

export default BotanicalIllustration;
