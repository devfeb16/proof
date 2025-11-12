import jwt from 'jsonwebtoken';
import connectDB from '../lib/db';
import User from '../models/User';
import { env } from '../lib/config';
import { jsonError } from '../lib/response';
import { extractTokenFromRequest } from '../lib/auth';
import { ensureUserHasRole } from '../lib/roles';

export default async function authMiddleware(req, res) {
  const token = extractTokenFromRequest(req);
  if (!token) {
    jsonError(res, 401, 'Authentication required');
    return null;
  }
  if (!env.JWT_SECRET) {
    jsonError(res, 500, 'Server misconfiguration: JWT secret not set');
    return null;
  }
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    await connectDB();
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      jsonError(res, 401, 'Invalid token');
      return null;
    }
    await ensureUserHasRole(user);
    req.user = user;
    req.token = token;
    req.jwt = decoded;
    return user;
  } catch (err) {
    jsonError(res, 401, 'Invalid or expired token', err.message);
    return null;
  }
}


