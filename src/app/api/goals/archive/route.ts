export const dynamic = 'force-dynamic';

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { success, error, serverError, nowISO, todayET } from "@/lib/api";
import { z } from "zod";

const archiveSchema = z.object({
  goalId: z.number().int(),
  reason: z.string().optional(),
});

// POST /api/goals/archive — Archive a goal
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = archiveSchema.parse(body);
    const now = nowISO();
    const today = todayET();

    // 1. Verify goal exists
    const goal = db
      .select()
      .from(schema.goals)
      .where(eq(schema.goals.id, data.goalId))
      .get();

    if (!goal) {
      return error("Goal not found.", 404);
    }

    if (goal.status === "archived") {
      return error("Goal is already archived.", 400);
    }

    const previousStatus = goal.status;

    // 2. Update goal status
    db.update(schema.goals)
      .set({
        status: "archived",
        updatedAt: now,
      })
      .where(eq(schema.goals.id, data.goalId))
      .run();

    // 3. Log transition in goal history
    db.insert(schema.goalHistory)
      .values({
        goalId: data.goalId,
        eventType: "archived",
        oldValue: previousStatus,
        newValue: "archived",
        reason:
          data.reason || "Archived via adaptive intelligence dashboard",
        eventDate: today,
        createdAt: now,
      })
      .run();

    return success({
      goalId: data.goalId,
      previousStatus,
      newStatus: "archived",
      archivedAt: now,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return error(
        err.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; "),
        400
      );
    }
    return serverError(err);
  }
}
