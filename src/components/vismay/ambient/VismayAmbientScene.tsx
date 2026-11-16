"use client";

/**
 * Thin re-export so existing imports (`@/components/vismay/ambient/VismayAmbientScene`)
 * continue to work after the visual refactor. The real implementation now lives
 * in `@/components/visuals/VismayAmbientScene` with richer layered illustrations.
 */
export {
  VismayAmbientScene,
  VismayAmbientScene as default,
} from "@/components/visuals/VismayAmbientScene";
