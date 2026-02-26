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
- **Automatic file expiration** (hourly cron job deletes expired files)
- Encrypted storage in Cloudflare R2

### Security Features

- PBKDF2-SHA256 password hashing (100k iterations)
- Token hashing before database storage
- Rate limiting (10 uploads/hour per device)
- File type validation (whitelist approach)
- No keys/secrets logged or exposed

## Platform Compatibility

VoidVault uses client-side encryption with Web Crypto API and URL fragments for key distribution. Compatibility status for messaging platforms:

| Platform    | Status              | Notes                                     |
| ----------- | ------------------- | ----------------------------------------- |
| ✅ Telegram | Fully Compatible    | All environments (Web, Desktop, Mobile)   |
| ⚠️ WhatsApp | Partial             | May strip decryption key in link previews |
| ✅ Discord  | Fully Compatible    | All environments (Web, Desktop, Mobile)   |
| ✅ Slack    | Fully Compatible    | All environments (Web, Desktop, Mobile)   |
| ✅ Signal   | Expected Compatible | Modern webview, less aggressive previews  |

**Legend:**

- ✅ Fully Compatible: Works seamlessly in in-app webview
- ⚠️ Partial: Works with limitations or workarounds required

> **Note**: This is based on technical analysis. Real-world testing is in progress for Telegram and WhatsApp across all environments (Web, Desktop Windows/macOS, Mobile iOS/Android). See [PLATFORM_COMPATIBILITY.md](./PLATFORM_COMPATIBILITY.md) for detailed analysis, testing methodology, and known limitations.

### Known Limitations

- **WhatsApp**: Link previews may strip the URL fragment (`#key=...`), causing decryption failure. **Workaround**: Copy the full link instead of clicking the preview, or open in an external browser.
- **Legacy browsers**: Requires Web Crypto API support (Safari 14+, Chrome 91+, Firefox 90+).

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Cloudflare Pages                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         Frontend (Vue 3 + Vite + TailwindCSS)         │  │
│  │                   PWA (Progressive Web App)           │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         Pages Functions (TypeScript API)              │  │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐    │  │
│  │  │  Auth   │ │ Devices  │ │  Files   │ │Download │    │  │
│  │  └─────────┘ └──────────┘ └──────────┘ └─────────┘    │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP API
                            ▼
┌────────────────────────────────────────────────────────────┐
│                   Cloudflare Services                      │
│  ┌───────────────────┐     ┌───────────────────────────┐   │
│  │   D1 Database     │     │      R2 Storage           │   │
│  │   (SQLite)        │◄───►│  (Encrypted Files)        │   │
│  │  • Users          │     │  • File Storage           │   │
│  │  • Devices        │     │  • Auto-TTL Cleanup       │   │
│  │  • Files          │     │                           │   │
│  └───────────────────┘     └───────────────────────────┘   │
│                              ▲                             │
│                              │ Scheduled Trigger           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │   Cleanup Worker (Hourly Cron Job)                  │   │
│  │  • Delete expired files from R2 & D1                │   │
│  │  • Cleanup old upload logs                          │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

**Data Flow:**

1. **Upload:** Client encrypts → Pages Function → R2 storage + D1 metadata
2. **Download:** Client requests → Pages Function validates → R2 fetch → Client decrypts
3. **Cleanup:** Scheduled Worker runs hourly → Deletes expired files from R2 + D1

## Tech Stack

- **Frontend**: Vue 3 + Vite + TailwindCSS (PWA)
- **Backend**: Cloudflare Pages Functions (TypeScript)
- **Background Jobs**: Cloudflare Workers (Scheduled tasks)
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

## Deployment Options

### Option A: Local Development (Default)

```bash
# wrangler.toml sudah configured dengan database_id = "local"
bun run dev
```

### Option B: Production via GitHub Actions (Recommended)

1. **Prepare Cloudflare Resources:**

   ```bash
   wrangler d1 create your-db-name  # Copy database_id from output
   wrangler r2 bucket create your-bucket-name
   wrangler d1 migrations apply your-db-name --remote
   ```

2. **Configure GitHub Secrets:**

   Go to: Repository → Settings → Secrets and variables → Actions → New repository secret

   **Required Secrets:**
   - `CLOUDFLARE_API_TOKEN` - [Create token](https://dash.cloudflare.com/profile/api-tokens) with **Workers & Pages Edit** permissions
   - `CLOUDFLARE_ACCOUNT_ID` - Your account ID from Cloudflare dashboard
   - `CF_D1_DATABASE_ID` - Your D1 database ID (from `wrangler d1 list`)

   **Optional Secrets:**
   - `CF_D1_DATABASE_NAME` - Override D1 database name (default: void-vault-db)
   - `CF_R2_BUCKET_NAME` - Override R2 bucket name (default: void-vault-storage)

3. **Set JWT Secret:**

   ```bash
   wrangler pages secret put JWT_SECRET --project-name=void-vault
   # Generate secure secret: openssl rand -base64 32
   ```

4. **Deploy:**
   ```bash
   git push origin main
   ```
   GitHub Actions will automatically build and deploy.

### Option C: Manual Production Deploy

```bash
# 1. Update wrangler.toml with production database_id
#    Change: database_id = "local" → database_id = "your-production-id"

# 2. Set JWT secret
wrangler pages secret put JWT_SECRET --project-name=void-vault

# 3. Build and deploy
bun run build:frontend
bun run copy:functions
bunx wrangler pages deploy dist --project-name=void-vault

# 4. Reset wrangler.toml back to local
#    Change: database_id = "your-production-id" → database_id = "local"
```

**Note:** For detailed deployment guide, see [DEPLOYMENT.md](./DEPLOYMENT.md).

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
│   ├── workers/         # Cloudflare Workers (background jobs)
│   │   └── file-cleanup.ts # Scheduled cleanup worker
│   ├── middleware/      # Auth & device validation
│   ├── utils/           # Crypto, validators, R2 client
│   └── types/           # TypeScript definitions
├── migrations/          # D1 database migrations
├── tests/               # Vitest test files
├── scripts/             # Deployment scripts
│   └── deploy.sh        # Unified deploy script (Pages + Worker)
├── wrangler.toml        # Cloudflare Pages config
├── wrangler.worker.toml # Cleanup Worker config
├── .github/
│   └── workflows/
│       └── deploy.yml   # GitHub Actions CI/CD
├── DECISIONS.md         # Technical decisions & rationale
├── WORKFLOW.md          # Development workflow guide
└── DEPLOYMENT.md        # Comprehensive deployment guide
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
