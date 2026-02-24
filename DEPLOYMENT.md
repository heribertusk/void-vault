# Production Deployment Guide

This guide explains how to deploy VoidVault to production on Cloudflare Pages.

---

## Prerequisites

1. **Cloudflare Account** with Workers & Pages enabled
2. **GitHub Repository** with code pushed
3. **Wrangler CLI** installed locally
4. **Domain name** (optional, for custom domain)

---

## Step 1: Create Cloudflare Resources

### 1.1. Create D1 Database (Production)

```bash
# Create production D1 database
wrangler d1 create void-vault-db

# Output example:
# ✅ Successfully created DB 'void-vault-db'
# database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# Copy the database_id and update wrangler.toml:
# database_id = "your-database-id-here" (replace "local")
```

**Update `wrangler.toml`:**

```toml
[[d1_databases]]
binding = "DB"
database_name = "void-vault-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # ← Replace this
```

### 1.2. Create R2 Bucket (Production)

```bash
# Create R2 bucket for file storage
wrangler r2 bucket create void-vault-storage
```

### 1.3. Run Database Migrations (Production)

```bash
# Run migrations to create tables
wrangler d1 migrations apply void-vault-db --remote
```

**Verify:**

```bash
# List tables
wrangler d1 execute void-vault-db --remote --command "SELECT name FROM sqlite_master WHERE type='table'"

# Expected output: users, trusted_devices, pending_devices, vault_files, sessions
```

---

## Step 2: Configure Environment Secrets

### 2.1. Production Environment

```bash
# Set JWT secret for production
wrangler pages secret put JWT_SECRET --project-name=void-vault

# Enter a strong random secret when prompted (min 32 characters recommended)
# Example: openssl rand -base64 32
```

**Alternative via Dashboard:**

1. Go to: https://dash.cloudflare.com
2. Navigate to: **Workers & Pages** → **void-vault**
3. **Settings** → **Variables and Secrets** → **Add variable**
4. Add:
   - **Name:** `JWT_SECRET`
   - **Value:** `<your-strong-secret>`
   - **Environment:** Production

### 2.2. Preview Environment (Optional)

Repeat the same for preview deployments:

```bash
wrangler pages secret put JWT_SECRET --project-name=void-vault --env preview
```

### 2.3. GitHub Secrets (for CI/CD)

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add the following secrets:

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `CLOUDFLARE_API_TOKEN` | API token with Workers & Pages edit permissions | [Create API Token](https://dash.cloudflare.com/profile/api-tokens) |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare Account ID | [Get from URL or dashboard](https://dash.cloudflare.com) |

**Create API Token:**

1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Click **Create Token**
3. Use template: **Edit Cloudflare Workers** (or custom)
4. Permissions:
   - **Workers Scripts** → Edit
   - **Workers KV Storage** → Edit
   - **D1** → Edit
   - **R2** → Edit
   - **Account** → Account Settings: Read
5. **Account Resources:** Include → Your account
6. Click **Continue to summary** → **Create Token**
7. **Copy the token** (you won't see it again!)

**Get Account ID:**

1. Go to: https://dash.cloudflare.com
2. Click on your domain (or any Workers & Pages project)
3. URL will be: `https://dash.cloudflare.com/<ACCOUNT_ID>/...`
4. Copy the `<ACCOUNT_ID>` from the URL

---

## Step 3: Deployment Options

### Option A: Git Integration (Recommended - Auto-Deploy)

**Advantages:**
- ✅ Automatic deployments on push to `main`
- ✅ Preview deployments for pull requests
- ✅ Build status checks in GitHub
- ✅ Rollback support

**Steps:**

1. **Push code to GitHub:**
   ```bash
   git remote add origin https://github.com/your-username/void-vault.git
   git branch -M main
   git push -u origin main
   ```

2. **Connect to Cloudflare Pages:**
   - Go to: https://dash.cloudflare.com
   - **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
   - Select your GitHub repository
   - **Project name:** `void-vault`
   - **Production branch:** `main`
   - **Build settings:**
     - **Build command:** `bun run copy:functions && bun run build:frontend`
     - **Build output directory:** `dist`
   - Click **Save and Deploy**

3. **Configure Bindings (in Cloudflare Dashboard):**
   - Go to: **Workers & Pages** → **void-vault** → **Settings** → **Functions** → **Bindings**
   - Add D1 database binding:
     - **Variable name:** `DB`
     - **D1 database:** `void-vault-db`
   - Add R2 bucket binding:
     - **Variable name:** `R2`
     - **R2 bucket:** `void-vault-storage`

4. **Set Environment Variables:**
   - Go to: **Settings** → **Environment Variables**
   - Add:
     - `ENVIRONMENT` = `production`
     - `MAX_FILE_SIZE` = `104857600`
     - `DEFAULT_EXPIRATION_HOURS` = `1`
     - `RATE_LIMIT_PER_HOUR` = `10`

### Option B: GitHub Actions (Custom CI/CD)

**Advantages:**
- ✅ Full control over deployment pipeline
- ✅ Can add custom build/test steps
- ✅ Run migrations automatically
- ✅ Works with existing GitHub Actions setup

**Steps:**

1. **GitHub secrets already configured** (from Step 2.3)

2. **Push code to GitHub:**
   ```bash
   git push origin main
   ```

3. **GitHub Actions will automatically:**
   - Install dependencies with Bun
   - Copy functions to `functions/` directory
   - Build frontend with Vite
   - Deploy to Cloudflare Pages
   - Run D1 migrations (production only)

4. **Monitor deployment:**
   - Go to: **Actions** tab in your GitHub repo
   - Click on the **Deploy to Cloudflare Pages** workflow run

**After Deployment:**

Configure bindings in Cloudflare Dashboard (same as Option A, Step 3.3-3.4)

### Option C: Manual Deploy with Wrangler

**For one-off deployments or testing:**

```bash
# Build frontend
bun run build:frontend

# Deploy to production
bun run cf:deploy

# Deploy to preview
wrangler pages deploy dist --project-name=void-vault --branch=preview
```

---

## Step 4: Verify Deployment

### 4.1. Check Production URL

After deployment, your app will be available at:
- **Default:** `https://void-vault.pages.dev`
- **Custom domain:** `https://your-domain.com` (if configured)

### 4.2. Test Registration Flow

1. Open production URL
2. Try to register first admin account
3. Verify admin account creation works

### 4.3. Test Database Connection

```bash
# Check if admin user was created
wrangler d1 execute void-vault-db --remote --command "SELECT id, email, is_admin FROM users"
```

### 4.4. Test File Upload

1. Login as admin
2. Request device registration
3. Approve device
4. Try uploading a file
5. Verify file appears in R2:
   ```bash
   wrangler r2 object list void-vault-storage
   ```

---

## Step 5: Post-Deployment Configuration

### 5.1. Custom Domain (Optional)

1. Go to: **Workers & Pages** → **void-vault** → **Custom domains**
2. Click **Set up a custom domain**
3. Enter your domain (e.g., `vault.example.com`)
4. Follow DNS instructions (add CNAME record)

### 5.2. Analytics (Optional)

Enable Cloudflare Web Analytics:

1. Go to: **Workers & Pages** → **void-vault** → **Analytics**
2. Click **Enable Web Analytics**

### 5.3. Access Control (Optional)

Add Cloudflare Access for extra security:

1. Go to: **Workers & Pages** → **void-vault** → **Settings** → **Access**
2. Configure login methods (Email, Google, GitHub, etc.)

---

## Environment Variables Reference

| Variable | Production | Description |
|----------|-----------|-------------|
| `JWT_SECRET` | **Required** | Secret for JWT signing (set via `wrangler pages secret put`) |
| `ENVIRONMENT` | `production` | Deployment environment |
| `MAX_FILE_SIZE` | `104857600` | Max file size in bytes (100MB) |
| `DEFAULT_EXPIRATION_HOURS` | `1` | Default file expiration (hours) |
| `RATE_LIMIT_PER_HOUR` | `10` | Upload rate limit per device |

---

## Troubleshooting

### Issue: "no such table" error

**Cause:** Migrations not run in production

**Solution:**
```bash
wrangler d1 migrations apply void-vault-db --remote
```

### Issue: "D1 binding not found"

**Cause:** D1 database not configured in Pages project

**Solution:**
1. Go to Cloudflare Dashboard
2. Workers & Pages → void-vault → Settings → Functions → Bindings
3. Add D1 database binding: Variable name `DB` → D1 database `void-vault-db`

### Issue: "JWT_SECRET not defined"

**Cause:** Secret not set in Pages project

**Solution:**
```bash
wrangler pages secret put JWT_SECRET --project-name=void-vault
```

### Issue: "R2 binding not found"

**Cause:** R2 bucket not configured in Pages project

**Solution:**
1. Go to Cloudflare Dashboard
2. Workers & Pages → void-vault → Settings → Functions → Bindings
3. Add R2 bucket binding: Variable name `R2` → R2 bucket `void-vault-storage`

### Issue: Build fails in GitHub Actions

**Cause:** GitHub secrets not configured

**Solution:**
1. Check Actions tab for error logs
2. Verify `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets are set
3. Ensure API token has correct permissions (Workers edit, D1 edit, R2 edit)

---

## Rollback Procedure

If something goes wrong:

### Option A: Via Cloudflare Dashboard

1. Go to: **Workers & Pages** → **void-vault** → **Deployments**
2. Find the previous successful deployment
3. Click **Rollback** → **Yes, rollback**

### Option B: Via Git (Git Integration)

```bash
# Revert to previous commit
git revert HEAD

# Or checkout previous commit and push
git checkout <previous-commit-hash>
git push origin main --force
```

### Option C: Via Wrangler (Manual)

```bash
# List recent deployments
wrangler pages deployment list --project-name=void-vault

# Rollback to specific deployment
wrangler pages deployment rollback --project-name=void-vault <deployment-id>
```

---

## Security Checklist

Before going live, verify:

- [ ] Strong `JWT_SECRET` set in production (min 32 characters)
- [ ] D1 migrations applied successfully
- [ ] R2 bucket created and accessible
- [ ] Bindings configured (D1 and R2)
- [ ] Custom domain SSL/TLS enabled (if applicable)
- [ ] Cloudflare Access configured (if needed)
- [ ] Rate limiting verified
- [ ] File upload size limits enforced
- [ ] File type validation working
- [ ] Device token validation working
- [ ] HTTPS enforced (automatic with Cloudflare)

---

## Cost Estimation

Cloudflare Pages (Free Tier):
- ✅ 500 builds per month
- ✅ Unlimited bandwidth
- ✅ Unlimited requests
- ✅ D1: 5 million rows read/day, 100k rows written/day
- ✅ R2: 10 GB storage, 1 million Class A operations/month

**For personal/small-scale use:** Free tier is sufficient.

**For heavy usage:** Check pricing at:
- D1: https://developers.cloudflare.com/d1/platform/pricing/
- R2: https://developers.cloudflare.com/r2/platform/pricing/

---

## Next Steps

After successful deployment:

1. **Test complete flow:** Register → Request device → Approve → Upload → Download
2. **Set up monitoring:** Cloudflare Analytics
3. **Configure custom domain:** For professional appearance
4. **Set up backup:** Export D1 database periodically
5. **Document usage:** Share README.md with team

---

## Useful Commands

```bash
# View production logs
wrangler pages deployment tail --project-name=void-vault

# Query production database
wrangler d1 execute void-vault-db --remote --command "SELECT * FROM users"

# List R2 objects
wrangler r2 object list void-vault-storage

# Delete R2 object
wrangler r2 object delete void-vault-storage <object-key>

# Check deployment status
curl -I https://void-vault.pages.dev
```

---

## Support

- **Cloudflare Docs:** https://developers.cloudflare.com/pages
- **Wrangler CLI:** https://developers.cloudflare.com/workers/wrangler/
- **Community:** https://community.cloudflare.com/c/pages/56
