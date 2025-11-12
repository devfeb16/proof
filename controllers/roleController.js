import connectDB from '../lib/db';
import Role from '../models/Role';
import User from '../models/User';
import { jsonError, jsonSuccess } from '../lib/response';

const RESERVED_ROLES = new Set(['superadmin', 'admin', 'hr', 'marketing', 'developer', 'base_user']);

export async function createRole(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return jsonError(res, 405, `Method ${req.method} not allowed`);
  }
  const { name, description = '' } = req.body || {};
  if (!name || typeof name !== 'string' || !name.trim()) {
    return jsonError(res, 400, 'Role name is required');
  }
  const normalizedName = name.trim().toLowerCase();
  try {
    await connectDB();
    const exists = await Role.findOne({ name: normalizedName });
    if (exists) {
      return jsonError(res, 409, 'Role already exists');
    }
    const role = await Role.create({ name: normalizedName, description: typeof description === 'string' ? description.trim() : '' });
    return jsonSuccess(res, 201, 'Role created', { role });
  } catch (err) {
    return jsonError(res, 500, 'Failed to create role', err.message);
  }
}

export async function listRoles(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return jsonError(res, 405, `Method ${req.method} not allowed`);
  }
  try {
    await connectDB();
    const roles = await Role.find().sort({ name: 1 });
    return jsonSuccess(res, 200, 'Ok', { roles });
  } catch (err) {
    return jsonError(res, 500, 'Failed to list roles', err.message);
  }
}

export async function deleteRole(req, res) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return jsonError(res, 405, `Method ${req.method} not allowed`);
  }
  const { id } = req.query || {};
  if (!id) {
    return jsonError(res, 400, 'Role id is required');
  }
  try {
    await connectDB();
    const role = await Role.findById(id);
    if (!role) {
      return jsonError(res, 404, 'Role not found');
    }
    if (RESERVED_ROLES.has(role.name)) {
      return jsonError(res, 400, 'Cannot delete a reserved system role');
    }
    const inUse = (await User.exists({ roleRef: role._id })) || (await User.exists({ role: role.name }));
    if (inUse) {
      return jsonError(res, 400, 'Role in use by existing users');
    }
    await Role.findByIdAndDelete(id);
    return jsonSuccess(res, 200, 'Role deleted');
  } catch (err) {
    return jsonError(res, 500, 'Failed to delete role', err.message);
  }
}


