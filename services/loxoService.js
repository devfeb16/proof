import loxoClient from './loxoClient.js';

const PAGE_SIZE = 100;

export async function fetchJobs() {
  const allJobs = [];
  let scrollId = null;

  try {
    do {
      const params = { per_page: PAGE_SIZE };
      if (scrollId) {
        params.scroll_id = scrollId;
      }

      const data = await loxoClient.get('/jobs', { params });
      if (Array.isArray(data?.results)) {
        allJobs.push(...data.results);
      }
      scrollId = data?.scroll_id;
    } while (scrollId);

    return { jobs: { results: allJobs } };
  } catch (error) {
    console.error('❌ Error fetching jobs from Loxo:', error.message || error);
    throw new Error('Failed to fetch jobs from Loxo');
  }
}

export async function fetchJobById(jobId) {
  try {
    return await loxoClient.get(`/jobs/${jobId}`);
  } catch (error) {
    console.error(`❌ Error fetching job ${jobId} from Loxo:`, error.message || error);
    throw new Error('Failed to fetch job by ID');
  }
}

export async function applyToJob(jobId, candidateData) {
  try {
    return await loxoClient.post(`/jobs/${jobId}/apply`, {
      data: { person: candidateData },
    });
  } catch (error) {
    console.error(`❌ Error applying candidate to job ${jobId}:`, error.message || error);
    throw new Error(`Failed to apply to job with ID ${jobId}`);
  }
}

export async function fetchCandidatesByJob(jobId) {
  const allCandidates = [];
  let scrollId = null;

  try {
    do {
      const params = { per_page: PAGE_SIZE };
      if (scrollId) {
        params.scroll_id = scrollId;
      }

      const data = await loxoClient.get(`/jobs/${jobId}/candidates`, { params });

      if (Array.isArray(data?.candidates) && data.candidates.length > 0) {
        allCandidates.push(...data.candidates);
      }

      scrollId = data?.scroll_id;
    } while (scrollId);

    return allCandidates;
  } catch (error) {
    console.error(`❌ Error fetching candidates for job ${jobId}:`, error.message || error);
    throw new Error(`Failed to fetch candidates for job ID ${jobId}`);
  }
}

export async function fetchCandidateById(jobId, candidateId) {
  try {
    return await loxoClient.get(`/jobs/${jobId}/candidates/${candidateId}`);
  } catch (error) {
    console.error(
      `❌ Error fetching candidate ${candidateId} for job ${jobId}:`,
      error.message || error
    );
    throw new Error(`Failed to fetch candidate ${candidateId} for job ID ${jobId}`);
  }
}

export async function fetchAllWorkflowStages() {
  try {
    const data = await loxoClient.get('/workflow_stages');
    if (Array.isArray(data)) {
      return data;
    }
    if (Array.isArray(data?.results)) {
      return data.results;
    }
    return [];
  } catch (error) {
    console.error('❌ Error fetching Loxo workflow stages:', error.message || error);
    throw new Error('Failed to fetch workflow stages');
  }
}

export async function fetchAllCandidatesFromAllJobs() {
  try {
    const result = await fetchJobs();
    const jobs = result?.jobs?.results;

    if (!Array.isArray(jobs)) {
      throw new Error('Expected jobs to be an array');
    }

    const allCandidates = [];

    for (let i = 0; i < jobs.length; i += 1) {
      const job = jobs[i];
      try {
        console.log(`➡️  [${i + 1}/${jobs.length}] Fetching candidates for job: ${job.title} (${job.id})`);
        const candidates = await fetchCandidatesByJob(job.id);
        const enriched = candidates.map((candidate) => ({
          ...candidate,
          jobId: job.id,
          jobTitle: job.title,
          jobPublishedName: job.published_name,
        }));
        allCandidates.push(...enriched);
      } catch (innerError) {
        console.warn(`⚠️ Failed to fetch candidates for job ID ${job.id}:`, innerError.message || innerError);
      }
    }

    return allCandidates;
  } catch (error) {
    console.error('❌ Error fetching candidates from all jobs:', error.message || error);
    throw new Error('Failed to fetch candidates from all jobs');
  }
}

