"use client";

import { motion, useReducedMotion } from "motion/react";
import { ParallaxLandscape } from "./ParallaxLandscape";
import { CelestialOrbits } from "./CelestialOrbits";
import { ObservatoryIllustration } from "./ObservatoryIllustration";
import { BotanicalIllustration } from "./BotanicalIllustration";
import { TopographicLines } from "./TopographicLines";

interface VismayAmbientSceneProps {
  /**
   * Visual intensity of the decorative background.
   *  - "full": homepage hero — all layers at full opacity.
   *  - "calm": reading view — only sky + a faint landscape, everything
   *           else hidden. The study page must stay quieter than the home.
   */
  intensity?: "full" | "calm";
  className?: string;
}

/**
 * Vismay's layered ambient background — the orchestrator that composes
 * every independent parallax illustration behind the UI.
 *
 * Layers (back → front), each with its own scroll parallax speed:
 *   1. CelestialOrbits      — 16%  (most distant, moves most)
 *   2. TopographicLines     — 5%   (mid-ground terrain contours)
 *   3. ObservatoryIllustration — 6% (nearest architecture, moves least)
 *   4. BotanicalIllustration   — 8% (organic warmth, left edge)
 *   5. ParallaxLandscape       — 10% (foreground hills, bottom)
 *   6. RadialWash              — 0%  (legibility gradient, center)
 *
 * Every layer is decorative: pointer-events and user-select are disabled.
 * Animations respect `prefers-reduced-motion`.
 */
export function VismayAmbientScene({
  intensity = "full",
  className,
}: VismayAmbientSceneProps) {
  const reduceMotion = useReducedMotion();
  const calm = intensity === "calm";

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 isolate overflow-hidden ${className ?? ""}`}
    >
      {/* Layer 1: Celestial orbits — always present, quieter on calm pages */}
      <CelestialOrbits
        intensity={calm ? 0.08 : 0.16}
        opacity={calm ? 0.22 : 0.6}
      />

      {/* Layer 2: Topographic contours — only on full (home) */}
      {!calm && (
        <TopographicLines intensity={0.05} opacity={0.35} />
      )}

      {/* Layer 3: Observatory archway — only on full (home) */}
      {!calm && (
        <ObservatoryIllustration intensity={0.06} opacity={0.72} />
      )}

      {/* Layer 4: Botanical illustration — only on full (home), large screens */}
      {!calm && (
        <BotanicalIllustration intensity={0.08} opacity={0.5} side="left" />
      )}

      {/* Layer 5: Misty mountain landscape — always present */}
      <ParallaxLandscape
        intensity={calm ? 0.05 : 0.1}
        opacity={calm ? 0.32 : 0.92}
      />

      {/* Layer 6: Radial wash — keeps text legible in the center */}
      <motion.div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 h-[60%] w-[65%] -translate-x-1/2 -translate-y-1/2 rounded-[50%]"
        style={{
          background:
            "radial-gradient(ellipse, rgba(250,249,243,0.87) 12%, rgba(250,249,243,0.52) 48%, rgba(250,249,243,0) 73%)",
          opacity: calm ? 0.5 : 1,
        }}
        animate={
          reduceMotion
            ? undefined
            : { opacity: calm ? [0.4, 0.55, 0.4] : [0.92, 1, 0.92] }
        }
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

export default VismayAmbientScene;
