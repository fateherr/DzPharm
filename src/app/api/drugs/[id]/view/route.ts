import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/drugs/[id]/view — increment the consultation counter (fire-and-forget).
 * Returns the new count. Failures are silent (204) to never block the UI.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const drugId = parseInt(id, 10);
    if (Number.isNaN(drugId)) {
      return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
    }

    const updated = await db.drug.update({
      where: { id: drugId },
      data: { views: { increment: 1 } },
      select: { views: true },
    });

    return NextResponse.json({ views: updated.views });
  } catch {
    // Silently ignore — the counter must never break the consultation flow
    return new NextResponse(null, { status: 204 });
  }
}
