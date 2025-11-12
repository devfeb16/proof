import { me } from '../../../controllers/authController';
import { getUserFromRequest } from '../../../lib/auth';
import { jsonError } from '../../../lib/response';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return jsonError(res, 405, `Method ${req.method} not allowed`);
  }
  const user = await getUserFromRequest(req);
  req.user = user;
  return me(req, res);
}

