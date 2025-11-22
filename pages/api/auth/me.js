import { me } from '../../../controllers/authController';
import { getUserFromRequest } from '../../../lib/auth';
import { jsonError } from '../../../lib/response';
import { applyCors } from '../../../utils';

export default async function handler(req, res) {
  if (await applyCors(req, res)) return;

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return jsonError(res, 405, `Method ${req.method} not allowed`);
  }

  const user = await getUserFromRequest(req);
  try {
    console.log('/api/auth/me result', {
      hasToken: Boolean(req.headers.cookie),
      userId: user?._id || user?.id || null,
      role: user?.role || null,
      email: user?.email || null,
      origin: req.headers.origin,
      host: req.headers.host,
      forwardedHost: req.headers['x-forwarded-host'],
      forwardedProto: req.headers['x-forwarded-proto'],
    });
  } catch {
    // Avoid crashing if logging fails
  }

  req.user = user;
  return me(req, res);
}

