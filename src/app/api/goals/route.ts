import { db } from "@/db";
import * as schema from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { success, error, withErrorHandling, nowISO, todayET } from "@/lib/api";
import { z } from "zod";

// GET /api/goals — List all goals, optionally filtered by status
export const GET = withErrorHandling(async (req) => {
  const url = new URL(req.url);
  const status = url.searchParams.get("status");

  let query = db.select().from(schema.goals).orderBy(desc(schema.goals.createdAt));

  if (status) {
    const rows = db
      .select()
      .from(schema.goals)
      .where(eq(schema.goals.status, status))
      .orderBy(desc(schema.goals.createdAt))
      .all();
    return success(rows);
  }

  const rows = query.all();
  return success(rows);
});

const createGoalSchema = z.object({
  category: z.string().min(1),
  description: z.string().min(1),
  targetValue: z.number().optional().nullable(),
  targetUnit: z.string().optional().nullable(),
  targetDate: z.string().optional().nullable(),
  currentValue: z.number().optional().nullable(),
  status: z.enum(["active", "achieved", "archived"]).optional().default("active"),
});

// POST /api/goals — Create a new goal
export const POST = withErrorHandling(async (req) => {
  const body = await req.json();
  const data = createGoalSchema.parse(body);
  const now = nowISO();
  const today = todayET();

  const result = await db
    .insert(schema.goals)
    .values({
      category: data.category,
      description: data.description,
      targetValue: data.targetValue ?? null,
      targetUnit: data.targetUnit ?? null,
      targetDate: data.targetDate ?? null,
      currentValue: data.currentValue ?? null,
      status: data.status,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  const newGoal = result[0];

  // Log creation in goal history
  db.insert(schema.goalHistory)
    .values({
      goalId: newGoal.id,
      eventType: "created",
      oldValue: null,
      newValue: JSON.stringify({
        category: data.category,
        description: data.description,
        targetValue: data.targetValue,
      }),
      reason: "Goal created",
      eventDate: today,
      createdAt: now,
    })
    .run();

  return success(newGoal, 201);
});
