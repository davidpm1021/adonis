import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { nowISO } from "./api";

/**
 * Ensures a daily_log row exists for the given date and updates
 * the specified field. Creates the row if it doesn't exist.
 *
 * Used by workout, sleep, vitals, and supplement APIs to keep
 * the daily_log in sync with data logged in other tables.
 */
export async function syncDailyLog(
  date: string,
  field: keyof typeof schema.dailyLog.$inferInsert,
  value: number | string | null
) {
  const now = nowISO();

  const existing = await db
    .select()
    .from(schema.dailyLog)
    .where(eq(schema.dailyLog.date, date))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(schema.dailyLog)
      .set({ [field]: value, updatedAt: now })
      .where(eq(schema.dailyLog.date, date));
  } else {
    await db.insert(schema.dailyLog).values({
      date,
      [field]: value,
      createdAt: now,
      updatedAt: now,
    });
  }
}

/**
 * Checks supplement_log for the given date and determines if all
 * supplements are taken. If so, sets daily_log.supplementsTaken = 1.
 * If not all taken, sets it to 0.
 */
export async function syncSupplementsToDailyLog(date: string) {
  const supplements = await db
    .select()
    .from(schema.supplementLog)
    .where(eq(schema.supplementLog.date, date));

  if (supplements.length === 0) return;

  const allTaken = supplements.every((s) => s.taken === 1);
  await syncDailyLog(date, "supplementsTaken", allTaken ? 1 : 0);
}

/**
 * When the dashboard toggle marks supplements as taken/untaken,
 * sync that to individual supplement_log entries.
 */
export async function syncDailyLogToSupplements(date: string, taken: number) {
  // Get all supplement entries for this date
  const supplements = await db
    .select()
    .from(schema.supplementLog)
    .where(eq(schema.supplementLog.date, date));

  if (supplements.length === 0) return;

  // Bulk update all entries
  for (const supp of supplements) {
    await db
      .update(schema.supplementLog)
      .set({ taken })
      .where(eq(schema.supplementLog.id, supp.id));
  }
}
