import { jsonError, jsonSuccess } from '../../../lib/response';
import { applyCors } from '../../../utils';

const EXPORT_OPTIONS = [
  {
    id: 'kpi-csv',
    label: 'KPI snapshot (CSV)',
    description: 'Download core metrics with trailing comparisons for your own analysis.',
    format: 'CSV',
    eta: '2 min',
  },
  {
    id: 'executive-deck',
    label: 'Executive summary deck',
    description: 'Slide-ready summary with top KPIs, funnel health, and regional mix.',
    format: 'PPTX',
    eta: '5 min',
  },
  {
    id: 'compliance-pack',
    label: 'Compliance pack',
    description: 'Detailed audit trail with requisition history and approvals.',
    format: 'PDF',
    eta: '8 min',
  },
];

const LAST_GENERATED_AT = new Date(Date.now() - 1000 * 60 * 35).toISOString();

export default async function handler(req, res) {
  if (await applyCors(req, res)) return;

  if (req.method === 'GET') {
    return jsonSuccess(res, 200, 'Export options ready', {
      options: EXPORT_OPTIONS,
      lastGeneratedAt: LAST_GENERATED_AT,
    });
  }

  if (req.method === 'POST') {
    try {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const rawBody = Buffer.concat(chunks).toString('utf8') || '{}';
      const trimmedBody = rawBody.trim() || '{}';
      const body = JSON.parse(trimmedBody);
      const { optionId } = body || {};
      const option = EXPORT_OPTIONS.find((item) => item.id === optionId);
      if (!option) {
        return jsonError(res, 400, 'Export template not found');
      }

      return jsonSuccess(res, 202, 'Export has been queued. You will receive a link once it is ready.', {
        optionId,
        readyAt: new Date(Date.now() + 1000 * 60 * 3).toISOString(),
      });
    } catch (error) {
      return jsonError(res, 400, 'Unable to queue export', error?.message);
    }
  }

  return jsonError(res, 405, 'Method not allowed');
}





