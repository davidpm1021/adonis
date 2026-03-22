export const dynamic = 'force-dynamic';

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  success,
  withErrorHandling,
  validateBody,
  nowISO,
} from "@/lib/api";
import { encryptPassword } from "@/lib/garmin";

const garminAuthSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(1, "Password is required"),
});

// POST /api/garmin/auth — Connect Garmin account
export const POST = withErrorHandling(async (req) => {
  const data = await validateBody(req, garminAuthSchema);
  const now = nowISO();
  const encryptedPassword = encryptPassword(data.password);

  // Check if config row exists
  const existing = await db
    .select()
    .from(schema.garminSyncConfig)
    .where(eq(schema.garminSyncConfig.id, 1))
    .limit(1);

  if (existing.length > 0) {
    const result = await db
      .update(schema.garminSyncConfig)
      .set({
        enabled: 1,
        garminEmail: data.email,
        garminPasswordEncrypted: encryptedPassword,
        updatedAt: now,
      })
      .where(eq(schema.garminSyncConfig.id, 1))
      .returning();

    return success({
      connected: true,
      email: result[0].garminEmail,
    });
  } else {
    const result = await db
      .insert(schema.garminSyncConfig)
      .values({
        enabled: 1,
        garminEmail: data.email,
        garminPasswordEncrypted: encryptedPassword,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return success({
      connected: true,
      email: result[0].garminEmail,
    }, 201);
  }
});

// DELETE /api/garmin/auth — Disconnect Garmin account
export const DELETE = withErrorHandling(async () => {
  const existing = await db
    .select()
    .from(schema.garminSyncConfig)
    .where(eq(schema.garminSyncConfig.id, 1))
    .limit(1);

  if (existing.length === 0) {
    return success({ connected: false });
  }

  const now = nowISO();

  await db
    .update(schema.garminSyncConfig)
    .set({
      enabled: 0,
      garminEmail: null,
      garminPasswordEncrypted: null,
      lastSyncAt: null,
      updatedAt: now,
    })
    .where(eq(schema.garminSyncConfig.id, 1));

  return success({ connected: false });
});
