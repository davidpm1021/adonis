export const dynamic = 'force-dynamic';

import { success, error, withErrorHandling } from "@/lib/api";
import fs from "fs";
import path from "path";

const DB_PATH = process.env.DATABASE_URL || "./adonis.db";
const BACKUP_DIR = path.resolve("./backups");

// Ensure backup directory exists
function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

// ---------------------------------------------------------------------------
// POST /api/settings/backup — Create a database backup
// ---------------------------------------------------------------------------
export const POST = withErrorHandling(async () => {
  const dbPath = path.resolve(DB_PATH);

  if (!fs.existsSync(dbPath)) {
    return error("Database file not found", 404);
  }

  ensureBackupDir();

  const now = new Date();
  const timestamp = now
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19);
  const backupFilename = `adonis-backup-${timestamp}.db`;
  const backupPath = path.join(BACKUP_DIR, backupFilename);

  // Copy the main database file
  fs.copyFileSync(dbPath, backupPath);

  // Also copy WAL file if it exists
  const walPath = dbPath + "-wal";
  if (fs.existsSync(walPath)) {
    fs.copyFileSync(walPath, backupPath + "-wal");
  }

  // Also copy SHM file if it exists
  const shmPath = dbPath + "-shm";
  if (fs.existsSync(shmPath)) {
    fs.copyFileSync(shmPath, backupPath + "-shm");
  }

  const stats = fs.statSync(backupPath);

  return success({
    filename: backupFilename,
    path: backupPath,
    sizeBytes: stats.size,
    createdAt: now.toISOString(),
  });
});

// ---------------------------------------------------------------------------
// GET /api/settings/backup — List existing backups
// ---------------------------------------------------------------------------
export const GET = withErrorHandling(async () => {
  ensureBackupDir();

  const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith(".db"));

  const backups = files
    .map((filename) => {
      const filePath = path.join(BACKUP_DIR, filename);
      const stats = fs.statSync(filePath);
      return {
        filename,
        path: filePath,
        sizeBytes: stats.size,
        createdAt: stats.mtime.toISOString(),
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)); // newest first

  return success({
    backups,
    backupDirectory: BACKUP_DIR,
    totalBackups: backups.length,
    totalSizeBytes: backups.reduce((sum, b) => sum + b.sizeBytes, 0),
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/settings/backup?file=filename — Delete a specific backup
// ---------------------------------------------------------------------------
export const DELETE = withErrorHandling(async (req) => {
  const url = new URL(req.url);
  const filename = url.searchParams.get("file");

  if (!filename) {
    return error("Query parameter 'file' is required", 400);
  }

  // Sanitize: prevent directory traversal
  const sanitized = path.basename(filename);
  if (!sanitized.endsWith(".db")) {
    return error("Invalid backup filename", 400);
  }

  const filePath = path.join(BACKUP_DIR, sanitized);

  if (!fs.existsSync(filePath)) {
    return error("Backup file not found", 404);
  }

  // Delete the backup and any WAL/SHM files
  fs.unlinkSync(filePath);
  const walPath = filePath + "-wal";
  if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
  const shmPath = filePath + "-shm";
  if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);

  return success({
    deleted: sanitized,
    message: `Backup ${sanitized} deleted successfully`,
  });
});
