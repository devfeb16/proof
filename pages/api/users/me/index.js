import authMiddleware from '../../../../middlewares/authMiddleware';
import { getCurrentUser, updateCurrentUser } from '../../../../controllers/userController';
import { jsonError } from '../../../../lib/response';

export default async function handler(req, res) {
  const user = await authMiddleware(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    return getCurrentUser(req, res);
  }

  if (req.method === 'PUT') {
    return updateCurrentUser(req, res);
  }

  res.setHeader('Allow', ['GET', 'PUT']);
  return jsonError(res, 405, `Method ${req.method} not allowed`);
}

