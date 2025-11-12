import dotenv from 'dotenv';

// Load .env and .env.local variables for server-side code and API routes
// Try .env first, then .env.local explicitly (Next also loads these, but we ensure availability here)
dotenv.config();
dotenv.config({ path: '.env.local' });

// Build a normalized env object used across server modules
const isProd = process.env.NODE_ENV === 'production';

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  // Prefer explicit env; in development provide a safe local default to avoid crashes
  MONGODB_URI:
    process.env.MONGODB_URI ||
    (!isProd ? 'mongodb://127.0.0.1:27017/proofresponse' : ''),
  // In development, provide a safe placeholder to avoid blocking local auth if .env is not parsed
  JWT_SECRET: process.env.JWT_SECRET || (!isProd ? 'dev-jwt-secret-change-me' : ''),
  NEXT_PUBLIC_BASE_URL:
    process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
  SUPERADMIN_SETUP_TOKEN: process.env.SUPERADMIN_SETUP_TOKEN || '',
};

// In production, enforce presence of required vars early
export function assertServerEnv() {
  if (isProd) {
    if (!env.MONGODB_URI) {
      throw new Error('Missing env: MONGODB_URI is required in production');
    }
    if (!env.JWT_SECRET) {
      throw new Error('Missing env: JWT_SECRET is required in production');
    }
  }
}


