# Vercel API Deployment Troubleshooting

## Common Issues and Solutions

### Issue: API Not Deploying

**Symptoms:**
- Build succeeds but API endpoints return 404
- Deployment completes but no routes work

**Solutions:**

1. **Check Root Directory**
   - In Vercel project settings, ensure **Root Directory** is set to `apps/api`
   - Not the repository root, but specifically `apps/api`

2. **Verify File Structure**
   ```
   apps/api/
   ├── api/
   │   └── index.js       ← Must exist
   ├── src/
   │   └── index.js       ← Express app
   ├── vercel.json        ← Configuration
   └── package.json       ← Dependencies
   ```

3. **Check vercel.json**
   - Should only have `functions` property
   - No `builds` or `routes` needed (Vercel auto-detects)

4. **Verify Export**
   - `api/index.js` must export the Express app: `export default app;`
   - `src/index.js` must export the app: `export default app;`

### Issue: Function Timeout

**Symptoms:**
- Requests timeout after 10 seconds
- Long-running operations fail

**Solution:**
- Already configured in `vercel.json` with `maxDuration: 30`
- For longer operations, upgrade to Vercel Pro (up to 300 seconds)

### Issue: Database Not Working

**Symptoms:**
- Database errors
- Data not persisting

**Solutions:**

1. **Check Database Path**
   - In Vercel, database uses `/tmp/carecircle-application.db`
   - This is automatically handled in `db.js`

2. **Remember: SQLite is Ephemeral**
   - Data resets on each deployment
   - Data not shared between function invocations
   - Consider migrating to Vercel Postgres for production

### Issue: Module Not Found Errors

**Symptoms:**
- `Cannot find module` errors
- Import errors

**Solutions:**

1. **Check package.json**
   - All dependencies must be listed
   - Run `npm install` locally to verify

2. **Check Node Version**
   - Ensure `engines.node` is set in `package.json`
   - Vercel uses Node 18+ by default

3. **Verify ES Modules**
   - `package.json` should have `"type": "module"`
   - Imports should use `.js` extension

### Issue: CORS Errors

**Symptoms:**
- Frontend can't call API
- CORS policy errors in browser

**Solution:**
- CORS is already configured in `src/index.js`
- If issues persist, check `cors` package is installed

### Issue: Swagger UI Not Loading

**Symptoms:**
- `/docs` endpoint returns 404 or errors

**Solution:**
- Swagger UI should work automatically
- Check that `swagger-ui-express` is in dependencies
- Verify routes are properly configured

## Deployment Checklist

Before deploying, verify:

- [ ] Root directory is set to `apps/api` in Vercel
- [ ] `api/index.js` exists and exports the app
- [ ] `src/index.js` exports the app
- [ ] `vercel.json` only has `functions` property
- [ ] All dependencies in `package.json`
- [ ] `package.json` has `"type": "module"`
- [ ] Environment variables set (if needed)

## Testing Locally with Vercel CLI

```bash
cd apps/api
vercel dev
```

This will:
- Simulate Vercel environment locally
- Test serverless function behavior
- Help debug issues before deployment

## Getting Help

1. Check Vercel build logs for specific errors
2. Check function logs in Vercel dashboard
3. Test with `vercel dev` locally
4. Review [Vercel Serverless Functions Docs](https://vercel.com/docs/functions)

