import { getRoute, updateRoute, deleteRoute } from '../../../controllers/cityServiceRouteController';
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
 * City Service Route API (by ID)
 * Week 1 Task: Dynamic endpoint creation management
 * GET: Get route by ID
 * PUT: Update route
 * DELETE: Delete route
 */
async function handler(req, res) {
  if (await applyCors(req, res)) return;

  // All operations require authentication (except base_user)
  const authResult = await authMiddleware(req, res);
  if (!authResult) return;

  // Check role - exclude base_user
  const roleCheck = roleMiddleware(['admin', 'superadmin', 'hr', 'hr_admin', 'marketing', 'developer']);
  if (!roleCheck(req, res)) return;

  // ID is already in req.query from Next.js dynamic route

  switch (req.method) {
    case 'GET':
      return await getRoute(req, res);
    case 'PUT':
      return await updateRoute(req, res);
    case 'DELETE':
      return await deleteRoute(req, res);
    case 'OPTIONS':
      return res.status(204).end();
    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE', 'OPTIONS']);
      return jsonError(res, 405, `Method ${req.method} not allowed`);
  }
}

export default withErrorHandling(handler);

