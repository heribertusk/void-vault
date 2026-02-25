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

## File Download Method

**Decision:** Direct binary streaming from R2 (no base64 encoding)

**Initial Approach (Base64 in JSON):**

- **Chosen for MVP simplicity:**
  - JSON responses consistent with all other API endpoints
  - Easy to debug and inspect in browser dev tools
  - Straightforward TypeScript type safety with interfaces
  - Simple request-response pattern (no streaming complexity)
  - Faster initial development
  - Assumed file sizes would remain small (<5MB documents)

- **Why streaming wasn't considered initially:**
  - No prior knowledge of Cloudflare Workers CPU limits (10ms free tier)
  - Perceived complexity of binary streaming with metadata
  - Focus on rapid MVP delivery over optimization
  - Lack of production data on actual file size usage

**Problem Encountered:**

- Worker CPU limit exceeded for files ≥ 10MB (Error 1102)
- Base64 conversion required 10M+ iterations per 10MB file:
  ```typescript
  // CPU-intensive loop
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]) // 10M+ iterations
  }
  const base64Data = btoa(binary) // 20MB string → base64
  ```
- Server memory footprint: 3x file size (ArrayBuffer + string + base64)
- 1-2 seconds CPU time per 10MB file → timeout on free tier (10ms limit)

**Solution Refactor:**

- Stream R2 object directly as binary response
- Client receives encrypted data as `ArrayBuffer`
- Extract metadata via HTTP headers instead of JSON body
- Remove all base64 encoding/decoding (server and client)

**Benefits:**

- ✅ **Zero CPU overhead** - no base64 conversion loops
- ✅ **Unlimited file size** - streaming bypasses memory limits
- ✅ **Faster downloads** - direct R2 → client transfer
- ✅ **Reduced memory footprint** - ~3x less server memory usage
- ✅ **Simpler code** - 55 lines removed, net benefit
- ✅ **Security improved** - less sensitive data in server memory

**Security Headers Added:**

- `X-Content-Type-Options: nosniff` - prevent MIME type sniffing
- `Cache-Control: no-store, no-cache` - don't cache encrypted data
- `Content-Disposition: attachment` - force download behavior

**Alternatives Considered:**

1. **Optimized base64 conversion**
   - Use `btoa(String.fromCharCode(...new Uint8Array(data)))`
   - 5-10x faster but still CPU-intensive for large files
   - Rejected: Would still timeout for files > 50MB

2. **Durable Objects for offloading**
   - Move base64 conversion to DO
   - Rejected: DOs have same CPU limits (30s), doesn't solve root cause

3. **Hybrid approach**
   - Base64 for files < 20MB, streaming for larger
   - Rejected: Unnecessary complexity, streaming works for all sizes

4. **Presigned R2 URLs**
   - Generate direct R2 URL for client download
   - Rejected: Bypasses download counting, violates audit requirements

**Configuration:**

```typescript
// Backend: Stream R2 object directly
return new Response(r2Object.body, {
  headers: {
    'Content-Type': 'application/octet-stream',
    'X-File-Name': encodeURIComponent(file.original_name),
    'X-File-Mime-Type': file.mime_type,
    'X-File-IV': file.iv,
    'X-Content-Type-Options': 'nosniff',
  },
})

// Frontend: Read binary stream
const encryptedData = await response.arrayBuffer()
const decryptedBuffer = await decryptFile(encryptedData, keyHex, iv)
```

**Performance Impact:**

- Before: 10MB file → 1-2s CPU time → timeout on Free plan (10ms limit)
- After: 10MB file → ~0ms CPU time → instant download
- Tested: 10MB APK downloads successfully on PC and Android Chrome

**Lesson Learned:**

- Consider production constraints (CPU limits, file sizes) during initial architecture
- Streaming is preferred for file transfer even when JSON seems simpler
- Real-world testing with actual file sizes is critical before finalizing decisions

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
