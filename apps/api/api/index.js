/**
 * Vercel Serverless Function Entry Point
 * 
 * This file wraps the Express app for Vercel's serverless environment.
 * Vercel will automatically route all requests to this handler.
 */

import app from "../src/index.js";

// Export the Express app as a serverless function
// The app is already exported from src/index.js, but we re-export here
// for clarity and to ensure proper Vercel routing
export default app;

