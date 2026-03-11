import { db } from "@/db";
import * as schema from "@/db/schema";
import { sql, and, gte, lte } from "drizzle-orm";
import { success, error, withErrorHandling, nowISO, todayET } from "@/lib/api";
import { streakFreezeSchema } from "@/lib/validations";
import { MAX_STREAK_FREEZES_PER_MONTH } from "@/lib/constants";

// GET /api/streaks/freeze — Get freeze history and availability
export const GET = withErrorHandling(async () => {
  const today = todayET();
  const monthStart = today.slice(0, 7) + "-01";
  const monthEnd = today.slice(0, 7) + "-31";

  const freezes = await db
    .select()
    .from(schema.streakFreezes)
    .where(
      and(
        gte(schema.streakFreezes.date, monthStart),
        lte(schema.streakFreezes.date, monthEnd)
      )
    );

  return success({
    freezesUsedThisMonth: freezes.length,
    freezesAvailable: Math.max(0, MAX_STREAK_FREEZES_PER_MONTH - freezes.length),
    maxPerMonth: MAX_STREAK_FREEZES_PER_MONTH,
    freezes,
  });
});

// POST /api/streaks/freeze — Use a streak freeze
export const POST = withErrorHandling(async (req) => {
  const body = await req.json();
  const data = streakFreezeSchema.parse(body);
  const now = nowISO();
  const today = todayET();

  // Check monthly limit
  const monthStart = today.slice(0, 7) + "-01";
  const monthEnd = today.slice(0, 7) + "-31";

  const usedThisMonth = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.streakFreezes)
    .where(
      and(
        gte(schema.streakFreezes.date, monthStart),
        lte(schema.streakFreezes.date, monthEnd)
      )
    );

  const used = usedThisMonth[0]?.count ?? 0;
  if (used >= MAX_STREAK_FREEZES_PER_MONTH) {
    return error(
      `Maximum ${MAX_STREAK_FREEZES_PER_MONTH} streak freezes per month. All used.`,
      429
    );
  }

  await db
    .insert(schema.streakFreezes)
    .values({
      date: data.date,
      streakType: data.streakType,
      reason: data.reason,
      createdAt: now,
    })
    .run();

  return success({
    frozen: true,
    freezesRemaining: MAX_STREAK_FREEZES_PER_MONTH - used - 1,
  });
});
