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

function toDisplayText(value, fallback = '—') {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }

  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value);
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    const joined = value
      .map((item) => toDisplayText(item, ''))
      .filter(Boolean)
      .join(', ');
    return joined || fallback;
  }

  if (typeof value === 'object') {
    const candidate =
      value.name ??
      value.title ??
      value.label ??
      value.value ??
      value.description ??
      value.display ??
      value.text ??
      value.city ??
      value.state ??
      value.country;
    if (candidate !== undefined) {
      return toDisplayText(candidate, fallback);
    }
    return fallback;
  }

  return String(value);
}

function formatJob(job) {
  const id = extractJobId(job);
  const title = toDisplayText(
    job?.title || job?.published_name || job?.name || job?.jobTitle || id || 'Untitled job'
  );
  const status = toDisplayText(
    job?.status || job?.workflow_status || job?.state || job?.job_status || job?.job?.status
  );
  const location = toDisplayText(job?.location || job?.city || job?.country || job?.job?.location);
  const updatedAt = toDisplayText(
    job?.updated_at || job?.updatedAt || job?.last_modified || job?.modified_at || job?.job?.updated_at
  );

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
    { label: 'Job ID', value: toDisplayText(extractJobId(job)) },
    {
      label: 'Title',
      value: toDisplayText(job?.title || job?.published_name || job?.name || job?.jobTitle),
    },
    {
      label: 'Status',
      value: toDisplayText(job?.status || job?.workflow_status || job?.state || job?.job_status),
    },
    {
      label: 'Updated',
      value: toDisplayText(job?.updated_at || job?.updatedAt || job?.last_modified || job?.modified_at),
    },
    { label: 'Location', value: toDisplayText(job?.location || job?.city || job?.country) },
    { label: 'Owner', value: toDisplayText(job?.owner?.name || job?.owner_name) },
  ];
}

function formatCandidate(candidate) {
  const person = candidate?.person || {};
  const name = toDisplayText(person?.name || candidate?.name || 'Unknown candidate');
  const stage = toDisplayText(
    candidate?.workflow_stage_name || candidate?.workflow_stage_id || candidate?.stage
  );
  const emailEntry = Array.isArray(person?.emails)
    ? person.emails.find((item) => item?.value)
    : null;
  const email = emailEntry?.value || candidate?.email;
  const phoneEntry = Array.isArray(person?.phones)
    ? person.phones.find((item) => item?.value)
    : null;
  const phone = phoneEntry?.value || candidate?.phone;

  return {
    id: candidate?.id || person?.id || candidate?.loxoCandidateId || 'n/a',
    name,
    stage,
    email: toDisplayText(email),
    jobTitle: toDisplayText(candidate?.jobTitle || candidate?.job?.title || candidate?.jobPublishedName),
    phone: toDisplayText(phone),
  };
}

function buildCandidateDetail(candidate) {
  if (!candidate) return [];
  const person = candidate?.person || {};
  const emailEntry = Array.isArray(person?.emails)
    ? person.emails.find((item) => item?.value)
    : null;
  const phoneEntry = Array.isArray(person?.phones)
    ? person.phones.find((item) => item?.value)
    : null;

  return [
    { label: 'Candidate ID', value: toDisplayText(candidate?.id || person?.id) },
    { label: 'Name', value: toDisplayText(person?.name || candidate?.name) },
    {
      label: 'Stage',
      value: toDisplayText(candidate?.workflow_stage_name || candidate?.workflow_stage_id || candidate?.stage),
    },
    { label: 'Job ID', value: toDisplayText(candidate?.jobId || candidate?.job_id) },
    {
      label: 'Job title',
      value: toDisplayText(candidate?.jobTitle || candidate?.job?.title || candidate?.jobPublishedName),
    },
    { label: 'Email', value: toDisplayText(emailEntry?.value || candidate?.email) },
    { label: 'Phone', value: toDisplayText(phoneEntry?.value || candidate?.phone) },
    { label: 'Updated', value: toDisplayText(candidate?.updated_at || candidate?.updatedAt) },
  ];
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

const initialCandidateDetailState = () => ({
  loading: false,
  error: '',
  data: null,
});

export default function LoxoPanel() {
  const [jobsState, setJobsState] = useState({
    loading: false,
    error: '',
    items: [],
  });
  const [selectedJobId, setSelectedJobId] = useState('');
  const [jobIdInput, setJobIdInput] = useState('');
  const [candidateIdInput, setCandidateIdInput] = useState('');
  const [jobDetail, setJobDetail] = useState(initialJobDetailState());
  const [allCandidates, setAllCandidates] = useState(initialListState());
  const [selectedStageCandidates, setSelectedStageCandidates] = useState(initialListState());
  const [preQualified, setPreQualified] = useState(initialPreQualifiedState());
  const [candidateDetail, setCandidateDetail] = useState(initialCandidateDetailState());
  const [testStatus, setTestStatus] = useState({
    loading: false,
    error: '',
    result: null,
  });
  const [collapsedSections, setCollapsedSections] = useState({
    jobs: false,
    jobDetail: false,
    allCandidates: false,
    stage: false,
    preQualified: false,
    candidateDetail: false,
  });

  const toggleSection = useCallback((section) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }, []);

  const resetJobScopedData = useCallback(() => {
    setJobDetail(initialJobDetailState());
    setAllCandidates(initialListState());
    setSelectedStageCandidates(initialListState());
    setCandidateDetail(initialCandidateDetailState());
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
        setJobIdInput(firstId);
      } else {
        setSelectedJobId('');
        setJobIdInput('');
      }
      setCandidateIdInput('');
      resetJobScopedData();
    } catch (error) {
      setJobsState({
        loading: false,
        error: error.message || 'Failed to load jobs',
        items: [],
      });
      setSelectedJobId('');
      setJobIdInput('');
      setCandidateIdInput('');
      resetJobScopedData();
    }
  }, [resetJobScopedData]);

  const handleSelectJob = useCallback(
    (jobId) => {
      setSelectedJobId(jobId);
      setJobIdInput(jobId);
      setCandidateIdInput('');
      resetJobScopedData();
    },
    [resetJobScopedData]
  );

  const handleUnsetActive = useCallback(() => {
    setSelectedJobId('');
    setJobIdInput('');
    setCandidateIdInput('');
    resetJobScopedData();
  }, [resetJobScopedData]);

  const confirmSetActive = useCallback(
    (jobId) => {
      const job = jobsState.items.find((item) => extractJobId(item) === jobId) || null;
      const formatted = job ? formatJob(job) : null;
      const title = formatted?.title || jobId || 'selected job';
      return window.confirm(`Set "${title}" as the active job?`);
    },
    [jobsState.items]
  );

  const handleConfirmSelectJob = useCallback(
    (jobId) => {
      if (!jobId) return;
      if (!confirmSetActive(jobId)) {
        return;
      }
      handleSelectJob(jobId);
    },
    [confirmSetActive, handleSelectJob]
  );

  const handleSelectJobFromEvent = useCallback(
    (event) => {
      const nextJobId = event.target.value;
      if (!nextJobId) {
        handleUnsetActive();
        return;
      }
      if (!confirmSetActive(nextJobId)) {
        event.target.value = selectedJobId;
        return;
      }
      handleSelectJob(nextJobId);
    },
    [confirmSetActive, handleSelectJob, handleUnsetActive, selectedJobId]
  );

  const handleJobIdInputChange = useCallback((event) => {
    setJobIdInput(event.target.value);
  }, []);

  const handleApplyJobId = useCallback(() => {
    const trimmed = jobIdInput.trim();
    if (!trimmed) {
      handleUnsetActive();
      return;
    }
    if (!confirmSetActive(trimmed)) {
      return;
    }
    handleSelectJob(trimmed);
  }, [confirmSetActive, handleSelectJob, handleUnsetActive, jobIdInput]);

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

  const handleCandidateIdInputChange = useCallback((event) => {
    setCandidateIdInput(event.target.value);
  }, []);

  const handleFetchCandidateDetail = useCallback(async () => {
    const trimmedJobId = (selectedJobId || jobIdInput).trim();
    const trimmedCandidateId = candidateIdInput.trim();

    if (!trimmedJobId) {
      setCandidateDetail({
        loading: false,
        error: 'Enter a job ID before fetching a candidate.',
        data: null,
      });
      return;
    }

    if (!trimmedCandidateId) {
      setCandidateDetail({
        loading: false,
        error: 'Enter a candidate ID to fetch.',
        data: null,
      });
      return;
    }

    setCandidateDetail({ loading: true, error: '', data: null });

    try {
      const detail = await apiFetch(`/jobs/${trimmedJobId}/candidates/${trimmedCandidateId}`);
      setCandidateDetail({ loading: false, error: '', data: detail });
    } catch (error) {
      setCandidateDetail({
        loading: false,
        error: error.message || 'Failed to fetch candidate',
        data: null,
      });
    }
  }, [candidateIdInput, jobIdInput, selectedJobId]);

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
  const candidateSummary = useMemo(
    () => buildCandidateDetail(candidateDetail.data),
    [candidateDetail.data]
  );
  const jobsTableRows = useMemo(
    () => jobsState.items.map((job) => formatJob(job)),
    [jobsState.items]
  );

  const activeJob = useMemo(
    () => jobsState.items.find((job) => extractJobId(job) === selectedJobId) || null,
    [jobsState.items, selectedJobId]
  );

  const activeJobTitle = activeJob
    ? formatJob(activeJob).title
    : selectedJobId || jobIdInput
    ? `Job ${selectedJobId || jobIdInput}`
    : 'No job selected';

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
        <article
          className={`loxo-panel__card loxo-panel__card--wide${
            collapsedSections.jobs ? ' loxo-panel__card--collapsed' : ''
          }`}
        >
          <header>
            <div>
              <h3>All available jobs</h3>
              <p className="loxo-panel__muted">
                Click the button to fetch every job currently exposed through the Loxo API.
              </p>
            </div>
            <div className="loxo-panel__actions">
              <button
                className="loxo-panel__button"
                type="button"
                onClick={handleFetchJobs}
                disabled={jobsState.loading}
              >
                {jobsState.loading ? 'Fetching…' : 'Fetch jobs'}
              </button>
              <button
                type="button"
                className={`loxo-panel__toggle${
                  collapsedSections.jobs ? ' loxo-panel__toggle--expand' : ' loxo-panel__toggle--collapse'
                }`}
                onClick={() => toggleSection('jobs')}
                aria-expanded={!collapsedSections.jobs}
                aria-controls="loxo-panel-jobs"
              >
                <span aria-hidden="true">{collapsedSections.jobs ? '▾' : '▴'}</span>
                <span className="loxo-panel__toggle-text">
                  {collapsedSections.jobs ? 'Expand' : 'Collapse'}
                </span>
              </button>
            </div>
          </header>
          {!collapsedSections.jobs && (
            <div id="loxo-panel-jobs">
              {jobsState.error && (
                <p className="loxo-panel__status loxo-panel__status--error">{jobsState.error}</p>
              )}
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
                                {!isActive ? (
                                  <button
                                    type="button"
                                    className="loxo-panel__button loxo-panel__button--ghost"
                                    onClick={() => handleConfirmSelectJob(job.id)}
                                  >
                                    Set active
                                  </button>
                                ) : (
                                  <div className="loxo-panel__inline loxo-panel__inline--gap">
                                    <button
                                      type="button"
                                      className="loxo-panel__button loxo-panel__button--ghost"
                                      disabled
                                    >
                                      Active
                                    </button>
                                    <button
                                      type="button"
                                      className="loxo-panel__button loxo-panel__button--ghost"
                                      onClick={handleUnsetActive}
                                    >
                                      Unset active
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="loxo-panel__grid-inline">
                    <div className="loxo-panel__inline loxo-panel__inline--gap">
                      <label htmlFor="loxo-job-select" className="loxo-panel__label">
                        Select job
                      </label>
                      <select
                        id="loxo-job-select"
                        className="loxo-panel__select"
                        value={selectedJobId}
                        onChange={handleSelectJobFromEvent}
                      >
                        <option value="">-- No active job --</option>
                        {jobsTableRows.map((job) => (
                          <option key={job.id || job.title} value={job.id}>
                            {job.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="loxo-panel__inline loxo-panel__inline--gap">
                      <label htmlFor="loxo-job-id-input" className="loxo-panel__label">
                        Enter job ID
                      </label>
                      <input
                        id="loxo-job-id-input"
                        className="loxo-panel__input"
                        value={jobIdInput}
                        onChange={handleJobIdInputChange}
                        placeholder="e.g. 123456"
                      />
                      <button
                        type="button"
                        className="loxo-panel__button loxo-panel__button--ghost"
                        onClick={handleApplyJobId}
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </article>

        <article
          className={`loxo-panel__card${collapsedSections.jobDetail ? ' loxo-panel__card--collapsed' : ''}`}
        >
          <header>
            <div>
              <h3>Job detail</h3>
              <p className="loxo-panel__muted">Active job: {activeJobTitle}</p>
            </div>
            <div className="loxo-panel__actions">
              <button
                className="loxo-panel__button"
                type="button"
                onClick={handleFetchJobDetail}
                disabled={jobDetail.loading}
              >
                {jobDetail.loading ? 'Fetching…' : 'Fetch job detail'}
              </button>
              <button
                type="button"
                className={`loxo-panel__toggle${
                  collapsedSections.jobDetail ? ' loxo-panel__toggle--expand' : ' loxo-panel__toggle--collapse'
                }`}
                onClick={() => toggleSection('jobDetail')}
                aria-expanded={!collapsedSections.jobDetail}
                aria-controls="loxo-panel-job-detail"
              >
                <span aria-hidden="true">{collapsedSections.jobDetail ? '▾' : '▴'}</span>
                <span className="loxo-panel__toggle-text">
                  {collapsedSections.jobDetail ? 'Expand' : 'Collapse'}
                </span>
              </button>
            </div>
          </header>
          {!collapsedSections.jobDetail && (
            <div id="loxo-panel-job-detail">
              {jobDetail.error && (
                <p className="loxo-panel__status loxo-panel__status--error">{jobDetail.error}</p>
              )}
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
            </div>
          )}
        </article>

        <article
          className={`loxo-panel__card${collapsedSections.allCandidates ? ' loxo-panel__card--collapsed' : ''}`}
        >
          <header>
            <div>
              <h3>All candidates in job</h3>
              <p className="loxo-panel__muted">Loads every applicant tied to the active job.</p>
            </div>
            <div className="loxo-panel__actions">
              <button
                className="loxo-panel__button"
                type="button"
                onClick={handleFetchAllCandidates}
                disabled={allCandidates.loading}
              >
                {allCandidates.loading ? 'Fetching…' : 'Fetch candidates'}
              </button>
              <button
                type="button"
                className={`loxo-panel__toggle${
                  collapsedSections.allCandidates ? ' loxo-panel__toggle--expand' : ' loxo-panel__toggle--collapse'
                }`}
                onClick={() => toggleSection('allCandidates')}
                aria-expanded={!collapsedSections.allCandidates}
                aria-controls="loxo-panel-all-candidates"
              >
                <span aria-hidden="true">{collapsedSections.allCandidates ? '▾' : '▴'}</span>
                <span className="loxo-panel__toggle-text">
                  {collapsedSections.allCandidates ? 'Expand' : 'Collapse'}
                </span>
              </button>
            </div>
          </header>
          {!collapsedSections.allCandidates && (
            <div id="loxo-panel-all-candidates">
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
            </div>
          )}
        </article>

        <article className={`loxo-panel__card${collapsedSections.stage ? ' loxo-panel__card--collapsed' : ''}`}>
          <header>
            <div>
              <h3>Pre-qualified stage (job)</h3>
              <p className="loxo-panel__muted">Pulls the candidates in the pre-qualified workflow stage for the active job.</p>
            </div>
            <div className="loxo-panel__actions">
              <button
                className="loxo-panel__button"
                type="button"
                onClick={handleFetchSelectedStageCandidates}
                disabled={selectedStageCandidates.loading}
              >
                {selectedStageCandidates.loading ? 'Fetching…' : 'Fetch stage'}
              </button>
              <button
                type="button"
                className={`loxo-panel__toggle${
                  collapsedSections.stage ? ' loxo-panel__toggle--expand' : ' loxo-panel__toggle--collapse'
                }`}
                onClick={() => toggleSection('stage')}
                aria-expanded={!collapsedSections.stage}
                aria-controls="loxo-panel-stage"
              >
                <span aria-hidden="true">{collapsedSections.stage ? '▾' : '▴'}</span>
                <span className="loxo-panel__toggle-text">
                  {collapsedSections.stage ? 'Expand' : 'Collapse'}
                </span>
              </button>
            </div>
          </header>
          {!collapsedSections.stage && (
            <div id="loxo-panel-stage">
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
            </div>
          )}
        </article>

        <article
          className={`loxo-panel__card${collapsedSections.candidateDetail ? ' loxo-panel__card--collapsed' : ''}`}
        >
          <header>
            <div>
              <h3>Candidate detail</h3>
              <p className="loxo-panel__muted">
                Provide a candidate ID to fetch a single applicant for the active job.
              </p>
            </div>
            <div className="loxo-panel__actions">
              <button
                className="loxo-panel__button"
                type="button"
                onClick={handleFetchCandidateDetail}
                disabled={candidateDetail.loading}
              >
                {candidateDetail.loading ? 'Fetching…' : 'Fetch candidate'}
              </button>
              <button
                type="button"
                className={`loxo-panel__toggle${
                  collapsedSections.candidateDetail
                    ? ' loxo-panel__toggle--expand'
                    : ' loxo-panel__toggle--collapse'
                }`}
                onClick={() => toggleSection('candidateDetail')}
                aria-expanded={!collapsedSections.candidateDetail}
                aria-controls="loxo-panel-candidate-detail"
              >
                <span aria-hidden="true">{collapsedSections.candidateDetail ? '▾' : '▴'}</span>
                <span className="loxo-panel__toggle-text">
                  {collapsedSections.candidateDetail ? 'Expand' : 'Collapse'}
                </span>
              </button>
            </div>
          </header>
          {!collapsedSections.candidateDetail && (
            <div id="loxo-panel-candidate-detail">
              <div className="loxo-panel__inline loxo-panel__inline--gap">
                <label htmlFor="loxo-candidate-id-input" className="loxo-panel__label">
                  Candidate ID
                </label>
                <input
                  id="loxo-candidate-id-input"
                  className="loxo-panel__input"
                  value={candidateIdInput}
                  onChange={handleCandidateIdInputChange}
                  placeholder="e.g. 987654"
                />
              </div>
              <p className="loxo-panel__muted">
                Using job ID: {selectedJobId || jobIdInput || 'Not set'}
              </p>
              {candidateDetail.error && (
                <p className="loxo-panel__status loxo-panel__status--error">{candidateDetail.error}</p>
              )}
              {!candidateDetail.loading && !candidateDetail.error && !candidateDetail.data && (
                <p className="loxo-panel__muted">Enter the IDs above and run the fetch.</p>
              )}
              {candidateDetail.loading && <p className="loxo-panel__muted">Loading candidate…</p>}
              {candidateSummary.length > 0 && (
                <div className="loxo-panel__table-wrapper loxo-panel__table-wrapper--compact">
                  <table className="loxo-panel__table loxo-panel__table--meta">
                    <tbody>
                      {candidateSummary.map((item) => (
                        <tr key={item.label}>
                          <th scope="row">{item.label}</th>
                          <td>{item.value || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </article>

        <article
          className={`loxo-panel__card loxo-panel__card--wide${
            collapsedSections.preQualified ? ' loxo-panel__card--collapsed' : ''
          }`}
        >
          <header>
            <div>
              <h3>Global pre-qualified sync</h3>
              <p className="loxo-panel__muted">
                Trigger the POST endpoint to gather every candidate in the “Pre Qualified” stage across all jobs.
              </p>
            </div>
            <div className="loxo-panel__actions">
              <button
                className="loxo-panel__button"
                type="button"
                onClick={handlePreQualifiedFetch}
                disabled={preQualified.loading}
              >
                {preQualified.loading ? 'Fetching…' : 'Fetch all pre-qualified'}
              </button>
              <button
                type="button"
                className={`loxo-panel__toggle${
                  collapsedSections.preQualified ? ' loxo-panel__toggle--expand' : ' loxo-panel__toggle--collapse'
                }`}
                onClick={() => toggleSection('preQualified')}
                aria-expanded={!collapsedSections.preQualified}
                aria-controls="loxo-panel-pre-qualified-global"
              >
                <span aria-hidden="true">{collapsedSections.preQualified ? '▾' : '▴'}</span>
                <span className="loxo-panel__toggle-text">
                  {collapsedSections.preQualified ? 'Expand' : 'Collapse'}
                </span>
              </button>
            </div>
          </header>
          {!collapsedSections.preQualified && (
            <div id="loxo-panel-pre-qualified-global">
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
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .loxo-panel__card {
          background: #ffffff;
          border-radius: 1rem;
          padding: 1.2rem;
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.1);
          display: grid;
          gap: 0.85rem;
          width: 100%;
          box-sizing: border-box;
          overflow: hidden;
        }

        .loxo-panel__card--collapsed {
          gap: 0.85rem;
        }

        .loxo-panel__card header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 0.75rem;
          width: 100%;
          box-sizing: border-box;
        }

        .loxo-panel__card h3 {
          margin: 0;
          font-size: 1.1rem;
          color: #0f172a;
        }

        .loxo-panel__card--wide {
          width: 100%;
        }

        .loxo-panel__actions {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.5rem;
          width: 100%;
          justify-content: flex-end;
        }

        .loxo-panel__toggle {
          border: none;
          font-weight: 600;
          font-size: 0.85rem;
          padding: 0.35rem 0.75rem;
          border-radius: 0.65rem;
          cursor: pointer;
          transition: background 120ms ease, color 120ms ease;
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          white-space: nowrap;
        }

        .loxo-panel__toggle span:first-child {
          font-size: 1.05rem;
          line-height: 1;
        }

        .loxo-panel__toggle--collapse {
          background: rgba(59, 130, 246, 0.14);
          color: #1d4ed8;
        }

        .loxo-panel__toggle--collapse:hover {
          background: rgba(59, 130, 246, 0.22);
          color: #1e3a8a;
        }

        .loxo-panel__toggle--expand {
          background: rgba(15, 118, 110, 0.12);
          color: #0f766e;
        }

        .loxo-panel__toggle--expand:hover {
          background: rgba(15, 118, 110, 0.2);
          color: #115e59;
        }

        .loxo-panel__toggle-text {
          font-size: 0.85rem;
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
          overflow-x: auto;
          overflow-y: hidden;
          background: #ffffff;
          box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.14);
          max-width: 100%;
          width: 100%;
          box-sizing: border-box;
        }

        .loxo-panel__table-wrapper--compact {
          max-width: 100%;
        }

        .loxo-panel__table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.9rem;
          min-width: 320px;
          table-layout: fixed;
        }

        .loxo-panel__table th,
        .loxo-panel__table td {
          padding: 0.65rem 0.75rem;
          border-bottom: 1px solid rgba(148, 163, 184, 0.25);
          text-align: left;
          word-break: break-word;
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

        .loxo-panel__grid-inline {
          display: grid;
          gap: 0.75rem;
        }

        .loxo-panel__input {
          width: min(260px, 100%);
          padding: 0.5rem 0.65rem;
          border-radius: 0.75rem;
          border: 1px solid rgba(148, 163, 184, 0.6);
          background: #ffffff;
          color: #0f172a;
        }

        .loxo-panel__input:focus {
          outline: 2px solid rgba(37, 99, 235, 0.35);
          outline-offset: 1px;
        }

        @media (max-width: 720px) {
          .loxo-panel__header {
            flex-direction: column;
            align-items: flex-start;
          }

          .loxo-panel__card {
            padding: 1rem;
          }

          .loxo-panel__table {
            min-width: 0;
          }

          .loxo-panel__actions {
            justify-content: flex-start;
          }
        }
      `}</style>
    </section>
  );
}

