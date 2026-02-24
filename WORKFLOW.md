# Development Workflow Guide

## **Quick Start (Recommended for Daily Development)**

```bash
# Single command - starts everything
bun run dev
```

This starts:
- **Vite Frontend** on 0.0.0.0:5173 (all interfaces, with hot-reload)
- **Wrangler API** on 0.0.0.0:8788 (all interfaces, Pages Functions)
- **Auto-copies** functions, middleware, utils, types
- **Proxy configured:** /api/* → Wrangler at 127.0.0.1:8788

**Access app at:**
- Local (dev machine): http://localhost:5173 or http://127.0.0.1:5173
- LAN (other devices): http://192.168.88.106:5173 (replace with your LAN IP)

---

## **How to Verify Changes Are Applied**

### **1. Frontend Changes (Vue Components, Stores, Composables)**

**When you edit:** `src/pages/*.vue`, `src/stores/*.ts`, `src/composables/*.ts`

**Verification:**
```bash
# Step 1: Check console logs in browser
# Open http://localhost:5173 → DevTools (F12) → Console
# Should see latest console.log statements

# Step 2: Check browser network tab
# DevTools → Network → JS
# Should see module files like: useAdmin-xxx.js (not index-xxx.js)
# If you see "index-xxx.js", you're in PRODUCTION mode (wrong!)

# Step 3: Vite console output
# Terminal should show: "hmr update" when you save files
# No rebuild needed - changes are instant
```

### **2. Backend Changes (API Endpoints, Middleware)**

**When you edit:** `src/functions/**/*.ts`, `src/middleware/*.ts`

**Verification:**
```bash
# Step 1: Check functions are copied
ls -la functions/api/v1/auth/login.ts
# Should have recent timestamp

# Step 2: Check Wrangler logs
# Terminal running Wrangler should show: "GET /api/v1/auth/check-users 200"
# If you see errors, functions weren't reloaded

# Step 3: Force reload Wrangler (if needed)
# Stop dev server (Ctrl+C) and restart:
bun run dev
```

### **3. Shared Utils Changes**

**When you edit:** `src/utils/*.ts`, `src/types/*.ts`

**Verification:**
```bash
# These are used by BOTH frontend and backend

# For frontend changes:
# Instant hot-reload in browser (Vite HMR)

# For backend changes:
# Need to restart Wrangler
# Stop (Ctrl+C) → bun run dev
```

---

## **Development Workflow (Step-by-Step)**

### **Scenario 1: Edit Frontend Code**

```bash
# 1. Edit file (e.g., src/pages/Login.vue)
# 2. Save file (Cmd+S or Ctrl+S)
# 3. Check browser - changes appear INSTANTLY (hot-reload)
# 4. Check console for new logs
```

**No restart needed!** Vite HMR handles it.

### **Scenario 2: Edit Backend Code**

```bash
# 1. Edit file (e.g., src/functions/api/v1/users/index.ts)
# 2. Save file
# 3. Functions are auto-copied to functions/ folder (predev hook)
# 4. BUT: Wrangler needs restart to pick up changes
# 5. Stop dev server (Ctrl+C)
# 6. Restart: bun run dev
# 7. Test API endpoint
```

**Wrangler restart required** for function changes.

### **Scenario 3: Add New Files**

```bash
# 1. Create new file in src/
# 2. If it's a function/middleware/utils/type:
#    - Stop dev server (Ctrl+C)
#    - Restart: bun run dev
#    - predev hook will copy it to functions/
# 3. If it's frontend only (page/component):
#    - Just save - Vite hot-reload handles it
```

---

## **Testing Commands**

### **Check if running in correct mode:**

```bash
# Browser DevTools → Network → JS files
# If you see: useAdmin-xxx.js, useAuth-xxx.js (separate files)
# ✅ DEVELOPMENT mode - hot-reload enabled

# If you see: index-xxx.js (single large file)
# ❌ PRODUCTION mode - need to rebuild
```

### **Verify API proxy is working:**

```bash
# Browser DevTools → Network → Filter by "api"
# All /api/* requests should go to http://localhost:8788
# Headers should show: "provisional headers are shown" (dev mode)
```

### **Check Wrangler is serving latest functions:**

```bash
# Terminal running Wrangler
# Look for: "GET /api/v1/... 200" logs
# Check timestamps - should be recent

# Manual check:
head -20 functions/api/v1/auth/login.ts
# Should see your latest code changes
```

---

## **Common Issues & Solutions**

### **Issue: "Changes not appearing"**

**Frontend changes:**
```bash
# Check if you're accessing correct URL
✅ http://localhost:5173 (Vite - hot-reload)
❌ http://localhost:8788 (Wrangler - static files)

# Verify Vite HMR is working
# Check terminal for "hmr update" messages when you save files
```

**Backend changes:**
```bash
# Wrangler caches functions in memory
# Solution: Restart dev server
# Stop (Ctrl+C) → bun run dev
```

### **Issue: "API calls returning 404/500"**

```bash
# Check if functions are copied
ls -la functions/api/v1/

# Check if dependencies are copied
ls -la functions/middleware/
ls -la functions/utils/
ls -la functions/types/

# If missing: Restart dev server
bun run dev
```

### **Issue: "Can't tell if code is running"**

```bash
# Add debug console.log
# Example: console.log('[DEBUG] File loaded: useAdmin.ts')

# Save file
# Check browser console immediately
# If you see the log = code is running
# If no log = code not loaded (restart dev server)
```

---

## **Before Committing Changes**

```bash
# 1. Run linter
bun run lint

# 2. Run type check
bun run typecheck

# 3. Test the full flow manually
# - Register/login
# - Test API endpoints
# - Check console for errors

# 4. Verify both frontend and backend work
# Frontend: http://localhost:5173
# Backend: Check Wrangler logs
```

---

## **Summary: Development Commands**

| Command | Purpose | Hot-Reload? |
|---------|---------|-------------|
| `bun run dev` | Start full dev environment | Yes (frontend only) |
| `bun run dev:frontend` | Vite only (for CSS/HTML work) | Yes |
| `bun run dev:api` | Wrangler only (for API work) | No (restart needed) |

**Best Practice:** Use `bun run dev` for everything. Access frontend at http://localhost:5173 or http://192.168.88.106:5173 (LAN).

---

## **Key Takeaways**

1. ✅ **Frontend changes:** Instant hot-reload, no restart
2. ⚠️ **Backend changes:** Need dev server restart
3. 🔍 **Verification:** Check browser console for `[DEBUG]` logs
4. 🎯 **Access point:** http://localhost:5173 (NOT 8788 for development)
5. 🔄 **Restart workflow:** Ctrl+C → `bun run dev`

**This workflow ensures you never waste time wondering "did my changes apply?"**
