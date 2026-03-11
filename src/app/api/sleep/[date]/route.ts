import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  success,
  error,
  withErrorHandling,
} from "@/lib/api";

// GET /api/sleep/[date] — Get sleep log for a specific date
export const GET = withErrorHandling(async (_req, ctx) => {
  const { date } = await ctx.params;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return error("Invalid date format. Use YYYY-MM-DD.", 400);
  }

  const rows = await db
    .select()
    .from(schema.sleepLog)
    .where(eq(schema.sleepLog.date, date))
    .limit(1);

  if (rows.length === 0) {
    return error(`No sleep log found for ${date}.`, 404);
  }

  return success(rows[0]);
});

// DELETE /api/sleep/[date] — Delete sleep log for a specific date
export const DELETE = withErrorHandling(async (_req, ctx) => {
  const { date } = await ctx.params;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return error("Invalid date format. Use YYYY-MM-DD.", 400);
  }

  const deleted = await db
    .delete(schema.sleepLog)
    .where(eq(schema.sleepLog.date, date))
    .returning();

  if (deleted.length === 0) {
    return error(`No sleep log found for ${date}.`, 404);
  }

  return success({ deleted: deleted[0] });
});
