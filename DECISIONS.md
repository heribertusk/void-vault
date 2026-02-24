# VoidVault - Technical Decisions

This document records all architectural and technical decisions made during development.

---

## Password Hashing

**Decision:** PBKDF2-SHA256

**Rationale:**
- Native support in Cloudflare Workers Web Crypto API (no external dependencies)
- Battle-tested and widely adopted in production systems
- Simpler implementation compared to Argon2 (no WASM compilation needed)
- Configurable security via iteration count

**Configuration:**
- Algorithm: PBKDF2
- Hash function: SHA-256
- Iterations: 100,000 (can be increased over time)
- Salt length: 16 bytes (128 bits)
- Output key length: 32 bytes (256 bits)

**Alternatives Considered:**
- bcrypt: Secure but requires external dependency in Workers
- Argon2: Most secure but requires WASM compilation, adds complexity

---

## File Upload Limits

**Decision:** Hard limit of 100MB

**Rationale:** Private usage, no need for tiered limits

---

## File Expiration

**Decision:** Default 1 hour, user-selectable before upload

**Options:** 1 hour, 6 hours, 24 hours, 7 days

---

## Download Limits

**Decision:** User-selectable (1, 3, 5, unlimited)

**Default:** 1 download

---

## Rate Limiting

**Decision:** 10 uploads per hour per device

**Exception:** Users with `unlimited_upload` flag bypass this limit

---

## Authentication Flow

**Decision:**
- Only admins can create user accounts
- Email/password authentication
- First registered user becomes admin
- Device tokens stored in LocalStorage (PWA)

---

## Device Registration

**Decision:** Manual approval workflow
1. User requests device access from trusted device
2. Admin sees pending requests in dashboard
3. Admin approves/rejects
4. Device receives token on approval

---

## File Type Whitelist

**Decision:** Whitelist-only approach

**Default Categories:**
- Documents: `.pdf`, `.doc`, `.docx`, `.txt`, `.md`
- Images: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`
- Archives: `.zip`, `.tar`, `.gz`
- APK: `.apk`

**Configuration:** Stored in `file_type_whitelist` table

---

## URL Structure

**Format:** `https://vault.domain/d/{fileId}#{encryptionKey}`

**Rationale:** Key in URL fragment never sent to server

---

## Offline Support

**Current Phase:** Show "connection required" error

**Future Enhancement:** Queue uploads for when connection restores (placeholder code added)

---

## Build Tooling

**Decision:** Wrangler v4

**Rationale:**
- Latest stable version with improved performance
- Better TypeScript support
- No breaking changes for this project (no deprecated features used)

**Migration from v3:**
- No code changes required (project doesn't use `legacy_assets`, `node_compat`, or `getBindingsProxy`)

---

## Cloudflare Pages vs Workers

**Decision:** Cloudflare Pages Functions (not standalone Workers)

**Rationale:**
- Frontend-focused deployment with integrated serverless functions
- Built-in CI/CD via Git integration
- Separate preview/production environments
- Simpler deployment workflow for static frontend + backend functions

**Key Differences:**
| Feature | Pages Functions | Standalone Workers |
|---------|----------------|-------------------|
| Secrets command | `wrangler pages secret put` | `wrangler secret put` |
| Dev command | `wrangler pages dev` | `wrangler dev` |
| Deploy command | `wrangler pages deploy` | `wrangler deploy` |
| Config | `pages_build_output_dir` in wrangler.toml | `main` field for entry point |
| Environments | Production + Preview (separate) | Production only |

**Secrets Management:**
- Local: `.dev.vars` file
- Production: `wrangler pages secret put JWT_SECRET --project-name=void-vault`
- Preview: `wrangler pages secret put JWT_SECRET --project-name=void-vault --env preview`

---

## Implementation Phases

### Phase 1: Project Setup (Foundation) ✅
- Initialize Bun project
- Setup Vite + Vue 3 + TypeScript
- Configure TailwindCSS + PWA plugin
- Create base file structure
- Configure ESLint, Prettier, TypeScript strict mode
- Setup Wrangler for Cloudflare Pages
- Create D1 database schema
- Create R2 bucket

### Phase 2: Authentication & User Management (Backend)
- Password hashing utility (PBKDF2)
- Auth API endpoints
- JWT/session management
- Admin auth middleware
- Tests

### Phase 3: Device Management (Backend)
- Device fingerprinting
- Device API endpoints
- Device token generation
- Device auth middleware
- Rate limiting
- Tests

### Phase 4: File Upload System (Backend)
- Upload API endpoint
- R2 upload logic
- File validation
- Tests

### Phase 5: File Download System (Backend)
- Download endpoint
- Download counter
- Auto-purge expired files
- Tests

### Phase 6: Frontend - Authentication Pages
- Login page
- Auth composable
- Protected routes

### Phase 7: Frontend - Admin Dashboard
- User management
- Device management
- Pending approvals

### Phase 8: Frontend - Upload Page
- Client-side AES-GCM encryption
- File selection UI
- Expiration/download limit selectors
- Shareable link generation

### Phase 9: Frontend - Download Page
- Extract key from URL fragment
- Decrypt file client-side
- Trigger download

### Phase 10: PWA Configuration
- Manifest configuration
- Service worker
- Install button

### Phase 11: Testing & Polish
- Unit tests
- Integration tests
- Security audit
- Performance optimization
