import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import connectDB from './db';
import User from '../models/User';
import { env } from './config';
import { ensureUserHasRole } from './roles';

export const TOKEN_COOKIE = 'token';
const TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export function signToken(payload) {
  if (!env.JWT_SECRET) {
    throw new Error('Please define JWT_SECRET in your .env');
  }
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: TOKEN_MAX_AGE });
}

export function setAuthCookie(res, token) {
  const isProd = env.NODE_ENV === 'production';
  res.setHeader(
    'Set-Cookie',
    cookie.serialize(TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: TOKEN_MAX_AGE,
    })
  );
}

export function clearAuthCookie(res) {
  res.setHeader(
    'Set-Cookie',
    cookie.serialize(TOKEN_COOKIE, '', {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(0),
    })
  );
}

export function extractTokenFromRequest(req) {
  const headerToken = req.headers.authorization || req.headers.Authorization;
  if (headerToken && headerToken.startsWith('Bearer ')) {
    return headerToken.slice(7).trim();
  }
  if (req.headers.cookie) {
    const cookies = cookie.parse(req.headers.cookie);
    if (cookies && cookies[TOKEN_COOKIE]) {
      return cookies[TOKEN_COOKIE];
    }
  }
  if (req.cookies && req.cookies[TOKEN_COOKIE]) {
    return req.cookies[TOKEN_COOKIE];
  }
  return null;
}

export async function getUserFromRequest(req) {
  const token = extractTokenFromRequest(req);
  if (!token) return null;
  try {
    if (!env.JWT_SECRET) return null;
    const decoded = jwt.verify(token, env.JWT_SECRET);
    await connectDB();
    const user = await User.findById(decoded.id).select('-password');
    if (user) {
      await ensureUserHasRole(user);
    }
    return user || null;
  } catch (e) {
    return null;
  }
}


