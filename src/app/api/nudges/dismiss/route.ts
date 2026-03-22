export const dynamic = 'force-dynamic';

import { z } from "zod";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { success, error, withErrorHandling, parseBody } from "@/lib/api";

const dismissSchema = z.object({
  id: z.number().int().positive(),
});

// ---------------------------------------------------------------------------
// POST /api/nudges/dismiss — Dismiss a nudge
// ---------------------------------------------------------------------------
export const POST = withErrorHandling(async (req) => {
  const { id } = await parseBody(req, dismissSchema);

  // Verify nudge exists
  const existing = (
    await db
      .select()
      .from(schema.dailyNudges)
      .where(eq(schema.dailyNudges.id, id))
  )[0];

  if (!existing) {
    return error("Nudge not found", 404);
  }

  if (existing.dismissed === 1) {
    return success({ message: "Already dismissed" });
  }

  await db
    .update(schema.dailyNudges)
    .set({ dismissed: 1 })
    .where(eq(schema.dailyNudges.id, id));

  return success({ message: "Nudge dismissed" });
});
