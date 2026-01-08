# Vercel API Deployment Guide

This guide explains how to deploy the CareCircle API to Vercel as serverless functions.

## Important Notes

### SQLite Database Limitations

⚠️ **SQLite on Vercel has limitations:**
- Vercel serverless functions are stateless
- The `/tmp` directory is the only writable location
- Database files are **ephemeral** - they reset on each deployment
- For production, consider using:
  - Vercel Postgres (recommended)
  - Vercel KV (Redis)
  - External database service (PlanetScale, Supabase, etc.)

### Current Setup

The API is configured to use SQLite in `/tmp` directory, which means:
- ✅ Works for development and testing
- ⚠️ Data is lost on each deployment
- ⚠️ Data is not shared between function invocations (each cold start gets a fresh DB)

## Deployment Steps

### Option 1: Deploy via Vercel Dashboard

1. **Create a New Project**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Click "Import Git Repository"
   - Select your repository

2. **Configure Project Settings**
   - **Root Directory**: `apps/api`
   - **Framework Preset**: Other
   - **Build Command**: Leave empty (or `npm install`)
   - **Output Directory**: Leave empty
   - **Install Command**: `npm install`

3. **Set Environment Variables**
   - `DB_FILE`: `/tmp/carecircle-application.db` (optional, defaults to this)
   - `NODE_ENV`: `production`
   - Add any other required environment variables

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Your API will be live at `https://your-project.vercel.app`

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Navigate to API Directory**
   ```bash
   cd apps/api
   ```

3. **Login to Vercel**
   ```bash
   vercel login
   ```

4. **Deploy**
   ```bash
   vercel
   ```
   
   Follow the prompts:
   - Link to existing project or create new
   - Set root directory: `apps/api`
   - Override settings: No (use defaults)

5. **Set Environment Variables**
   ```bash
   vercel env add DB_FILE
   # Enter: /tmp/carecircle-application.db
   
   vercel env add NODE_ENV
   # Enter: production
   ```

6. **Deploy to Production**
   ```bash
   vercel --prod
   ```

## Project Structure

```
apps/api/
├── api/
│   └── index.js          # Vercel serverless function entry point
├── src/
│   ├── index.js          # Express app (exports app for Vercel)
│   ├── db.js             # Database setup
│   └── seed.js           # Demo data seeder
├── vercel.json           # Vercel configuration
├── .vercelignore         # Files to exclude
└── package.json          # Dependencies
```

## How It Works

1. **Serverless Function Entry**: `api/index.js` imports and exports the Express app
2. **Express App**: `src/index.js` exports the app (doesn't call `listen()` in Vercel)
3. **Routing**: Vercel routes all requests to `api/index.js`
4. **Database**: SQLite file is created in `/tmp` directory (ephemeral)

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DB_FILE` | SQLite database file path | `/tmp/carecircle-application.db` (Vercel) or `carecircle-application.db` (local) | No |
| `NODE_ENV` | Node environment | `production` | No |
| `VERCEL` | Set by Vercel automatically | `1` | No |

## API Endpoints

Once deployed, all endpoints are available at:
- `https://your-project.vercel.app/health`
- `https://your-project.vercel.app/circles/upsert`
- `https://your-project.vercel.app/circles/:id`
- `https://your-project.vercel.app/docs` (Swagger UI)
- ... and all other endpoints

## Upgrading to Production Database

For production use, consider migrating from SQLite to:

### Option 1: Vercel Postgres

1. Add Vercel Postgres to your project
2. Update `db.js` to use Postgres instead of SQLite
3. Update queries to use SQL instead of SQLite-specific syntax

### Option 2: External Database

1. Set up a database service (PlanetScale, Supabase, etc.)
2. Update connection string in environment variables
3. Update `db.js` to use the new database

## Troubleshooting

### Database Not Persisting

- This is expected with SQLite on Vercel
- Each deployment resets the database
- Consider using a persistent database service

### Function Timeout

- Default timeout is 10 seconds
- Increased to 30 seconds in `vercel.json`
- For longer operations, consider background jobs

### Cold Starts

- First request after inactivity may be slow
- Consider using Vercel Pro for better performance
- Or use a persistent database to reduce initialization time

## Support

For Vercel-specific issues:
- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)

