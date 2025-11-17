// Health check endpoint for deployment
// Access at: http://localhost:3000/api/test

import { applyCors } from '../../utils';

export default async function handler(req, res) {
  // Apply CORS but don't fail if it has issues
  try {
    if (await applyCors(req, res)) return;
  } catch (corsError) {
    // If CORS fails, continue anyway for health checks
    console.warn('CORS error in health check:', corsError.message);
  }

  if (req.method === 'GET') {
    try {
      // Simple health check - just return success
      res.status(200).json({
        success: true,
        message: 'API is working!',
        timestamp: new Date().toISOString(),
        status: 'healthy',
      });
    } catch (error) {
      // Even on error, return 200 for health check purposes
      // The deployment script can check the success field
      res.status(200).json({
        success: false,
        message: 'Error processing request',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  } else if (req.method === 'OPTIONS') {
    res.status(204).end();
  } else {
    res.setHeader('Allow', ['GET', 'OPTIONS']);
    res.status(405).json({ message: `Method ${req.method} not allowed` });
  }
}

