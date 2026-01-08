/**
 * Vercel Serverless Function Entry Point
 * 
 * This file exports the Express app for Vercel's serverless environment.
 * Vercel will automatically route all requests to this handler.
 */

import app from "../src/index.js";

// Export the Express app directly - Vercel will handle it
export default app;

