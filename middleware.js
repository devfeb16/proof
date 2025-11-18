import { NextResponse } from 'next/server';

/**
 * Middleware for Next.js
 * 
 * This file exists to ensure Next.js generates required manifest files
 * (middleware-manifest.json, routes-manifest.json) in dev mode.
 * 
 * You can add route protection or other middleware logic here if needed.
 */
export function middleware(request) {
  // No-op middleware - just ensures manifest files are generated
  // Add your middleware logic here if needed (e.g., auth checks, redirects)
  return NextResponse.next();
}

// Optional: Configure which routes the middleware runs on
// If not specified, middleware runs on all routes
// export const config = {
//   matcher: ['/dashboard/:path*', '/api/:path*']
// }

