import {
  fetchJobs,
  applyToJob,
  fetchCandidatesByJob,
  fetchAllCandidatesFromAllJobs,
  fetchAllWorkflowStages,
  fetchJobById,
  fetchCandidateById,
} from '../services/loxoService.js';
import { jsonError, jsonSuccess } from '../lib/response.js';

const PRE_QUALIFIED_STAGE_NAME = 'Pre Qualified';

export async function getJobs(req, res) {
  try {
    const jobs = await fetchJobs();
    return jsonSuccess(res, 200, 'Jobs fetched successfully', jobs);
  } catch (error) {
    return jsonError(res, 500, 'Failed to fetch jobs', error.message);
  }
}

export async function getJobById(req, res, jobId) {
  if (!jobId) {
    return jsonError(res, 400, 'Missing jobId');
  }

  try {
    const job = await fetchJobById(jobId);
    if (!job) {
      return jsonError(res, 404, 'Job not found');
    }
    return jsonSuccess(res, 200, 'Job fetched successfully', job);
  } catch (error) {
    return jsonError(res, 500, 'Failed to fetch job', error.message);
  }
}

export async function applyToLoxoJob(req, res) {
  const { jobId, candidate } = req.body || {};

  if (!jobId || !candidate) {
    return jsonError(res, 400, 'Missing jobId or candidate information');
  }

  try {
    const response = await applyToJob(jobId, candidate);
    return jsonSuccess(res, 200, 'Candidate applied successfully', response);
  } catch (error) {
    return jsonError(res, 500, 'Failed to apply candidate to job', error.message);
  }
}

export async function getSelectedCandidates(req, res, jobId) {
  if (!jobId) {
    return jsonError(res, 400, 'Missing jobId');
  }

  try {
    const candidates = await fetchCandidatesByJob(jobId);
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return jsonError(res, 404, 'No candidates found for this job');
    }

    const selected = candidates.filter(
      (candidate) => Number(candidate.workflow_stage_id) === 318339
    );

    return jsonSuccess(res, 200, `Selected candidates fetched for job ${jobId}`, {
      total: selected.length,
      candidates: selected,
    });
  } catch (error) {
    return jsonError(res, 500, 'Failed to fetch selected candidates', error.message);
  }
}

export async function getAllCandidatesInAJob(req, res, jobId) {
  if (!jobId) {
    return jsonError(res, 400, 'Missing jobId');
  }

  try {
    const candidates = await fetchCandidatesByJob(jobId);
    return jsonSuccess(res, 200, `All candidates fetched for job ${jobId}`, {
      total: candidates.length,
      candidates,
    });
  } catch (error) {
    return jsonError(res, 500, 'Failed to fetch candidates for job', error.message);
  }
}

export async function getCandidateById(req, res, jobId, candidateId) {
  if (!jobId) {
    return jsonError(res, 400, 'Missing jobId');
  }
  if (!candidateId) {
    return jsonError(res, 400, 'Missing candidateId');
  }

  try {
    const candidate = await fetchCandidateById(jobId, candidateId);
    if (!candidate) {
      return jsonError(res, 404, 'Candidate not found');
    }
    return jsonSuccess(res, 200, 'Candidate fetched successfully', candidate);
  } catch (error) {
    return jsonError(res, 500, 'Failed to fetch candidate', error.message);
  }
}

export function filterCandidatesByStage(allCandidates, allStages, stageName) {
  if (!Array.isArray(allStages) || allStages.length === 0) {
    throw new Error('Workflow stages are required to filter candidates');
  }

  const targetStage = allStages.find((stage) => stage.name === stageName);
  if (!targetStage) {
    throw new Error(`${stageName} stage not found in workflow stages`);
  }

  const targetStageId = Number(targetStage.id);

  return Array.isArray(allCandidates)
    ? allCandidates.filter(
        (candidate) => Number(candidate.workflow_stage_id) === targetStageId
      )
    : [];
}

export async function getPreQualifiedCandidates(req, res) {
  try {
    const allCandidates = await fetchAllCandidatesFromAllJobs();
    const stages = await fetchAllWorkflowStages();
    const preQualifiedCandidates = filterCandidatesByStage(
      allCandidates,
      stages,
      PRE_QUALIFIED_STAGE_NAME
    );

    return jsonSuccess(res, 200, 'Pre-qualified candidates fetched successfully', {
      summary: {
        totalCandidates: allCandidates.length,
        preQualifiedCount: preQualifiedCandidates.length,
      },
      candidates: preQualifiedCandidates,
    });
  } catch (error) {
    return jsonError(res, 500, 'Failed to fetch pre-qualified candidates', error.message);
  }
}

export async function testLoxoResponse(req, res) {
  const payload = {
    message: 'Loxo endpoint is working',
    timestamp: new Date().toISOString(),
    test: true,
  };
  return jsonSuccess(res, 200, 'Test response successful', payload);
}

export async function getStagingIds(req, res) {
  try {
    const stages = await fetchAllWorkflowStages();
    return jsonSuccess(res, 200, 'Workflow stages fetched successfully', { stages });
  } catch (error) {
    return jsonError(res, 500, 'Failed to fetch workflow stages', error.message);
  }
}

export async function getAllCandidatesInEveryStage(req, res) {
  try {
    const allCandidates = await fetchAllCandidatesFromAllJobs();
    return jsonSuccess(
      res,
      200,
      `Fetched ${allCandidates.length} candidates across all jobs`,
      {
        total: allCandidates.length,
        candidates: allCandidates,
      }
    );
  } catch (error) {
    return jsonError(res, 500, 'Failed to fetch all candidates', error.message);
  }
}

