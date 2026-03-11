export const dynamic = 'force-dynamic';

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  success,
  error,
  withErrorHandling,
} from "@/lib/api";

// DELETE /api/nutrition/favorites/[id] — Delete a favorite meal by id
export const DELETE = withErrorHandling(async (_req, ctx) => {
  const { id } = await ctx.params;
  const favoriteId = parseInt(id, 10);

  if (isNaN(favoriteId)) {
    return error("Invalid favorite meal ID", 400);
  }

  const existing = await db
    .select()
    .from(schema.favoriteMeals)
    .where(eq(schema.favoriteMeals.id, favoriteId))
    .limit(1);

  if (existing.length === 0) {
    return error(`Favorite meal ${favoriteId} not found`, 404);
  }

  await db
    .delete(schema.favoriteMeals)
    .where(eq(schema.favoriteMeals.id, favoriteId));

  return success({ deleted: true, id: favoriteId });
});
