import { signup } from '../../../controllers/authController';
import { jsonError } from '../../../lib/response';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return jsonError(res, 405, `Method ${req.method} not allowed`);
  }
  return signup(req, res);
}

