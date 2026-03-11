import { db } from "@/db";
import * as schema from "@/db/schema";
import { success, withErrorHandling } from "@/lib/api";
import { NextResponse } from "next/server";

// Table registry: maps query-param names to drizzle table references
const TABLE_MAP = {
  user_profile: schema.userProfile,
  daily_log: schema.dailyLog,
  body_metrics: schema.bodyMetrics,
  lab_results: schema.labResults,
  workouts: schema.workouts,
  exercises: schema.exercises,
  nutrition_log: schema.nutritionLog,
  supplement_log: schema.supplementLog,
  sleep_log: schema.sleepLog,
  ai_conversations: schema.aiConversations,
  goals: schema.goals,
  training_phases: schema.trainingPhases,
  nutrition_targets: schema.nutritionTargets,
  goal_history: schema.goalHistory,
  weekly_reports: schema.weeklyReports,
  favorite_meals: schema.favoriteMeals,
  nutrition_insights: schema.nutritionInsights,
  calculated_markers: schema.calculatedMarkers,
  preventive_care: schema.preventiveCare,
  vitals_log: schema.vitalsLog,
  environment_checklist: schema.environmentChecklist,
  ai_usage_log: schema.aiUsageLog,
} as const;

type TableName = keyof typeof TABLE_MAP;

const ALL_TABLE_NAMES = Object.keys(TABLE_MAP) as TableName[];

// ---------------------------------------------------------------------------
// GET /api/settings/export?format=json|csv&tables=daily_log,body_metrics
// ---------------------------------------------------------------------------
export const GET = withErrorHandling(async (req) => {
  const url = new URL(req.url);
  const format = url.searchParams.get("format") || "json";
  const tablesParam = url.searchParams.get("tables");

  // Determine which tables to export
  const tableNames: TableName[] = tablesParam
    ? (tablesParam.split(",").filter((t) => t in TABLE_MAP) as TableName[])
    : ALL_TABLE_NAMES;

  if (tableNames.length === 0) {
    return NextResponse.json(
      { success: false, error: "No valid table names provided" },
      { status: 400 },
    );
  }

  // Fetch data from all requested tables
  const data: Record<string, unknown[]> = {};
  for (const name of tableNames) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data[name] = await db.select().from(TABLE_MAP[name] as any);
  }

  const dateStamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19);

  if (format === "csv") {
    // Build a multi-section CSV text file with clear table separators
    const sections: string[] = [];

    for (const [tableName, rows] of Object.entries(data)) {
      sections.push(`\n${"=".repeat(60)}`);
      sections.push(`TABLE: ${tableName}`);
      sections.push(`ROWS: ${rows.length}`);
      sections.push(`${"=".repeat(60)}`);

      if (rows.length === 0) {
        sections.push("(no data)");
        continue;
      }

      // Extract column headers from the first row
      const headers = Object.keys(rows[0] as Record<string, unknown>);
      sections.push(headers.map(escapeCsvField).join(","));

      // Write each row
      for (const row of rows) {
        const record = row as Record<string, unknown>;
        const values = headers.map((h) => escapeCsvField(String(record[h] ?? "")));
        sections.push(values.join(","));
      }
    }

    const csvContent = sections.join("\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="adonis-export-${dateStamp}.csv"`,
      },
    });
  }

  // Default: JSON format
  const exportPayload = {
    exportedAt: new Date().toISOString(),
    tablesExported: tableNames,
    ...data,
  };

  const jsonContent = JSON.stringify(exportPayload, null, 2);

  return new NextResponse(jsonContent, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="adonis-export-${dateStamp}.json"`,
    },
  });
});

// Keep the legacy POST endpoint for backward compatibility
export const POST = withErrorHandling(async () => {
  const data = {
    exportedAt: new Date().toISOString(),
    userProfile: await db.select().from(schema.userProfile),
    dailyLogs: await db.select().from(schema.dailyLog),
    bodyMetrics: await db.select().from(schema.bodyMetrics),
    labResults: await db.select().from(schema.labResults),
    workouts: await db.select().from(schema.workouts),
    exercises: await db.select().from(schema.exercises),
    nutritionLog: await db.select().from(schema.nutritionLog),
    supplementLog: await db.select().from(schema.supplementLog),
    sleepLog: await db.select().from(schema.sleepLog),
    aiConversations: await db.select().from(schema.aiConversations),
    goals: await db.select().from(schema.goals),
    trainingPhases: await db.select().from(schema.trainingPhases),
    nutritionTargets: await db.select().from(schema.nutritionTargets),
    goalHistory: await db.select().from(schema.goalHistory),
    weeklyReports: await db.select().from(schema.weeklyReports),
    favoriteMeals: await db.select().from(schema.favoriteMeals),
    nutritionInsights: await db.select().from(schema.nutritionInsights),
    calculatedMarkers: await db.select().from(schema.calculatedMarkers),
    preventiveCare: await db.select().from(schema.preventiveCare),
    vitalsLog: await db.select().from(schema.vitalsLog),
    environmentChecklist: await db.select().from(schema.environmentChecklist),
    aiUsageLog: await db.select().from(schema.aiUsageLog),
  };

  return success(data);
});

// ---------------------------------------------------------------------------
// CSV Helper
// ---------------------------------------------------------------------------
function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
