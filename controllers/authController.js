import connectDB from '../lib/db';
import User from '../models/User';
import { signToken, setAuthCookie, clearAuthCookie } from '../lib/auth';
import { jsonError, jsonSuccess } from '../lib/response';
import { env } from '../lib/config';
import { ensureRole, ensureUserHasRole } from '../lib/roles';
import { ensureDefaultHrUser } from '../lib/defaultUsers';

const DEFAULT_ROLES = [
  { name: 'superadmin', description: 'Highest privileged role' },
  { name: 'admin', description: 'Administrative access' },
  { name: 'hr', description: 'Human resources role' },
  { name: 'marketing', description: 'Marketing role' },
  { name: 'developer', description: 'Technical role' },
  { name: 'base_user', description: 'Default role for new users' },
];

function sanitizeUser(userDoc) {
  return {
    id: userDoc._id,
    name: userDoc.name,
    email: userDoc.email,
    role: userDoc.role || 'hr',
    roleRef: userDoc.roleRef,
    createdAt: userDoc.createdAt,
  };
}

export async function signup(req, res) {
  const { name, email, password } = req.body || {};
  const missing = [];
  if (!name) missing.push('name');
  if (!email) missing.push('email');
  if (!password) missing.push('password');
  if (missing.length) {
    return jsonError(res, 400, `Missing required field(s): ${missing.join(', ')}`);
  }
  const emailOk = typeof email === 'string' && /.+@.+\..+/.test(email);
  if (!emailOk) {
    return jsonError(res, 400, 'Invalid email format');
  }
  if (!env.JWT_SECRET) {
    return jsonError(res, 500, 'Server misconfiguration: JWT_SECRET not set');
  }
  try {
    await connectDB();
    const existing = await User.findOne({ email });
    if (existing) {
      return jsonError(res, 409, 'Email already registered');
    }
    const hrRole = await ensureRole('hr', 'Human resources role');
    const user = await User.create({
      name,
      email,
      password,
      role: hrRole.name,
      roleRef: hrRole._id,
    });
    const token = signToken({ id: user._id, role: user.role });
    setAuthCookie(res, token);
    return jsonSuccess(res, 201, 'Signup successful', {
      user: sanitizeUser(user),
      token,
    });
  } catch (err) {
    return jsonError(res, 500, 'Unable to signup', err.message);
  }
}

export async function login(req, res) {
  const { email, password } = req.body || {};
  const missing = [];
  if (!email) missing.push('email');
  if (!password) missing.push('password');
  if (missing.length) {
    return jsonError(res, 400, `Missing required field(s): ${missing.join(', ')}`);
  }
  try {
    await connectDB();
    await ensureDefaultHrUser();
    const user = await User.findOne({ email });
    if (!user) {
      return jsonError(res, 401, 'Email not found');
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return jsonError(res, 401, 'Invalid password');
    }
    await ensureUserHasRole(user);
    if (!env.JWT_SECRET) {
      return jsonError(res, 500, 'Server misconfiguration: JWT_SECRET not set');
    }
    const token = signToken({ id: user._id, role: user.role });
    setAuthCookie(res, token);
    return jsonSuccess(res, 200, 'Login successful', {
      user: sanitizeUser(user),
      token,
    });
  } catch (err) {
    return jsonError(res, 500, 'Login failed', err.message);
  }
}

export async function logout(req, res) {
  clearAuthCookie(res);
  return jsonSuccess(res, 200, 'Logged out');
}

export async function me(req, res) {
  if (!req.user) {
    return jsonSuccess(res, 200, 'Ok', { user: null });
  }
  return jsonSuccess(res, 200, 'Ok', { user: sanitizeUser(req.user) });
}

export async function createInitialSuperAdmin(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return jsonError(res, 405, `Method ${req.method} not allowed`);
  }
  const setupToken = env.SUPERADMIN_SETUP_TOKEN;
  if (!setupToken) {
    return jsonError(res, 403, 'Setup token not configured');
  }
  const providedToken = req.headers['x-setup-token'] || req.query.token || req.body?.token;
  if (providedToken !== setupToken) {
    return jsonError(res, 403, 'Invalid setup token');
  }
  try {
    await connectDB();
    const existingSuperAdmin = await User.exists({ role: 'superadmin' });
    if (existingSuperAdmin) {
      return jsonError(res, 403, 'Superadmin already exists');
    }
    const { name, email, password } = req.body || {};
    const missing = [];
    if (!name) missing.push('name');
    if (!email) missing.push('email');
    if (!password) missing.push('password');
    if (missing.length) {
      return jsonError(res, 400, `Missing required field(s): ${missing.join(', ')}`);
    }
    const emailOk = typeof email === 'string' && /.+@.+\..+/.test(email);
    if (!emailOk) {
      return jsonError(res, 400, 'Invalid email format');
    }
    const superRole = await ensureRole('superadmin', 'Highest privileged role');
    await Promise.all(
      DEFAULT_ROLES.filter((role) => role.name !== 'superadmin').map((role) =>
        ensureRole(role.name, role.description)
      )
    );
    const user = await User.create({
      name,
      email,
      password,
      role: superRole.name,
      roleRef: superRole._id,
    });
    return jsonSuccess(res, 201, 'Superadmin created', { user: sanitizeUser(user) });
  } catch (err) {
    return jsonError(res, 500, 'Failed to create superadmin', err.message);
  }
}


