import { applyCors, withErrorHandling } from '../../../utils';
import { jsonError } from '../../../lib/response';
import { getUserFromRequest } from '../../../lib/auth';
import { getScrapedDataById, deleteScrapedDataById } from '../../../controllers/scraperController';

export const config = {
  api: {
    bodyParser: true,
  },
};

async function handler(req, res) {
  if (await applyCors(req, res)) return;

  const currentUser = await getUserFromRequest(req);
  const { id } = req.query;

  switch (req.method) {
    case 'GET':
      return getScrapedDataById(req, res, currentUser, id);
    case 'DELETE':
      return deleteScrapedDataById(req, res, currentUser, id);
    case 'OPTIONS':
      return res.status(204).end();
    default:
      res.setHeader('Allow', ['GET', 'DELETE', 'OPTIONS']);
      return jsonError(res, 405, `Method ${req.method} not allowed`);
  }
}

export default withErrorHandling(handler);

