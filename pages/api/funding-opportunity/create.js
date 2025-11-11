import { applyCors, withErrorHandling } from '../../../utils';
import { jsonError } from '../../../lib/response';
import { getUserFromRequest } from '../../../lib/auth';
import { createFundingOpportunity } from '../../../controllers/fundingController';

export const config = {
  api: {
    bodyParser: true,
  },
};

async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'OPTIONS']);
    return jsonError(res, 405, `Method ${req.method} not allowed`);
  }

  const currentUser = await getUserFromRequest(req);
  return createFundingOpportunity(req, res, currentUser);
}

export default withErrorHandling(handler);


