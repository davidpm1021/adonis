import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { success, error, withErrorHandling } from "@/lib/api";

// GET /api/training/phases/current — Return the active training phase
export const GET = withErrorHandling(async () => {
  const rows = await db
    .select()
    .from(schema.trainingPhases)
    .where(eq(schema.trainingPhases.status, "active"))
    .limit(1);

  if (rows.length === 0) {
    return error("No active training phase found.", 404);
  }

  return success(rows[0]);
});
