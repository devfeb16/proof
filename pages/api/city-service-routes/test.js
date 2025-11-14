import { testRoute } from '../../../controllers/cityServiceRouteController';
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
 * Test City Service Route API
 * Week 1 Task: Test route validation and metadata generation
 * POST: Test route parameters
 */
async function handler(req, res) {
  if (await applyCors(req, res)) return;

  // All operations require authentication (except base_user)
  const authResult = await authMiddleware(req, res);
  if (!authResult) return;

  // Check role - exclude base_user
  const roleCheck = roleMiddleware(['admin', 'superadmin', 'hr', 'hr_admin', 'marketing', 'developer']);
  if (!roleCheck(req, res)) return;

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'OPTIONS']);
    return jsonError(res, 405, `Method ${req.method} not allowed`);
  }

  return await testRoute(req, res);
}

export default withErrorHandling(handler);

