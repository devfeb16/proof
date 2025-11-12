import connectDB from './db';
import Role from '../models/Role';
import User from '../models/User';

const BASE_ROLE_NAME = 'base_user';
const BASE_ROLE_DESCRIPTION = 'Default role for new users';

export async function ensureRole(name, description = '') {
  const normalized = typeof name === 'string' ? name.trim().toLowerCase() : '';
  if (!normalized) {
    throw new Error('Role name is required');
  }
  await connectDB();
  const existing = await Role.findOne({ name: normalized });
  if (existing) {
    return existing;
  }
  return Role.create({ name: normalized, description });
}

export async function ensureUserHasRole(userDoc, options = {}) {
  if (!userDoc) return null;
  const currentRole = typeof userDoc.role === 'string' ? userDoc.role.trim() : '';
  if (currentRole) {
    return userDoc;
  }
  const fallbackRoleName = options.fallbackRoleName || BASE_ROLE_NAME;
  const fallbackRoleDescription =
    options.fallbackRoleDescription ||
    (fallbackRoleName === BASE_ROLE_NAME ? BASE_ROLE_DESCRIPTION : '');
  const fallbackRole = await ensureRole(fallbackRoleName, fallbackRoleDescription);
  await User.updateOne(
    { _id: userDoc._id },
    { $set: { role: fallbackRole.name, roleRef: fallbackRole._id } }
  );
  userDoc.role = fallbackRole.name;
  userDoc.roleRef = fallbackRole._id;
  return userDoc;
}


