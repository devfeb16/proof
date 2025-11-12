import connectDB from '../../../lib/db';
import User from '../../../models/User';
import Role from '../../../models/Role';
import authMiddleware from '../../../middlewares/authMiddleware';
import roleMiddleware from '../../../middlewares/roleMiddleware';
import { jsonError, jsonSuccess } from '../../../lib/response';

async function ensureBaseRole() {
  const existing = await Role.findOne({ name: 'base_user' });
  if (existing) return existing;
  return Role.create({ name: 'base_user', description: 'Default role for new users' });
}

export default async function handler(req, res) {
  const { method } = req;
  await connectDB();

  switch (method) {
    case 'GET': {
      try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        return jsonSuccess(res, 200, 'Ok', { users });
      } catch (err) {
        return jsonError(res, 500, 'Failed to fetch users', err.message);
      }
    }
    case 'POST': {
      try {
        const user = await authMiddleware(req, res);
        if (!user) return;
        if (!roleMiddleware(['admin', 'superadmin'])(req, res)) return;
        const { name, email, password, role } = req.body || {};
        if (!name || !email || !password) {
          return jsonError(res, 400, 'Name, email, and password are required');
        }
        const exists = await User.findOne({ email });
        if (exists) return jsonError(res, 409, 'Email already in use');
        const normalizedRole = typeof role === 'string' && role.trim() ? role.trim().toLowerCase() : 'base_user';
        let roleRef = null;
        if (normalizedRole === 'base_user') {
          const baseRole = await ensureBaseRole();
          roleRef = baseRole._id;
        } else {
          const roleDoc = await Role.findOne({ name: normalizedRole });
          if (!roleDoc) {
            return jsonError(res, 400, 'Role does not exist');
          }
          roleRef = roleDoc._id;
        }
        const created = await User.create({ name, email, password, role: normalizedRole, roleRef });
        const safe = { id: created._id, name: created.name, email: created.email, role: created.role };
        return jsonSuccess(res, 201, 'User created', { user: safe });
      } catch (err) {
        return jsonError(res, 500, 'Failed to create user', err.message);
      }
    }
    default: {
      res.setHeader('Allow', ['GET', 'POST']);
      return jsonError(res, 405, `Method ${method} not allowed`);
    }
  }
}

