import type Database from "better-sqlite3";

/**
 * Ensures all tables exist. Safe to call repeatedly (uses IF NOT EXISTS).
 * Called automatically on DB initialization so the app works with a fresh database.
 */
export function ensureTables(sqlite: Database.Database) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS user_profile (
      id INTEGER PRIMARY KEY DEFAULT 1,
      name TEXT,
      dob TEXT,
      sex TEXT,
      height_inches INTEGER,
      starting_weight REAL,
      goal_weight_low REAL,
      goal_weight_high REAL,
      medical_conditions TEXT,
      medications TEXT,
      allergies TEXT,
      sobriety_start_date TEXT,
      weekly_alcohol_spend REAL DEFAULT 0,
      weekly_alcohol_calories INTEGER DEFAULT 0,
      setup_complete INTEGER DEFAULT 0,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS streak_freezes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      streak_type TEXT NOT NULL,
      reason TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS streak_milestones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      streak_type TEXT NOT NULL,
      milestone INTEGER NOT NULL,
      achieved_date TEXT NOT NULL,
      celebrated INTEGER DEFAULT 0,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS daily_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT UNIQUE NOT NULL,
      morning_walk INTEGER DEFAULT 0,
      walk_duration_minutes INTEGER,
      strength_training INTEGER DEFAULT 0,
      ate_lunch_with_protein INTEGER DEFAULT 0,
      mobility_work INTEGER DEFAULT 0,
      supplements_taken INTEGER DEFAULT 0,
      alcohol_free INTEGER DEFAULT 1,
      energy INTEGER,
      mood INTEGER,
      stress INTEGER,
      soreness INTEGER,
      anxiety_level INTEGER,
      alcohol_craving INTEGER DEFAULT 0,
      alcohol_trigger TEXT,
      foam_rolling INTEGER DEFAULT 0,
      cold_exposure INTEGER DEFAULT 0,
      heat_exposure INTEGER DEFAULT 0,
      notes TEXT,
      wins TEXT,
      struggles TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS body_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      weight REAL,
      body_fat_percentage REAL,
      waist_inches REAL,
      chest_inches REAL,
      arm_inches REAL,
      thigh_inches REAL,
      neck_inches REAL,
      dexa_total_fat_pct REAL,
      dexa_lean_mass_lbs REAL,
      dexa_fat_mass_lbs REAL,
      dexa_visceral_fat_area REAL,
      dexa_bone_density REAL,
      navy_bf_estimate REAL,
      notes TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS lab_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      test_name TEXT NOT NULL,
      value REAL NOT NULL,
      unit TEXT NOT NULL,
      reference_low REAL,
      reference_high REAL,
      flag TEXT,
      notes TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS workouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      workout_type TEXT NOT NULL,
      duration_minutes INTEGER,
      rpe INTEGER,
      completed INTEGER DEFAULT 1,
      notes TEXT,
      coach_feedback TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_id INTEGER NOT NULL REFERENCES workouts(id),
      exercise_name TEXT NOT NULL,
      sets INTEGER,
      reps INTEGER,
      weight_lbs REAL,
      duration_seconds INTEGER,
      distance_steps INTEGER,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS nutrition_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      meal_type TEXT NOT NULL,
      description TEXT,
      calories REAL,
      protein_g REAL,
      carbs_g REAL,
      fat_g REAL,
      fiber_g REAL,
      source TEXT DEFAULT 'manual',
      ai_confidence REAL,
      notes TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS supplement_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      supplement_name TEXT NOT NULL,
      dose TEXT,
      taken INTEGER DEFAULT 0,
      time_of_day TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS sleep_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT UNIQUE NOT NULL,
      bedtime TEXT,
      wake_time TEXT,
      total_hours REAL,
      sleep_quality INTEGER,
      time_to_fall_asleep_minutes INTEGER,
      wake_ups INTEGER,
      bipap_used INTEGER DEFAULT 1,
      notes TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS ai_conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      target_value REAL,
      target_unit TEXT,
      target_date TEXT,
      current_value REAL,
      status TEXT DEFAULT 'active',
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS training_phases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phase_number INTEGER NOT NULL,
      phase_name TEXT NOT NULL,
      start_date TEXT,
      end_date TEXT,
      status TEXT DEFAULT 'active',
      prescribed_workouts TEXT,
      progression_rules TEXT,
      notes TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS nutrition_targets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      effective_date TEXT NOT NULL,
      calories_min INTEGER,
      calories_max INTEGER,
      protein_min INTEGER,
      protein_max INTEGER,
      carbs_min INTEGER,
      carbs_max INTEGER,
      fat_min INTEGER,
      fat_max INTEGER,
      fiber_min INTEGER,
      fiber_max INTEGER,
      rationale TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS goal_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      goal_id INTEGER NOT NULL REFERENCES goals(id),
      event_type TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      reason TEXT,
      event_date TEXT NOT NULL,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS weekly_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_start TEXT NOT NULL,
      week_end TEXT NOT NULL,
      report_content TEXT,
      key_metrics TEXT,
      ai_recommendations TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS favorite_meals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      meal_type TEXT,
      items TEXT,
      total_calories REAL,
      total_protein_g REAL,
      total_carbs_g REAL,
      total_fat_g REAL,
      total_fiber_g REAL,
      use_count INTEGER DEFAULT 0,
      last_used TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS nutrition_insights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      insight_type TEXT NOT NULL,
      content TEXT NOT NULL,
      data_range_start TEXT,
      data_range_end TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS calculated_markers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      marker_name TEXT NOT NULL,
      value REAL NOT NULL,
      formula TEXT,
      input_values TEXT,
      interpretation TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS preventive_care (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_name TEXT NOT NULL,
      category TEXT NOT NULL,
      status TEXT DEFAULT 'not_scheduled',
      due_date TEXT,
      completed_date TEXT,
      result TEXT,
      result_value TEXT,
      provider TEXT,
      notes TEXT,
      next_due TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS vitals_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      time_of_day TEXT,
      systolic INTEGER,
      diastolic INTEGER,
      resting_heart_rate INTEGER,
      spo2 REAL,
      notes TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS environment_checklist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item TEXT NOT NULL,
      category TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      completed_date TEXT,
      notes TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS food_parse_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      input_hash TEXT UNIQUE NOT NULL,
      input_text TEXT NOT NULL,
      parsed_result TEXT NOT NULL,
      hit_count INTEGER DEFAULT 1,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS ai_usage_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      feature TEXT NOT NULL,
      model TEXT NOT NULL,
      input_tokens INTEGER,
      output_tokens INTEGER,
      cached INTEGER DEFAULT 0,
      cost_estimate REAL,
      created_at TEXT
    );
  `);
}
