"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";
import styles from "./VismayAmbientScene.module.css";

interface VismayAmbientSceneProps {
  /** Visual intensity of the decorative background.
   *  - "full": homepage hero (full opacity on every layer).
   *  - "calm": reading view (lower opacity, only sky + landscape). */
  intensity?: "full" | "calm";
  className?: string;
}

/**
 * Decorative layered background artwork for Vismay. Purely ornamental;
 * pointer-events are disabled so it never blocks reading interactions.
 */
export function VismayAmbientScene({ intensity = "full", className }: VismayAmbientSceneProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const far = useTransform(scrollYProgress, [0, 1], ["0%", "11%"]);
  const near = useTransform(scrollYProgress, [0, 1], ["0%", "7%"]);
  const sky = useTransform(scrollYProgress, [0, 1], ["0%", "16%"]);

  const calm = intensity === "calm";

  return (
    <div
      ref={ref}
      className={`${styles.scene} ${calm ? styles.calm : ""} ${className ?? ""}`}
      aria-hidden="true"
    >
      <motion.div
        className={`${styles.layer} ${styles.sky}`}
        style={{ y: reduceMotion ? 0 : sky }}
      >
        <Image src="/visuals/celestial-lines.svg" alt="" fill priority sizes="100vw" />
      </motion.div>
      {!calm && (
        <motion.div
          className={`${styles.layer} ${styles.arch}`}
          style={{ y: reduceMotion ? 0 : near }}
        >
          <Image
            src="/visuals/observatory-arch.svg"
            alt=""
            fill
            priority
            sizes="(max-width: 700px) 50vw, 28vw"
          />
        </motion.div>
      )}
      <motion.div
        className={`${styles.layer} ${styles.landscape}`}
        style={{ y: reduceMotion ? 0 : far }}
      >
        <Image src="/visuals/misty-landscape.svg" alt="" fill priority sizes="100vw" />
      </motion.div>
      <div className={styles.wash} />
    </div>
  );
}

export default VismayAmbientScene;
