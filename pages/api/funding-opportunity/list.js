import { applyCors, withErrorHandling } from '../../../utils';
import { jsonError } from '../../../lib/response';
import { listFundingOpportunities } from '../../../controllers/fundingController';

export const config = {
  api: {
    bodyParser: true,
  },
};

async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET', 'OPTIONS']);
    return jsonError(res, 405, `Method ${req.method} not allowed`);
  }
  return listFundingOpportunities(req, res);
}

export default withErrorHandling(handler);


