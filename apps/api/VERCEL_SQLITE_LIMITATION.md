# ⚠️ SQLite Limitation in Vercel

## The Problem

**SQLite databases in Vercel are ephemeral and do NOT persist between function invocations.**

### Why This Happens

1. **Serverless Functions are Stateless**: Each function invocation may run in a different container
2. **`/tmp` Directory is Ephemeral**: The only writable location in Vercel functions
3. **Cold Starts Reset Data**: When a function hasn't been used, it gets a fresh environment
4. **No Shared Storage**: Each function invocation has its own isolated `/tmp` directory

### What This Means

- ✅ **Data is saved** when you call `/circles/upsert`
- ❌ **Data is lost** when the function container is recycled
- ❌ **Data is lost** on each deployment
- ❌ **Data is NOT shared** between function invocations

## Current Behavior

When you:
1. Create a circle via `POST /circles/upsert` → ✅ Saves to database
2. Immediately query `GET /circles/:id` → ✅ Works (same function invocation)
3. Wait a few minutes and query again → ❌ Returns `null` (new function invocation, fresh database)

## Solutions

### Option 1: Use Vercel Postgres (Recommended)

1. Add Vercel Postgres to your project
2. Update `db.js` to use `@vercel/postgres` instead of `better-sqlite3`
3. Migrate queries to use SQL instead of SQLite-specific syntax

**Pros:**
- ✅ Persistent storage
- ✅ Shared across all function invocations
- ✅ Managed by Vercel
- ✅ Free tier available

**Cons:**
- Requires code changes
- Different query syntax

### Option 2: Use External Database Service

Use services like:
- **PlanetScale** (MySQL-compatible, serverless)
- **Supabase** (PostgreSQL)
- **MongoDB Atlas** (NoSQL)
- **Railway** (PostgreSQL)

**Pros:**
- ✅ Persistent storage
- ✅ Works with any hosting
- ✅ More control

**Cons:**
- External dependency
- May have costs
- Requires code changes

### Option 3: Use Vercel KV (Redis)

For simple key-value storage:
- **Vercel KV** (Redis-compatible)

**Pros:**
- ✅ Persistent storage
- ✅ Fast
- ✅ Simple API

**Cons:**
- Not SQL-based
- Requires significant code changes
- Better for caching than primary storage

### Option 4: Accept Ephemeral Storage (Current)

Keep using SQLite but:
- Use it only as a cache
- Always fetch from blockchain as source of truth
- Don't rely on data persistence

**Pros:**
- ✅ No code changes needed
- ✅ Works for development/testing

**Cons:**
- ❌ Data doesn't persist
- ❌ Not suitable for production

## Recommended Migration Path

For production, migrate to **Vercel Postgres**:

1. **Add Vercel Postgres**
   ```bash
   # In Vercel dashboard, go to Storage → Create Database → Postgres
   ```

2. **Install Dependencies**
   ```bash
   npm install @vercel/postgres
   ```

3. **Update db.js**
   ```javascript
   import { sql } from '@vercel/postgres';
   
   // Replace SQLite queries with PostgreSQL
   ```

4. **Update Queries**
   - SQLite: `db.prepare("SELECT * FROM circles WHERE id=?").get(id)`
   - Postgres: `await sql\`SELECT * FROM circles WHERE id=${id}\``

## Current Workaround

The code now:
- ✅ Tries to fetch from blockchain if not in database
- ✅ Has better error handling
- ✅ Uses DELETE journal mode (more reliable for ephemeral storage)
- ✅ Logs database operations for debugging

But **data will still be lost** between function invocations.

## Testing

To verify the issue:
1. Create a circle: `POST /circles/upsert`
2. Immediately query: `GET /circles/:id` → Should work
3. Wait 5-10 minutes (let function go cold)
4. Query again: `GET /circles/:id` → Will return `null`

This confirms the ephemeral nature of SQLite in Vercel.

