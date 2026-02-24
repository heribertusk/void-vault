-- Users table (admin authentication)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT 1,
    unlimited_upload BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Pending device requests (for approval workflow)
CREATE TABLE IF NOT EXISTS pending_devices (
    id TEXT PRIMARY KEY,
    device_name TEXT NOT NULL,
    device_fingerprint TEXT NOT NULL UNIQUE,
    requested_by TEXT NOT NULL,
    status TEXT CHECK(status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (requested_by) REFERENCES users(id)
);

-- Trusted devices
CREATE TABLE IF NOT EXISTS trusted_devices (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    device_name TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    device_fingerprint TEXT UNIQUE NOT NULL,
    status TEXT CHECK(status IN ('active', 'revoked')) DEFAULT 'active',
    last_used DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- File type whitelist (configurable)
CREATE TABLE IF NOT EXISTS file_type_whitelist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    extension TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 1
);

-- Upload rate limiting
CREATE TABLE IF NOT EXISTS upload_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES trusted_devices(id)
);

-- Vault files
CREATE TABLE IF NOT EXISTS vault_files (
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
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Seed file type whitelist
INSERT OR IGNORE INTO file_type_whitelist (extension, category) VALUES
('.pdf', 'document'),
('.doc', 'document'),
('.docx', 'document'),
('.txt', 'document'),
('.md', 'document'),
('.jpg', 'image'),
('.jpeg', 'image'),
('.png', 'image'),
('.gif', 'image'),
('.webp', 'image'),
('.zip', 'archive'),
('.tar', 'archive'),
('.gz', 'archive'),
('.apk', 'apk'),
('.encrypted', 'encrypted');
