import connectDB from '../../../lib/db';
import User from '../../../models/User';
import Role from '../../../models/Role';
import authMiddleware from '../../../middlewares/authMiddleware';
import roleMiddleware from '../../../middlewares/roleMiddleware';
import { jsonError, jsonSuccess } from '../../../lib/response';

export default async function handler(req, res) {
  const { method, query: { id } } = req;
  await connectDB();

  switch (method) {
    case 'GET': {
      try {
        const user = await User.findById(id).select('-password');
        if (!user) return jsonError(res, 404, 'User not found');
        return jsonSuccess(res, 200, 'Ok', { user });
      } catch (err) {
        return jsonError(res, 500, 'Failed to fetch user', err.message);
      }
    }
    case 'PUT': {
      try {
        const currentUser = await authMiddleware(req, res);
        if (!currentUser) return;
        const update = req.body || {};
        // Prevent role changes unless admin
        let roleRefUpdate = null;
        if (update.role) {
          if (!roleMiddleware(['admin', 'superadmin'])(req, res)) return;
          const normalizedRole = typeof update.role === 'string' ? update.role.trim().toLowerCase() : '';
          if (!normalizedRole) {
            return jsonError(res, 400, 'Role must be a non-empty string');
          }
          const roleDoc = await Role.findOne({ name: normalizedRole });
          if (!roleDoc) {
            return jsonError(res, 400, 'Role does not exist');
          }
          update.role = normalizedRole;
          roleRefUpdate = roleDoc._id;
        }
        if (update.password) delete update.password; // Use dedicated password change flow if needed
        if (roleRefUpdate) {
          update.roleRef = roleRefUpdate;
        }
        const user = await User.findByIdAndUpdate(id, update, { new: true, runValidators: true }).select('-password');
        if (!user) return jsonError(res, 404, 'User not found');
        return jsonSuccess(res, 200, 'User updated', { user });
      } catch (err) {
        return jsonError(res, 500, 'Failed to update user', err.message);
      }
    }
    case 'DELETE': {
      try {
        const currentUser = await authMiddleware(req, res);
        if (!currentUser) return;
        if (!roleMiddleware(['admin', 'superadmin'])(req, res)) return;
        const user = await User.findByIdAndDelete(id).select('-password');
        if (!user) return jsonError(res, 404, 'User not found');
        return jsonSuccess(res, 200, 'User deleted', { user });
      } catch (err) {
        return jsonError(res, 500, 'Failed to delete user', err.message);
      }
    }
    default: {
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return jsonError(res, 405, `Method ${method} not allowed`);
    }
  }
}

