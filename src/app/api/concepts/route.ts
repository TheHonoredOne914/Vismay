import { NextResponse } from "next/server";

import { getDemoUserId } from "@/lib/persistence/user";
import { listConceptGraph } from "@/lib/persistence";
import type { ConceptNodeData, ConceptEdgeData } from "@/lib/types";

export const runtime = "nodejs";

function devError(e: unknown): string | undefined {
  return process.env.NODE_ENV === "development"
    ? String((e as any)?.message ?? e)
    : undefined;
}

/**
 * GET /api/concepts — return the connected-concepts graph for the demo user.
 *
 * Returns: { nodes: ConceptNodeData[], edges: ConceptEdgeData[] }
 */
export async function GET() {
  try {
    const userId = await getDemoUserId();
    const graph: { nodes: ConceptNodeData[]; edges: ConceptEdgeData[] } =
      await listConceptGraph(userId);
    return NextResponse.json(graph);
  } catch (e) {
    return NextResponse.json(
      { error: "Internal server error", message: devError(e) },
      { status: 500 }
    );
  }
}
