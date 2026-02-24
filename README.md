# VoidVault

Secure file transfer system with zero-knowledge encryption and trusted device verification.

## Features

### Zero-Knowledge Encryption
- Client-side AES-GCM encryption with random IV per file
- Decryption key embedded only in URL fragment (never stored server-side)
- Files encrypted before upload, decrypted only by recipient

### Trusted Device System
- Device registration requires admin approval
- Active device token required for uploads (validated against D1 database)
- Remote device revocation (instant at Edge)
- Device fingerprinting for trust validation

### Secure File Transfer
- Self-destructing links with TTL (1 hour to 7 days)
- Download limit enforcement (1 to unlimited)
- Automatic file expiration and R2 cleanup
- Encrypted storage in Cloudflare R2

### Security Features
- PBKDF2-SHA256 password hashing (100k iterations)
- Token hashing before database storage
- Rate limiting (10 uploads/hour per device)
- File type validation (whitelist approach)
- No keys/secrets logged or exposed

## Tech Stack

- **Frontend**: Vue 3 + Vite + TailwindCSS (PWA)
- **Backend**: Cloudflare Pages Functions (TypeScript)
- **Storage**: Cloudflare R2 (encrypted files)
- **Database**: Cloudflare D1 (SQLite)
- **Build**: Bun + Wrangler

## Quick Start

### Prerequisites
```bash
# Install dependencies
bun install

# Login to Cloudflare
wrangler login
```

### Initial Setup

1. **Create D1 Database**
```bash
wrangler d1 create void-vault-db
# Copy database_id to wrangler.toml

# Run migrations
bun run cf:d1:migrate
```

2. **Create R2 Bucket**
```bash
wrangler r2 bucket create void-vault-storage
```

3. **Set Environment Secrets**
```bash
# Production
wrangler pages secret put JWT_SECRET --project-name=void-vault

# Preview
wrangler pages secret put JWT_SECRET --project-name=void-vault --env preview
```

### Development

```bash
# Start dev server (Vite + Wrangler)
bun run dev

# Frontend: http://localhost:5173
# API Proxy: /api/* → localhost:8788
```

### Build & Deploy

```bash
# Build for production
bun run build

# Deploy to Cloudflare Pages
bun run cf:deploy
```

## Project Structure

```
void-vault/
├── src/
│   ├── components/      # Vue components
│   ├── composables/     # Vue composables (useEncryption, useDecryption)
│   ├── functions/       # Pages Functions (API routes)
│   │   └── api/v1/
│   │       ├── auth/    # Authentication endpoints
│   │       ├── devices/ # Device management
│   │       ├── files/   # File operations
│   │       └── download/# Download handler
│   ├── middleware/      # Auth & device validation
│   ├── utils/           # Crypto, validators, R2 client
│   └── types/           # TypeScript definitions
├── migrations/          # D1 database migrations
├── tests/               # Vitest test files
├── DECISIONS.md         # Technical decisions & rationale
└── WORKFLOW.md          # Development workflow guide
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Admin registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - Session termination
- `GET /api/v1/auth/me` - Current session info
- `GET /api/v1/auth/check-users` - Check if admin exists

### Device Management
- `POST /api/v1/devices/request` - Request device registration
- `GET /api/v1/devices/pending` - List pending devices
- `POST /api/v1/devices/:id/approve` - Approve device
- `GET /api/v1/devices` - List active devices
- `DELETE /api/v1/devices/:id` - Revoke device

### File Operations
- `POST /api/v1/files/upload` - Upload encrypted file
- `GET /api/v1/download/:fileId` - Get file metadata
- `POST /api/v1/download/:fileId` - Download file

## Database Schema

```sql
-- Users
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Trusted Devices
CREATE TABLE trusted_devices (
  id TEXT PRIMARY KEY,
  device_name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  status TEXT CHECK(status IN ('active', 'revoked')) DEFAULT 'active',
  last_used DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Pending Devices
CREATE TABLE pending_devices (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  device_name TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Vault Files
CREATE TABLE vault_files (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  r2_key TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  download_count INTEGER DEFAULT 0,
  max_downloads INTEGER DEFAULT 1,
  expires_at DATETIME NOT NULL,
  iv TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Sessions
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## Security Considerations

- **Never store decryption keys** in database, logs, or server responses
- **Device tokens** are hashed (SHA-256) before storage
- **All file operations** require valid device token
- **Rate limiting** enforced per device (10 uploads/hour)
- **Parameterized queries** for D1 to prevent SQL injection
- **CSP headers** configured for secure resource loading

## Development Workflow

See [WORKFLOW.md](./WORKFLOW.md) for detailed development guide.

For technical decisions and rationale, see [DECISIONS.md](./DECISIONS.md).

## License

MIT
