import { listRoutes, createRoute } from '../../../controllers/cityServiceRouteController';
import authMiddleware from '../../../middlewares/authMiddleware';
import roleMiddleware from '../../../middlewares/roleMiddleware';
import { withErrorHandling, applyCors } from '../../../utils';
import { jsonError } from '../../../lib/response';

export const config = {
  api: {
    bodyParser: true,
  },
};

/**
 * City Service Routes API
 * Week 1 Task: Dynamic endpoint creation management
 * GET: List routes
 * POST: Create route
 */
async function handler(req, res) {
  if (await applyCors(req, res)) return;

  // All operations require authentication (except base_user)
  const authResult = await authMiddleware(req, res);
  if (!authResult) return;

  // Check role - exclude base_user
  const roleCheck = roleMiddleware(['admin', 'superadmin', 'hr', 'hr_admin', 'marketing', 'developer']);
  if (!roleCheck(req, res)) return;

  switch (req.method) {
    case 'GET':
      return await listRoutes(req, res);
    case 'POST':
      return await createRoute(req, res);
    case 'OPTIONS':
      return res.status(204).end();
    default:
      res.setHeader('Allow', ['GET', 'POST', 'OPTIONS']);
      return jsonError(res, 405, `Method ${req.method} not allowed`);
  }
}

export default withErrorHandling(handler);

