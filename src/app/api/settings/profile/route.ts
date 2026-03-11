export const dynamic = 'force-dynamic';

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  success,
  error,
  withErrorHandling,
  nowISO,
} from "@/lib/api";
import { userProfileSchema } from "@/lib/validations";

// GET /api/settings/profile — Return user profile (id=1)
export const GET = withErrorHandling(async () => {
  const rows = await db
    .select()
    .from(schema.userProfile)
    .where(eq(schema.userProfile.id, 1))
    .limit(1);

  if (rows.length === 0) {
    return error("User profile not found.", 404);
  }

  return success(rows[0]);
});

// PUT /api/settings/profile — Update user profile fields
export const PUT = withErrorHandling(async (req) => {
  const body = await req.json();
  const data = userProfileSchema.partial().parse(body);
  const now = nowISO();

  // Check that the profile exists
  const existing = await db
    .select()
    .from(schema.userProfile)
    .where(eq(schema.userProfile.id, 1))
    .limit(1);

  if (existing.length === 0) {
    return error("User profile not found.", 404);
  }

  const result = await db
    .update(schema.userProfile)
    .set({
      ...data,
      updatedAt: now,
    })
    .where(eq(schema.userProfile.id, 1))
    .returning();

  return success(result[0]);
});
