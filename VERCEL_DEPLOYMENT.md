# Vercel Deployment Guide

This guide explains how to deploy CareCircle to Vercel from Git.

## Prerequisites

1. A Vercel account (sign up at [vercel.com](https://vercel.com))
2. Your repository pushed to GitHub/GitLab/Bitbucket
3. Your API server deployed separately (see note below)

## Deployment Steps

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Connect Your Repository**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Click "Import Git Repository"
   - Select your repository (e.g., `palsure/carecircle-casper`)
   - Click "Import"

2. **Configure Project Settings**
   - **Framework Preset**: Vite
   - **Root Directory**: Leave as root (`.`)
   - **Build Command**: `npm install && cd apps/web && npm install && npm run build`
   - **Output Directory**: `apps/web/dist`
   - **Install Command**: `npm install`

3. **Set Environment Variables**
   - Click "Environment Variables"
   - Add the following:
     ```
     VITE_API_URL = https://your-api-url.com
     ```
   - Replace `https://your-api-url.com` with your actual API server URL
   - If your API is on Google Cloud Run, use that URL
   - If using a different API, update accordingly

4. **Deploy**
   - Click "Deploy"
   - Wait for the build to complete
   - Your app will be live at `https://your-project.vercel.app`

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```
   
   Follow the prompts:
   - Link to existing project or create new
   - Set root directory: `.` (root)
   - Override build command: `npm install && cd apps/web && npm install && npm run build`
   - Override output directory: `apps/web/dist`

4. **Set Environment Variables**
   ```bash
   vercel env add VITE_API_URL
   ```
   Enter your API URL when prompted.

5. **Deploy to Production**
   ```bash
   vercel --prod
   ```

## Important Notes

### API Server Deployment

The frontend requires a separate API server. You have three options:

1. **Deploy API to Vercel** (Recommended for simplicity)
   - The API is configured for Vercel serverless functions
   - Deploy from `apps/api` directory
   - See `apps/api/VERCEL_DEPLOYMENT.md` for detailed instructions
   - Set `VITE_API_URL` to your Vercel API URL

2. **Use Existing API** (Alternative)
   - If your API is already deployed (e.g., Google Cloud Run)
   - Set `VITE_API_URL` to that URL in Vercel environment variables

3. **Deploy Both Together** (Advanced)
   - Deploy frontend from root directory
   - Deploy API as a separate Vercel project from `apps/api`
   - Link them via environment variables

### Environment Variables

Required environment variables:
- `VITE_API_URL`: Your backend API URL (e.g., `https://carecircle-api-fozkypxpga-uc.a.run.app`)

Optional (if using different API):
- `VITE_CONTRACT_HASH`: Casper contract hash
- `VITE_NODE_URL`: Casper node URL
- `VITE_NETWORK_NAME`: Casper network name

### Monorepo Configuration

This project uses a monorepo structure. Vercel is configured to:
- Install dependencies at the root level
- Build only the `apps/web` frontend
- Output to `apps/web/dist`

### Automatic Deployments

Once connected to Git, Vercel will automatically:
- Deploy on every push to `main` branch (production)
- Create preview deployments for pull requests
- Rebuild on every commit

## Troubleshooting

### Build Fails

1. Check that all dependencies are in `package.json`
2. Verify the build command is correct
3. Check Vercel build logs for specific errors

### API Connection Issues

1. Verify `VITE_API_URL` is set correctly
2. Check CORS settings on your API server
3. Ensure API server is publicly accessible

### Routing Issues

- The `vercel.json` includes a rewrite rule for SPA routing
- All routes redirect to `index.html` for client-side routing

## Updating Deployment

After making changes:
1. Push to your Git repository
2. Vercel will automatically detect changes
3. A new deployment will be triggered
4. Preview deployments are created for branches
5. Production deployments happen on `main` branch

## Custom Domain

To add a custom domain:
1. Go to your project settings in Vercel
2. Click "Domains"
3. Add your domain
4. Follow DNS configuration instructions

## Support

For Vercel-specific issues, check:
- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Community](https://github.com/vercel/vercel/discussions)

