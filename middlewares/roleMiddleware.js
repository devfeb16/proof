import { jsonError } from '../lib/response';

export default function roleMiddleware(allowedRoles = []) {
  const normalized = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return (req, res) => {
    if (!req.user) {
      jsonError(res, 401, 'Authentication required');
      return false;
    }
    if (!normalized.length) {
      return true;
    }
    const hasAccess = normalized.includes(req.user.role) || req.user.role === 'superadmin';
    if (!hasAccess) {
      jsonError(res, 403, 'Insufficient role permissions');
      return false;
    }
    return true;
  };
}


