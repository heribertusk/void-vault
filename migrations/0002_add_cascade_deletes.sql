-- Migration 0002: Add ON DELETE CASCADE to all foreign key constraints
--
-- SQLite does not support ALTER TABLE to modify foreign key constraints.
-- To add ON DELETE CASCADE, we must recreate tables with temporary copies.
--
-- Dependency order (children before parents):
-- 1. upload_log -> trusted_devices
-- 2. sessions, pending_devices, trusted_devices -> users
-- 3. vault_files -> users

-- Step 1: upload_log (leaf table, references trusted_devices)
CREATE TABLE upload_log_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES trusted_devices(id) ON DELETE CASCADE
);

INSERT INTO upload_log_new SELECT * FROM upload_log;
DROP TABLE upload_log;
ALTER TABLE upload_log_new RENAME TO upload_log;

-- Step 2: sessions (references users)
CREATE TABLE sessions_new (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO sessions_new SELECT * FROM sessions;
DROP TABLE sessions;
ALTER TABLE sessions_new RENAME TO sessions;

-- Step 3: pending_devices (references users)
CREATE TABLE pending_devices_new (
    id TEXT PRIMARY KEY,
    device_name TEXT NOT NULL,
    device_fingerprint TEXT NOT NULL UNIQUE,
    requested_by TEXT NOT NULL,
    status TEXT CHECK(status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO pending_devices_new SELECT * FROM pending_devices;
DROP TABLE pending_devices;
ALTER TABLE pending_devices_new RENAME TO pending_devices;

-- Step 4: trusted_devices (references users)
-- Also cascades to upload_log via Step 1
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

INSERT INTO trusted_devices_new SELECT * FROM trusted_devices;
DROP TABLE trusted_devices;
ALTER TABLE trusted_devices_new RENAME TO trusted_devices;

-- Step 5: vault_files (references users)
-- Note: This does NOT delete files from R2, only D1 metadata
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

INSERT INTO vault_files_new SELECT * FROM vault_files;
DROP TABLE vault_files;
ALTER TABLE vault_files_new RENAME TO vault_files;

-- Post-migration cascade behaviors:
-- DELETE FROM users -> auto-deletes: sessions, pending_devices, trusted_devices, vault_files
-- DELETE FROM trusted_devices -> auto-deletes: upload_log entries
