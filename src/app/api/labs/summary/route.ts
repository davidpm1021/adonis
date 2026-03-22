export const dynamic = 'force-dynamic';

import { db } from "@/db";
import { sql } from "drizzle-orm";
import { success, withErrorHandling } from "@/lib/api";

// GET /api/labs/summary — Return latest value per unique test_name, ordered alphabetically
export const GET = withErrorHandling(async () => {
  // Use raw SQL with a subquery to get the most recent lab result per test_name.
  // For each test_name, we select the row with the latest date.
  // If there are ties on date for the same test_name, we take the highest id.
  const result = await db.execute(
    sql.raw(
      `SELECT DISTINCT ON (lr.test_name) lr.*
       FROM lab_results lr
       ORDER BY lr.test_name ASC, lr.date DESC, lr.id DESC`
    )
  );

  return success(result.rows);
});
