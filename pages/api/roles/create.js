import authMiddleware from '../../../middlewares/authMiddleware';
import roleMiddleware from '../../../middlewares/roleMiddleware';
import { createRole } from '../../../controllers/roleController';
import { jsonError } from '../../../lib/response';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return jsonError(res, 405, `Method ${req.method} not allowed`);
  }
  const user = await authMiddleware(req, res);
  if (!user) return;
  if (!roleMiddleware(['admin', 'superadmin'])(req, res)) return;
  return createRole(req, res);
}


