import connectDB from '../../../lib/db';
import User from '../../../models/User';
import authMiddleware from '../../../middlewares/authMiddleware';
import roleMiddleware from '../../../middlewares/roleMiddleware';
import { jsonError, jsonSuccess } from '../../../lib/response';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return jsonError(res, 405, `Method ${req.method} not allowed`);
  }

  const sessionUser = await authMiddleware(req, res);
  if (!sessionUser) return;
  if (!roleMiddleware(['admin', 'superadmin', 'hr'])(req, res)) return;

  try {
    await connectDB();
    const users = await User.find({ role: { $ne: 'base_user' } })
      .select('name email role createdAt updatedAt')
      .sort({ createdAt: -1 });

    const normalizedUsers = users.map((userDoc) => ({
      id: userDoc._id.toString(),
      name: userDoc.name,
      email: userDoc.email,
      role: userDoc.role,
      createdAt: userDoc.createdAt,
      updatedAt: userDoc.updatedAt,
    }));

    return jsonSuccess(res, 200, 'Users fetched', normalizedUsers);
  } catch (error) {
    return jsonError(res, 500, 'Failed to fetch users', error.message);
  }
}


