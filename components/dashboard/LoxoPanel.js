import { useCallback, useMemo, useState } from 'react';

const API_BASE = '/api/v1/loxo';

async function apiFetch(path, { method = 'GET', body, signal } = {}) {
  const init = {
    method,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
    signal,
  };

  if (body) {
    init.headers['Content-Type'] = 'application/json';
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${path}`, init);
  const payload = await response.json().catch(() => ({}));
  const success = response.ok && payload?.success !== false;

  if (!success) {
    const message = payload?.error || payload?.message || `Request to ${path} failed`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return payload?.data;
}

function extractJobId(job) {
  const id =
    job?.id ??
    job?.job_id ??
    job?.loxoJobId ??
    job?.loxo_job_id ??
    job?.job?.id ??
    job?.jobId ??
    null;
  return id != null ? String(id) : '';
}

function formatJob(job) {
  const id = extractJobId(job);
  const title = job?.title || job?.published_name || job?.name || job?.jobTitle || id || 'Untitled job';
  const status =
    job?.status ||
    job?.workflow_status ||
    job?.state ||
    job?.job_status ||
    job?.job?.status ||
    '—';
  const location = job?.location || job?.city || job?.country || job?.job?.location || '—';
  const updatedAt =
    job?.updated_at ||
    job?.updatedAt ||
    job?.last_modified ||
    job?.modified_at ||
    job?.job?.updated_at ||
    '—';

  return {
    id,
    title,
    status,
    location,
    updatedAt,
  };
}

function buildJobSummary(job) {
  if (!job) return [];
  return [
    { label: 'Job ID', value: extractJobId(job) || '—' },
    { label: 'Title', value: job?.title || job?.published_name || job?.name || '—' },
    { label: 'Status', value: job?.status || job?.workflow_status || job?.state || '—' },
    { label: 'Updated', value: job?.updated_at || job?.updatedAt || job?.last_modified || '—' },
    { label: 'Location', value: job?.location || job?.city || job?.country || '—' },
    { label: 'Owner', value: job?.owner?.name || job?.owner_name || '—' },
  ];
}

function formatCandidate(candidate) {
  const person = candidate?.person || {};
  const name = person?.name || candidate?.name || 'Unknown candidate';
  const stage =
    candidate?.workflow_stage_name ||
    candidate?.workflow_stage_id ||
    candidate?.stage ||
    '—';
  const emailEntry = Array.isArray(person?.emails)
    ? person.emails.find((item) => item?.value)
    : null;

  return {
    id: candidate?.id || candidate?.person?.id || candidate?.loxoCandidateId || 'n/a',
    name,
    stage,
    email: emailEntry?.value || candidate?.email || '—',
    jobTitle: candidate?.jobTitle || candidate?.job?.title || candidate?.jobPublishedName || '—',
  };
}

const initialJobDetailState = () => ({
  loading: false,
  error: '',
  data: null,
});

const initialListState = () => ({
  loading: false,
  error: '',
  rows: [],
  total: 0,
});

const initialPreQualifiedState = () => ({
  loading: false,
  error: '',
  summary: null,
  rows: [],
});

export default function LoxoPanel() {
  const [jobsState, setJobsState] = useState({
    loading: false,
    error: '',
    items: [],
  });
  const [selectedJobId, setSelectedJobId] = useState('');
  const [jobDetail, setJobDetail] = useState(initialJobDetailState());
  const [allCandidates, setAllCandidates] = useState(initialListState());
  const [selectedStageCandidates, setSelectedStageCandidates] = useState(initialListState());
  const [preQualified, setPreQualified] = useState(initialPreQualifiedState());
  const [testStatus, setTestStatus] = useState({
    loading: false,
    error: '',
    result: null,
  });

  const resetJobScopedData = useCallback(() => {
    setJobDetail(initialJobDetailState());
    setAllCandidates(initialListState());
    setSelectedStageCandidates(initialListState());
  }, []);

  const handleFetchJobs = useCallback(async () => {
    setJobsState({ loading: true, error: '', items: [] });
    try {
      const data = await apiFetch('/jobs');
      const results = Array.isArray(data?.jobs?.results) ? data.jobs.results : [];
      setJobsState({ loading: false, error: '', items: results });
      if (results.length > 0) {
        const firstId = extractJobId(results[0]);
        setSelectedJobId(firstId);
      } else {
        setSelectedJobId('');
      }
      resetJobScopedData();
    } catch (error) {
      setJobsState({
        loading: false,
        error: error.message || 'Failed to load jobs',
        items: [],
      });
      setSelectedJobId('');
      resetJobScopedData();
    }
  }, [resetJobScopedData]);

  const handleSelectJob = useCallback(
    (jobId) => {
      setSelectedJobId(jobId);
      resetJobScopedData();
    },
    [resetJobScopedData]
  );

  const handleSelectJobFromEvent = useCallback(
    (event) => {
      handleSelectJob(event.target.value);
    },
    [handleSelectJob]
  );

  const handleFetchJobDetail = useCallback(async () => {
    if (!selectedJobId) {
      setJobDetail({
        loading: false,
        error: 'Select a job first, then fetch details.',
        data: null,
      });
      return;
    }
    setJobDetail({ loading: true, error: '', data: null });
    try {
      const detail = await apiFetch(`/jobs/${selectedJobId}`);
      setJobDetail({ loading: false, error: '', data: detail });
    } catch (error) {
      setJobDetail({
        loading: false,
        error: error.message || 'Failed to fetch job details',
        data: null,
      });
    }
  }, [selectedJobId]);

  const handleFetchAllCandidates = useCallback(async () => {
    if (!selectedJobId) {
      setAllCandidates({
        loading: false,
        error: 'Select a job first, then fetch candidates.',
        rows: [],
        total: 0,
      });
      return;
    }
    setAllCandidates({ loading: true, error: '', rows: [], total: 0 });
    try {
      const response = await apiFetch(`/jobs/${selectedJobId}/all-candidates`);
      const candidates = Array.isArray(response?.candidates) ? response.candidates : [];
      setAllCandidates({
        loading: false,
        error: '',
        rows: candidates.map(formatCandidate),
        total: response?.total ?? candidates.length,
      });
    } catch (error) {
      setAllCandidates({
        loading: false,
        error: error.message || 'Failed to fetch candidates',
        rows: [],
        total: 0,
      });
    }
  }, [selectedJobId]);

  const handleFetchSelectedStageCandidates = useCallback(async () => {
    if (!selectedJobId) {
      setSelectedStageCandidates({
        loading: false,
        error: 'Select a job first, then fetch stage candidates.',
        rows: [],
        total: 0,
      });
      return;
    }
    setSelectedStageCandidates({ loading: true, error: '', rows: [], total: 0 });
    try {
      const response = await apiFetch(`/jobs/${selectedJobId}/selected-candidates`);
      const candidates = Array.isArray(response?.candidates) ? response.candidates : [];
      setSelectedStageCandidates({
        loading: false,
        error: '',
        rows: candidates.map(formatCandidate),
        total: response?.total ?? candidates.length,
      });
    } catch (error) {
      setSelectedStageCandidates({
        loading: false,
        error: error.message || 'Failed to fetch selected candidates',
        rows: [],
        total: 0,
      });
    }
  }, [selectedJobId]);

  const handlePreQualifiedFetch = useCallback(async () => {
    setPreQualified({ loading: true, error: '', summary: null, rows: [] });
    try {
      const data = await apiFetch('/candidates/pre-qualified', { method: 'POST' });
      const summary = data?.summary || null;
      const list = Array.isArray(data?.candidates) ? data.candidates : [];
      setPreQualified({
        loading: false,
        error: '',
        summary,
        rows: list.map(formatCandidate),
      });
    } catch (error) {
      setPreQualified({
        loading: false,
        error: error.message || 'Failed to fetch pre-qualified candidates',
        summary: null,
        rows: [],
      });
    }
  }, []);

  const handleTestConnection = useCallback(async () => {
    setTestStatus({ loading: true, error: '', result: null });
    try {
      const data = await apiFetch('/test', { method: 'POST' });
      setTestStatus({ loading: false, error: '', result: data });
    } catch (error) {
      setTestStatus({
        loading: false,
        error: error.message || 'Test request failed',
        result: null,
      });
    }
  }, []);

  const jobSummary = useMemo(() => buildJobSummary(jobDetail.data), [jobDetail.data]);
  const jobsTableRows = useMemo(
    () => jobsState.items.map((job) => formatJob(job)),
    [jobsState.items]
  );

  const activeJob = useMemo(
    () => jobsState.items.find((job) => extractJobId(job) === selectedJobId) || null,
    [jobsState.items, selectedJobId]
  );

  const activeJobTitle = activeJob ? formatJob(activeJob).title : 'No job selected';

  return (
    <section className="loxo-panel" aria-label="Loxo integration overview">
      <header className="loxo-panel__header">
        <div>
          <h2>Loxo Talent Pipeline</h2>
          <p>Use the buttons below to pull live data from the Loxo API when you need it.</p>
        </div>
        <button
          className="loxo-panel__button loxo-panel__button--secondary"
          type="button"
          onClick={handleTestConnection}
          disabled={testStatus.loading}
        >
          {testStatus.loading ? 'Testing…' : 'Run Connection Test'}
        </button>
      </header>

      {testStatus.error && <p className="loxo-panel__status loxo-panel__status--error">{testStatus.error}</p>}
      {testStatus.result && (
        <p className="loxo-panel__status loxo-panel__status--success">
          {testStatus.result?.message || 'Connection successful'}
        </p>
      )}

      <div className="loxo-panel__grid">
        <article className="loxo-panel__card loxo-panel__card--wide">
          <header>
            <div>
              <h3>All available jobs</h3>
              <p className="loxo-panel__muted">
                Click the button to fetch every job currently exposed through the Loxo API.
              </p>
            </div>
            <button
              className="loxo-panel__button"
              type="button"
              onClick={handleFetchJobs}
              disabled={jobsState.loading}
            >
              {jobsState.loading ? 'Fetching…' : 'Fetch jobs'}
            </button>
          </header>
          {jobsState.error && <p className="loxo-panel__status loxo-panel__status--error">{jobsState.error}</p>}
          {!jobsState.loading && !jobsState.error && jobsTableRows.length === 0 && (
            <p className="loxo-panel__muted">No jobs loaded yet. Fetch to see what is available.</p>
          )}
          {jobsState.loading && <p className="loxo-panel__muted">Loading jobs from Loxo…</p>}
          {jobsTableRows.length > 0 && (
            <>
              <div className="loxo-panel__table-wrapper" role="region" aria-live="polite">
                <table className="loxo-panel__table">
                  <thead>
                    <tr>
                      <th scope="col">Title</th>
                      <th scope="col">Location</th>
                      <th scope="col">Status</th>
                      <th scope="col">Updated</th>
                      <th scope="col">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobsTableRows.map((job) => {
                      const isActive = selectedJobId === job.id;
                      return (
                        <tr key={`${job.id}-${job.title}`}>
                          <td>{job.title}</td>
                          <td>{job.location}</td>
                          <td>{job.status}</td>
                          <td>{job.updatedAt}</td>
                          <td>
                            <button
                              type="button"
                              className="loxo-panel__button loxo-panel__button--ghost"
                              onClick={() => handleSelectJob(job.id)}
                              disabled={isActive}
                            >
                              {isActive ? 'Active' : 'Set active'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="loxo-panel__inline loxo-panel__inline--gap">
                <label htmlFor="loxo-job-select" className="loxo-panel__label">
                  Active job
                </label>
                <select
                  id="loxo-job-select"
                  className="loxo-panel__select"
                  value={selectedJobId}
                  onChange={handleSelectJobFromEvent}
                >
                  {jobsTableRows.map((job) => (
                    <option key={job.id || job.title} value={job.id}>
                      {job.title}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </article>

        <article className="loxo-panel__card">
          <header>
            <div>
              <h3>Job detail</h3>
              <p className="loxo-panel__muted">Active job: {activeJobTitle}</p>
            </div>
            <button
              className="loxo-panel__button"
              type="button"
              onClick={handleFetchJobDetail}
              disabled={jobDetail.loading}
            >
              {jobDetail.loading ? 'Fetching…' : 'Fetch job detail'}
            </button>
          </header>
          {jobDetail.error && <p className="loxo-panel__status loxo-panel__status--error">{jobDetail.error}</p>}
          {!jobDetail.loading && !jobDetail.error && (!jobDetail.data || jobSummary.length === 0) && (
            <p className="loxo-panel__muted">Run the fetch to load job metadata.</p>
          )}
          {jobDetail.loading && <p className="loxo-panel__muted">Loading job detail…</p>}
          {jobSummary.length > 0 && (
            <div className="loxo-panel__table-wrapper loxo-panel__table-wrapper--compact">
              <table className="loxo-panel__table loxo-panel__table--meta">
                <tbody>
                  {jobSummary.map((item) => (
                    <tr key={item.label}>
                      <th scope="row">{item.label}</th>
                      <td>{item.value || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="loxo-panel__card">
          <header>
            <div>
              <h3>All candidates in job</h3>
              <p className="loxo-panel__muted">Loads every applicant tied to the active job.</p>
            </div>
            <button
              className="loxo-panel__button"
              type="button"
              onClick={handleFetchAllCandidates}
              disabled={allCandidates.loading}
            >
              {allCandidates.loading ? 'Fetching…' : 'Fetch candidates'}
            </button>
          </header>
          {allCandidates.error && (
            <p className="loxo-panel__status loxo-panel__status--error">{allCandidates.error}</p>
          )}
          {!allCandidates.loading && !allCandidates.error && allCandidates.rows.length === 0 && (
            <p className="loxo-panel__muted">No candidates loaded yet. Fetch to view the roster.</p>
          )}
          {allCandidates.loading && <p className="loxo-panel__muted">Loading candidates…</p>}
          {allCandidates.rows.length > 0 && (
            <div className="loxo-panel__table-wrapper">
              <table className="loxo-panel__table">
                <thead>
                  <tr>
                    <th scope="col">Candidate</th>
                    <th scope="col">Stage</th>
                    <th scope="col">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {allCandidates.rows.map((candidate) => (
                    <tr key={`${candidate.id}-${candidate.email}`}>
                      <td>
                        <div className="loxo-panel__stack">
                          <span>{candidate.name}</span>
                          <span className="loxo-panel__muted">{candidate.jobTitle}</span>
                        </div>
                      </td>
                      <td>{candidate.stage}</td>
                      <td>{candidate.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="loxo-panel__card">
          <header>
            <div>
              <h3>Pre-qualified stage (job)</h3>
              <p className="loxo-panel__muted">Pulls the candidates in the pre-qualified workflow stage for the active job.</p>
            </div>
            <button
              className="loxo-panel__button"
              type="button"
              onClick={handleFetchSelectedStageCandidates}
              disabled={selectedStageCandidates.loading}
            >
              {selectedStageCandidates.loading ? 'Fetching…' : 'Fetch stage'}
            </button>
          </header>
          {selectedStageCandidates.error && (
            <p className="loxo-panel__status loxo-panel__status--error">{selectedStageCandidates.error}</p>
          )}
          {!selectedStageCandidates.loading &&
            !selectedStageCandidates.error &&
            selectedStageCandidates.rows.length === 0 && (
              <p className="loxo-panel__muted">
                Run the fetch to see who is currently marked as pre-qualified in this job.
              </p>
            )}
          {selectedStageCandidates.loading && <p className="loxo-panel__muted">Loading stage candidates…</p>}
          {selectedStageCandidates.rows.length > 0 && (
            <div className="loxo-panel__table-wrapper">
              <table className="loxo-panel__table">
                <thead>
                  <tr>
                    <th scope="col">Candidate</th>
                    <th scope="col">Stage</th>
                    <th scope="col">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedStageCandidates.rows.map((candidate) => (
                    <tr key={`${candidate.id}-${candidate.email}`}>
                      <td>{candidate.name}</td>
                      <td>{candidate.stage}</td>
                      <td>{candidate.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="loxo-panel__card loxo-panel__card--wide">
          <header>
            <div>
              <h3>Global pre-qualified sync</h3>
              <p className="loxo-panel__muted">
                Trigger the POST endpoint to gather every candidate in the “Pre Qualified” stage across all jobs.
              </p>
            </div>
            <button
              className="loxo-panel__button"
              type="button"
              onClick={handlePreQualifiedFetch}
              disabled={preQualified.loading}
            >
              {preQualified.loading ? 'Fetching…' : 'Fetch all pre-qualified'}
            </button>
          </header>
          {preQualified.error && (
            <p className="loxo-panel__status loxo-panel__status--error">{preQualified.error}</p>
          )}
          {preQualified.summary && (
            <div className="loxo-panel__summary">
              <div>
                <strong>Total processed</strong>
                <span>{preQualified.summary.totalCandidates}</span>
              </div>
              <div>
                <strong>Pre-qualified</strong>
                <span>{preQualified.summary.preQualifiedCount}</span>
              </div>
            </div>
          )}
          {!preQualified.loading && !preQualified.error && preQualified.rows.length === 0 && (
            <p className="loxo-panel__muted">Run the sync to view pre-qualified candidates across all jobs.</p>
          )}
          {preQualified.loading && <p className="loxo-panel__muted">Syncing with Loxo…</p>}
          {preQualified.rows.length > 0 && (
            <div className="loxo-panel__table-wrapper">
              <table className="loxo-panel__table">
                <thead>
                  <tr>
                    <th scope="col">Candidate</th>
                    <th scope="col">Job</th>
                    <th scope="col">Stage</th>
                    <th scope="col">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {preQualified.rows.map((candidate) => (
                    <tr key={`${candidate.id}-${candidate.email}`}>
                      <td>{candidate.name}</td>
                      <td>{candidate.jobTitle}</td>
                      <td>{candidate.stage}</td>
                      <td>{candidate.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </div>

      <style jsx>{`
        .loxo-panel {
          display: grid;
          gap: 1.5rem;
        }

        .loxo-panel__header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
        }

        .loxo-panel__header h2 {
          margin: 0;
          font-size: 1.6rem;
          color: #0f172a;
        }

        .loxo-panel__header p {
          margin: 0.35rem 0 0;
          color: #475569;
          line-height: 1.6;
        }

        .loxo-panel__grid {
          display: grid;
          gap: 1.25rem;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        }

        .loxo-panel__card {
          background: #ffffff;
          border-radius: 1rem;
          padding: 1.2rem;
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.1);
          display: grid;
          gap: 0.85rem;
        }

        .loxo-panel__card header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.75rem;
        }

        .loxo-panel__card h3 {
          margin: 0;
          font-size: 1.1rem;
          color: #0f172a;
        }

        .loxo-panel__card--wide {
          grid-column: 1 / -1;
        }

        .loxo-panel__button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.45rem 0.9rem;
          border-radius: 0.75rem;
          border: none;
          background: linear-gradient(135deg, #2563eb, #6366f1);
          color: #ffffff;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: transform 120ms ease, box-shadow 120ms ease, opacity 120ms ease;
        }

        .loxo-panel__button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .loxo-panel__button:not(:disabled):hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 24px rgba(37, 99, 235, 0.24);
        }

        .loxo-panel__button--secondary {
          background: #1e293b;
          color: #f8fafc;
        }

        .loxo-panel__button--ghost {
          background: rgba(37, 99, 235, 0.12);
          color: #1d4ed8;
          border-radius: 0.65rem;
          padding: 0.35rem 0.75rem;
        }

        .loxo-panel__button--ghost:disabled {
          background: rgba(37, 99, 235, 0.08);
          color: rgba(29, 78, 216, 0.65);
        }

        .loxo-panel__status {
          margin: 0;
          padding: 0.65rem 0.9rem;
          border-radius: 0.85rem;
          font-size: 0.9rem;
        }

        .loxo-panel__status--error {
          background: rgba(239, 68, 68, 0.1);
          color: #b91c1c;
        }

        .loxo-panel__status--success {
          background: rgba(16, 185, 129, 0.12);
          color: #047857;
        }

        .loxo-panel__label {
          font-weight: 600;
          color: #1e293b;
          font-size: 0.9rem;
        }

        .loxo-panel__select {
          width: min(320px, 100%);
          padding: 0.5rem 0.65rem;
          border-radius: 0.75rem;
          border: 1px solid rgba(148, 163, 184, 0.6);
          background: #f8fafc;
          color: #0f172a;
        }

        .loxo-panel__muted {
          margin: 0;
          color: #64748b;
          font-size: 0.9rem;
        }

        .loxo-panel__badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 2rem;
          padding: 0.25rem 0.6rem;
          border-radius: 999px;
          background: rgba(37, 99, 235, 0.12);
          color: #1d4ed8;
          font-weight: 600;
          font-size: 0.85rem;
        }

        .loxo-panel__summary {
          display: flex;
          flex-wrap: wrap;
          gap: 0.8rem;
          padding: 0.65rem 0.75rem;
          background: rgba(16, 185, 129, 0.1);
          border-radius: 0.85rem;
        }

        .loxo-panel__summary div {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }

        .loxo-panel__summary strong {
          color: #065f46;
          font-size: 0.85rem;
        }

        .loxo-panel__summary span {
          color: #0f172a;
          font-weight: 600;
          font-size: 1rem;
        }

        .loxo-panel__table-wrapper {
          border: 1px solid rgba(148, 163, 184, 0.35);
          border-radius: 0.9rem;
          overflow: hidden;
          background: #ffffff;
          box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.14);
        }

        .loxo-panel__table-wrapper--compact {
          max-width: 100%;
        }

        .loxo-panel__table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.9rem;
          min-width: 320px;
        }

        .loxo-panel__table th,
        .loxo-panel__table td {
          padding: 0.65rem 0.75rem;
          border-bottom: 1px solid rgba(148, 163, 184, 0.25);
          text-align: left;
        }

        .loxo-panel__table thead th {
          background: rgba(15, 23, 42, 0.05);
          font-weight: 600;
          color: #0f172a;
        }

        .loxo-panel__table tbody tr:last-child td {
          border-bottom: none;
        }

        .loxo-panel__table--meta th {
          width: 40%;
        }

        .loxo-panel__stack {
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
        }

        .loxo-panel__inline {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
          align-items: center;
        }

        .loxo-panel__inline--gap {
          gap: 0.75rem;
        }

        @media (max-width: 720px) {
          .loxo-panel__header {
            flex-direction: column;
            align-items: flex-start;
          }

          .loxo-panel__grid {
            grid-template-columns: 1fr;
          }

          .loxo-panel__card {
            padding: 1rem;
          }

          .loxo-panel__table {
            min-width: 0;
          }
        }
      `}</style>
    </section>
  );
}

