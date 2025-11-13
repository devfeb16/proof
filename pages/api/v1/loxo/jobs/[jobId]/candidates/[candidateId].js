import { applyCors, withErrorHandling } from '../../../../../../../utils';
import { getCandidateById } from '../../../../../../../controllers/loxoController';
import { jsonError } from '../../../../../../../lib/response';

export const config = {
  api: {
    bodyParser: true,
  },
};

async function handler(req, res) {
  if (applyCors(req, res)) return;

  const { jobId, candidateId } = req.query || {};
  const resolvedJobId = Array.isArray(jobId) ? jobId[0] : jobId;
  const resolvedCandidateId = Array.isArray(candidateId) ? candidateId[0] : candidateId;

  switch (req.method) {
    case 'GET':
      return getCandidateById(req, res, resolvedJobId, resolvedCandidateId);
    default:
      res.setHeader('Allow', ['GET', 'OPTIONS']);
      return jsonError(res, 405, `Method ${req.method} not allowed`);
  }
}

export default withErrorHandling(handler);

