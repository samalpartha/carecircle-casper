# Railway Deployment Guide

Railway is an excellent choice for deploying CareCircle because it supports **persistent storage**, which solves the SQLite ephemeral storage issue we have with Vercel.

## Why Railway?

✅ **Persistent Storage**: SQLite databases persist between deployments  
✅ **Docker Support**: Uses existing Dockerfiles  
✅ **Simple Deployment**: Connect GitHub repo and deploy  
✅ **Environment Variables**: Easy configuration  
✅ **Free Tier**: Generous free tier for development  
✅ **Both Frontend & Backend**: Deploy both apps easily  

## Prerequisites

1. Railway account (sign up at [railway.app](https://railway.app))
2. GitHub repository pushed
3. Railway CLI (optional, for local testing)

## Deployment Steps

### Option 1: Deploy via Railway Dashboard

#### Deploy API (Backend)

1. **Create New Project**
   - Go to [railway.app/new](https://railway.app/new)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

2. **Add API Service**
   - Click "New" → "GitHub Repo"
   - Select your repository
   - ⚠️ **IMPORTANT**: Set **Root Directory** to `apps/api`
   - Railway will auto-detect the Dockerfile in that directory
   - If Root Directory is not set correctly, the build will fail with "src not found" error

3. **Configure Service**
   - Railway will build from `apps/api/Dockerfile`
   - Set environment variables (see below)
   - Add a persistent volume for database (optional but recommended)

4. **Add Persistent Volume (Recommended)**
   - Go to service settings
   - Click "Volumes" → "Add Volume"
   - Mount path: `/app/data`
   - This ensures database persists

5. **Set Environment Variables**
   ```
   PORT=3005
   NODE_ENV=production
   DB_FILE=/app/data/carecircle-application.db
   ```

6. **Generate Domain**
   - Railway automatically generates a domain
   - Or add custom domain in settings

#### Deploy Frontend (Web)

1. **Add Another Service**
   - In the same project, click "New" → "GitHub Repo"
   - Select your repository again
   - Set **Root Directory**: `apps/web`

2. **Configure Service**
   - Railway will build from `apps/web/Dockerfile`
   - Set environment variables:
     ```
     VITE_API_URL=https://your-api-service.railway.app
     ```

3. **Generate Domain**
   - Railway automatically generates a domain
   - Update `VITE_API_URL` with the API domain

### Option 2: Deploy via Railway CLI

1. **Install Railway CLI**
   ```bash
   npm i -g @railway/cli
   ```

2. **Login**
   ```bash
   railway login
   ```

3. **Initialize Project**
   ```bash
   railway init
   ```

4. **Deploy API**
   ```bash
   cd apps/api
   railway up
   ```

5. **Deploy Frontend**
   ```bash
   cd apps/web
   railway up
   ```

## Environment Variables

### API Service

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `3005` |
| `NODE_ENV` | Environment | `production` |
| `DB_FILE` | Database file path | `/app/data/carecircle-application.db` |
| `CONTRACT_HASH` | Casper contract hash (optional) | `hash-...` |
| `CASPER_NODE_URL` | Casper node URL (optional) | `https://rpc.testnet.casperlabs.io/rpc` |

### Frontend Service

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://carecircle-api.railway.app` |
| `VITE_CONTRACT_HASH` | Casper contract hash (optional) | `hash-...` |
| `VITE_NODE_URL` | Casper node URL (optional) | `https://rpc.testnet.casperlabs.io/rpc` |

## Persistent Storage Setup

### Option 1: Use Railway Volume (Recommended)

1. In API service settings
2. Go to "Volumes" → "Add Volume"
3. Mount path: `/app/data`
4. Update `DB_FILE` env var to: `/app/data/carecircle-application.db`

### Option 2: Use App Directory

If you don't add a volume, the database will be in `/app/data` but will be lost on redeploy. Volumes persist across deployments.

## Project Structure

```
carecircle-casper/
├── apps/
│   ├── api/
│   │   ├── Dockerfile          ← Railway uses this
│   │   ├── railway.json        ← Railway config
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.js
│   │       └── db.js            ← Uses /app/data in Railway
│   └── web/
│       ├── Dockerfile          ← Railway uses this
│       ├── railway.json        ← Railway config
│       └── ...
```

## Database Persistence

Unlike Vercel, Railway supports persistent storage:

- ✅ **With Volume**: Database persists across deployments
- ✅ **Data survives**: Restarts, updates, and redeployments
- ✅ **Shared storage**: All instances can access the same database

## Updating Deployment

1. **Via Dashboard**: Push to GitHub, Railway auto-deploys
2. **Via CLI**: `railway up` in service directory

## Custom Domains

1. Go to service settings
2. Click "Settings" → "Domains"
3. Add custom domain
4. Follow DNS configuration instructions

## Monitoring

Railway provides:
- **Logs**: Real-time logs in dashboard
- **Metrics**: CPU, memory, network usage
- **Deployments**: History of all deployments

## Cost

- **Free Tier**: $5 credit/month
- **Hobby Plan**: $5/month (if needed)
- **Pro Plan**: $20/month (for production)

## Troubleshooting

### Database Not Persisting

- Ensure volume is mounted at `/app/data`
- Check `DB_FILE` env var points to volume path
- Verify volume is attached to service

### Build Fails

- Check Dockerfile is correct
- Verify all dependencies in package.json
- Check Railway build logs

### API Not Accessible

- Check service is running (green status)
- Verify PORT env var is set
- Check service domain is correct

### Frontend Can't Connect to API

- Verify `VITE_API_URL` is set correctly
- Check API service domain
- Ensure CORS is configured in API

## Advantages Over Vercel

| Feature | Vercel | Railway |
|---------|--------|---------|
| SQLite Persistence | ❌ Ephemeral | ✅ Persistent |
| Docker Support | Limited | ✅ Full Support |
| Persistent Volumes | ❌ No | ✅ Yes |
| Serverless | ✅ Yes | ❌ No (but simpler) |
| Cold Starts | ✅ Yes | ❌ No |
| Cost | Free tier | $5 credit/month |

## Migration from Vercel

If you're currently on Vercel:

1. Create Railway project
2. Deploy API service
3. Deploy frontend service
4. Update frontend `VITE_API_URL`
5. Test thoroughly
6. Update DNS/domains

## Support

- [Railway Documentation](https://docs.railway.app)
- [Railway Discord](https://discord.gg/railway)
- [Railway Status](https://status.railway.app)

