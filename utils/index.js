import { jsonSuccess, jsonError } from '../lib/response';
export { jsonSuccess, jsonError };
export function validationError(res, details) {
  return jsonError(res, 400, 'Validation error', details);
}
export { logger } from './logger';
export { applyCors } from './cors';
export { withErrorHandling } from './asyncHandler';
export {
  calculateProofScorePlaceholder,
  normalizeFundingDataPlaceholder,
} from './proofscore';


