import { db } from "@/db";
import * as schema from "@/db/schema";
import { success, error, serverError, nowISO, todayET } from "@/lib/api";
import { z } from "zod";

const applySchema = z.object({
  calories_min: z.number().int().min(0),
  calories_max: z.number().int().min(0),
  protein_min: z.number().int().min(0),
  protein_max: z.number().int().min(0),
  carbs_min: z.number().int().min(0),
  carbs_max: z.number().int().min(0),
  fat_min: z.number().int().min(0),
  fat_max: z.number().int().min(0),
  fiber_min: z.number().int().min(0),
  fiber_max: z.number().int().min(0),
  rationale: z.string().optional(),
});

// POST /api/targets/nutrition/apply — Apply proposed nutrition target changes
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = applySchema.parse(body);
    const now = nowISO();
    const today = todayET();

    // Create a new nutrition targets row (historical tracking)
    const result = await db
      .insert(schema.nutritionTargets)
      .values({
        effectiveDate: today,
        caloriesMin: data.calories_min,
        caloriesMax: data.calories_max,
        proteinMin: data.protein_min,
        proteinMax: data.protein_max,
        carbsMin: data.carbs_min,
        carbsMax: data.carbs_max,
        fatMin: data.fat_min,
        fatMax: data.fat_max,
        fiberMin: data.fiber_min,
        fiberMax: data.fiber_max,
        rationale: data.rationale || "Adjusted via adaptive intelligence evaluation",
        createdAt: now,
      })
      .returning();

    return success(result[0], 201);
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
