export const dynamic = 'force-dynamic';

import { db } from "@/db";
import * as schema from "@/db/schema";
import { desc } from "drizzle-orm";
import {
  success,
  withErrorHandling,
  parseBody,
  nowISO,
} from "@/lib/api";
import { favoriteMealSchema } from "@/lib/validations";

// GET /api/nutrition/favorites — List all favorite meals ordered by usage
export const GET = withErrorHandling(async () => {
  const rows = await db
    .select()
    .from(schema.favoriteMeals)
    .orderBy(desc(schema.favoriteMeals.useCount));

  return success(rows);
});

// POST /api/nutrition/favorites — Create a new favorite meal
export const POST = withErrorHandling(async (req) => {
  const data = await parseBody(req, favoriteMealSchema);

  const now = nowISO();

  const result = await db
    .insert(schema.favoriteMeals)
    .values({
      name: data.name,
      mealType: data.mealType,
      items: data.items,
      totalCalories: data.totalCalories,
      totalProteinG: data.totalProteinG,
      totalCarbsG: data.totalCarbsG,
      totalFatG: data.totalFatG,
      totalFiberG: data.totalFiberG,
      useCount: 0,
      lastUsed: null,
      createdAt: now,
    })
    .returning();

  return success(result[0], 201);
});
