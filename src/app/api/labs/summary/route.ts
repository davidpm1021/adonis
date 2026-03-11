import { sqlite } from "@/db";
import { success, withErrorHandling } from "@/lib/api";

// GET /api/labs/summary — Return latest value per unique test_name, ordered alphabetically
export const GET = withErrorHandling(async () => {
  // Use raw SQL with a subquery to get the most recent lab result per test_name.
  // For each test_name, we select the row with the latest date.
  // If there are ties on date for the same test_name, we take the highest id.
  const rows = sqlite
    .prepare(
      `SELECT lr.*
       FROM lab_results lr
       INNER JOIN (
         SELECT test_name, MAX(date) AS max_date
         FROM lab_results
         GROUP BY test_name
       ) latest
         ON lr.test_name = latest.test_name
        AND lr.date = latest.max_date
       GROUP BY lr.test_name
       HAVING lr.id = MAX(lr.id)
       ORDER BY lr.test_name ASC`
    )
    .all();

  return success(rows);
});
