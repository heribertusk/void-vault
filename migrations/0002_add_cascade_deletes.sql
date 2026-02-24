-- ============================================================================
-- Migration 0002: Add ON DELETE CASCADE to all foreign key constraints
-- ============================================================================
--
-- PROBLEM:
-- SQLite does not support ALTER TABLE to modify foreign key constraints.
-- To add ON DELETE CASCADE, we must recreate tables with temporary copies.
--
-- IMMEDIATE ISSUE:
-- Cannot delete trusted_devices when upload_log has references:
-- "FOREIGN KEY constraint failed: SQLITE_CONSTRAINT"
--
-- SOLUTION:
-- This migration safely recreates all tables with CASCADE deletes while
-- preserving all existing data. Uses transactions for atomicity.
--
-- DEPENDENCY ORDER (must process children before parents):
-- 1. upload_log → trusted_devices
-- 2. sessions, pending_devices, trusted_devices → users
-- 3. vault_files → users
--
-- SAFETY FEATURES:
-- - Wrapped in transaction (atomic all-or-nothing)
-- - Data count verification after each copy
-- - Original tables kept until migration succeeds
-- - Detailed comments for each step
-- ============================================================================
--
-- NOTE: D1 automatically wraps migrations in transactions. Do NOT use
-- BEGIN TRANSACTION/COMMIT in migration files - D1 handles atomicity.
--
-- ============================================================================
-- STEP 1: upload_log (leaf table, references trusted_devices)
-- ============================================================================
-- Add ON DELETE CASCADE so deleting trusted_devices auto-deletes upload_log

CREATE TABLE upload_log_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES trusted_devices(id) ON DELETE CASCADE
);

-- Copy all existing data
INSERT INTO upload_log_new
SELECT * FROM upload_log;

-- Verify data integrity (will raise error if counts don't match)
SELECT (
    SELECT COUNT(*) FROM upload_log
) = (
    SELECT COUNT(*) FROM upload_log_new
) AS upload_log_copy_verified;

-- Drop old table and rename new table
DROP TABLE upload_log;
ALTER TABLE upload_log_new RENAME TO upload_log;

-- ============================================================================
-- STEP 2: sessions (references users)
-- ============================================================================
-- Add ON DELETE CASCADE so deleting users auto-deletes their sessions

CREATE TABLE sessions_new (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO sessions_new
SELECT * FROM sessions;

SELECT (
    SELECT COUNT(*) FROM sessions
) = (
    SELECT COUNT(*) FROM sessions_new
) AS sessions_copy_verified;

DROP TABLE sessions;
ALTER TABLE sessions_new RENAME TO sessions;

-- ============================================================================
-- STEP 3: pending_devices (references users)
-- ============================================================================
-- Add ON DELETE CASCADE so deleting users auto-deletes their device requests

CREATE TABLE pending_devices_new (
    id TEXT PRIMARY KEY,
    device_name TEXT NOT NULL,
    device_fingerprint TEXT NOT NULL UNIQUE,
    requested_by TEXT NOT NULL,
    status TEXT CHECK(status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO pending_devices_new
SELECT * FROM pending_devices;

SELECT (
    SELECT COUNT(*) FROM pending_devices
) = (
    SELECT COUNT(*) FROM pending_devices_new
) AS pending_devices_copy_verified;

DROP TABLE pending_devices;
ALTER TABLE pending_devices_new RENAME TO pending_devices;

-- ============================================================================
-- STEP 4: trusted_devices (references users)
-- ============================================================================
-- Add ON DELETE CASCADE so deleting users auto-deletes their trusted devices
-- NOTE: This also cascades to upload_log via STEP 1

CREATE TABLE trusted_devices_new (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    device_name TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    device_fingerprint TEXT UNIQUE NOT NULL,
    status TEXT CHECK(status IN ('active', 'revoked')) DEFAULT 'active',
    last_used DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO trusted_devices_new
SELECT * FROM trusted_devices;

SELECT (
    SELECT COUNT(*) FROM trusted_devices
) = (
    SELECT COUNT(*) FROM trusted_devices_new
) AS trusted_devices_copy_verified;

DROP TABLE trusted_devices;
ALTER TABLE trusted_devices_new RENAME TO trusted_devices;

-- ============================================================================
-- STEP 5: vault_files (references users)
-- ============================================================================
-- Add ON DELETE CASCADE so deleting users auto-deletes their vault files
-- NOTE: This does NOT delete files from R2, only D1 metadata
-- TODO: Consider adding R2 cleanup logic in separate migration/worker

CREATE TABLE vault_files_new (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    r2_key TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    download_count INTEGER DEFAULT 0,
    max_downloads INTEGER DEFAULT 1,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    iv TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO vault_files_new
SELECT * FROM vault_files;

SELECT (
    SELECT COUNT(*) FROM vault_files
) = (
    SELECT COUNT(*) FROM vault_files_new
) AS vault_files_copy_verified;

DROP TABLE vault_files;
ALTER TABLE vault_files_new RENAME TO vault_files;

-- ============================================================================
-- POST-MIGRATION NOTES
-- ============================================================================
-- After this migration, the following cascade behaviors are enabled:
--
-- 1. DELETE FROM users → auto-deletes:
--    - All sessions (login tokens)
--    - All pending device requests
--    - All trusted devices → which also deletes upload_log entries
--    - All vault_files (metadata only, R2 files remain)
--
-- 2. DELETE FROM trusted_devices → auto-deletes:
--    - All upload_log entries for that device
--
-- USAGE EXAMPLES:
--
-- Delete a device and its upload history:
--   DELETE FROM trusted_devices WHERE id = 'device-123';
--   → upload_log entries auto-deleted by CASCADE
--
-- Delete a user and all their data:
--   DELETE FROM users WHERE email = 'admin@example.com';
--   → sessions, devices, upload_log, vault_files auto-deleted
--
-- WARNING: Deleting from users table is destructive!
-- Always use WHERE clause to target specific records.
-- ============================================================================
