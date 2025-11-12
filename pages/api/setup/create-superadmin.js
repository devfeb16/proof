import { createInitialSuperAdmin } from '../../../controllers/authController';

export default async function handler(req, res) {
  return createInitialSuperAdmin(req, res);
}


