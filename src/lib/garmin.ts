import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { nowISO } from "./api";
import crypto from "crypto";

const ENCRYPTION_KEY = process.env.GARMIN_ENCRYPTION_KEY || process.env.ANTHROPIC_API_KEY || "adonis-default-key";

export function encryptPassword(plain: string): string {
  const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(plain, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

export function decryptPassword(encrypted: string): string {
  const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
  const [ivHex, data] = encrypted.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(data, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * Sync Garmin daily summary for a given date.
 * Uses the garmin-connect npm package if installed, otherwise returns a placeholder.
 */
export async function syncGarminDay(date: string): Promise<{ synced: boolean; error?: string }> {
  const rows = await db
    .select()
    .from(schema.garminSyncConfig)
    .where(eq(schema.garminSyncConfig.id, 1))
    .limit(1);

  const config = rows[0];

  if (!config?.enabled || !config.garminEmail || !config.garminPasswordEncrypted) {
    return { synced: false, error: "Garmin not configured" };
  }

  try {
    // Dynamic import to handle case where garmin-connect is not installed
    const { GarminConnect } = await import("garmin-connect");
    const client = new GarminConnect({
      username: config.garminEmail,
      password: decryptPassword(config.garminPasswordEncrypted),
    });
    await client.login();

    const summary = await client.getDailySummary(date);
    if (!summary) return { synced: false, error: "No data for date" };

    const now = nowISO();

    // Check for existing record for upsert
    const existingRows = await db
      .select()
      .from(schema.garminDailySummary)
      .where(eq(schema.garminDailySummary.date, date))
      .limit(1);

    const existing = existingRows[0];

    // Helper to safely extract a number from the Garmin API response
    const num = (v: unknown): number | null =>
      typeof v === "number" ? v : null;

    const garminData = {
      date,
      totalSteps: num(summary.totalSteps),
      stepGoal: num(summary.dailyStepGoal),
      floorsClimbed: num(summary.floorsAscended),
      activeMinutes: typeof summary.activeSeconds === "number"
        ? Math.round(summary.activeSeconds / 60)
        : null,
      caloriesTotal: num(summary.totalKilocalories),
      caloriesActive: num(summary.activeKilocalories),
      distanceMeters: num(summary.totalDistanceMeters),
      averageStress: num(summary.averageStressLevel),
      maxStress: num(summary.maxStressLevel),
      bodyBatteryHigh: num(summary.bodyBatteryHighestValue),
      bodyBatteryLow: num(summary.bodyBatteryLowestValue),
      averageHr: num(summary.restingHeartRate),
      maxHr: num(summary.maxHeartRate),
      minHr: num(summary.minHeartRate),
      restingHr: num(summary.restingHeartRate),
      spo2Average: num(summary.averageSpo2),
      rawJson: JSON.stringify(summary),
      syncedAt: now,
    };

    if (existing) {
      await db
        .update(schema.garminDailySummary)
        .set(garminData)
        .where(eq(schema.garminDailySummary.id, existing.id));
    } else {
      await db
        .insert(schema.garminDailySummary)
        .values({ ...garminData, createdAt: now });
    }

    // Auto-populate vitals_log with Garmin data (don't overwrite manual entries)
    if (garminData.restingHr || garminData.spo2Average) {
      const manualVitalsRows = await db
        .select()
        .from(schema.vitalsLog)
        .where(eq(schema.vitalsLog.date, date))
        .limit(1);

      const manualVitals = manualVitalsRows[0];

      if (!manualVitals || manualVitals.source === "garmin") {
        // Safe to upsert Garmin vitals
        if (manualVitals) {
          await db
            .update(schema.vitalsLog)
            .set({
              restingHeartRate: garminData.restingHr,
              spo2: garminData.spo2Average,
              source: "garmin",
            })
            .where(eq(schema.vitalsLog.id, manualVitals.id));
        } else {
          await db
            .insert(schema.vitalsLog)
            .values({
              date,
              restingHeartRate: garminData.restingHr,
              spo2: garminData.spo2Average,
              source: "garmin",
              createdAt: now,
            });
        }
      }
    }

    // Update last sync time
    await db
      .update(schema.garminSyncConfig)
      .set({ lastSyncAt: now, updatedAt: now })
      .where(eq(schema.garminSyncConfig.id, 1));

    return { synced: true };
  } catch (err) {
    console.error("[garmin sync] Error:", err);
    return { synced: false, error: err instanceof Error ? err.message : "Sync failed" };
  }
}
