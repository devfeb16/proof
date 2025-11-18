import { useCallback, useEffect, useMemo, useState } from 'react';
import styles from '../../styles/AdminDataManager.module.css';
import { useToast } from '../ToastProvider';

const FULL_ACCESS_ROLES = new Set(['superadmin', 'hr_admin', 'hr', 'admin', 'marketer', 'marketing_admin', 'simple_user']);
const READ_ACCESS_ROLES = new Set(['superadmin', 'hr_admin', 'hr', 'admin', 'marketer', 'marketing_admin', 'simple_user']);

const SOURCE_OPTIONS = [
  { value: '', label: 'Select source' },
  { value: 'phone', label: 'Phone' },
  { value: 'webform', label: 'Web Form' },
  { value: 'partner', label: 'Partner' },
];

const SERVICE_TYPE_OPTIONS = [
  { value: '', label: 'Select service type' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'restoration', label: 'Restoration' },
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'Select priority' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'same_day', label: 'Same Day' },
  { value: 'scheduled', label: 'Scheduled' },
];

const STATUS_OPTIONS = [
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'approved_for_outreach', label: 'Approved for Outreach' },
  { value: 'dispatching', label: 'Dispatching' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'en_route', label: 'En Route' },
  { value: 'complete', label: 'Complete' },
  { value: 'canceled', label: 'Canceled' },
];

const INITIAL_FORM_STATE = {
  job_id: '',
  source: '',
  transcript_id: '',
  customer_name: '',
  customer_phone: '',
  customer_email: '',
  address_street: '',
  address_unit: '',
  address_city: '',
  address_postal: '',
  service_type: '',
  subcategory: '',
  priority: '',
  window_start: '',
  window_end: '',
  notes_scope: '',
  compliance_only: false,
  status: 'pending_approval',
  assigned_vendor_id: '',
  ai_confidence: '',
  ai_json: '',
};

function normalizeRole(role) {
  return typeof role === 'string' ? role.trim().toLowerCase() : '';
}

function hasFullAccess(user) {
  if (!user) return false;
  return FULL_ACCESS_ROLES.has(normalizeRole(user?.role));
}

function hasReadAccess(user) {
  if (!user) return false;
  const role = normalizeRole(user?.role);
  // Exclude base_user from access
  if (role === 'base_user') return false;
  return hasFullAccess(user) || READ_ACCESS_ROLES.has(role);
}

function formatDateForInput(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (num) => String(num).padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function formatDateForDisplay(value) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

function preparePayload(formState, { isUpdate = false } = {}) {
  const payload = {};

  Object.entries(formState).forEach(([key, value]) => {
    if (value === '' || value === null || typeof value === 'undefined') {
      return;
    }
    if (key === 'ai_confidence') {
      const parsed = parseFloat(value);
      if (!Number.isNaN(parsed)) {
        payload.ai_confidence = parsed;
      }
      return;
    }
    if (key === 'compliance_only') {
      payload.compliance_only = Boolean(value);
      return;
    }
    if (key === 'window_start' || key === 'window_end' || key === 'created_at') {
      const date = value ? new Date(value) : null;
      if (date && !Number.isNaN(date.getTime())) {
        payload[key] = date.toISOString();
      }
      return;
    }
    payload[key] = typeof value === 'string' ? value.trim() : value;
  });

  if (!isUpdate && !payload.job_id) {
    throw new Error('Job ID is required');
  }

  return payload;
}

export default function JobManager({ user }) {
  const toast = useToast();
  const canRead = useMemo(() => hasReadAccess(user), [user]);
  const canEdit = useMemo(() => hasFullAccess(user), [user]);

  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [formState, setFormState] = useState(INITIAL_FORM_STATE);
  const [editingJobId, setEditingJobId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadJobs = useCallback(async () => {
    if (!canRead) return;
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/jobs?limit=100', {
        method: 'GET',
        credentials: 'include',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success === false) {
        const message = payload?.message || 'Failed to load jobs';
        throw new Error(message);
      }
      const data = payload?.data?.items || [];
      setJobs(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Unable to load jobs');
      setJobs([]);
    } finally {
      setIsLoading(false);
    }
  }, [canRead]);

  useEffect(() => {
    if (!canRead) return;
    loadJobs();
  }, [canRead, loadJobs]);

  const resetForm = useCallback(() => {
    setFormState(INITIAL_FORM_STATE);
    setEditingJobId('');
    setStatusMessage('');
    setError('');
  }, []);

  const handleInputChange = useCallback((event) => {
    const { name, value, type, checked } = event.target;
    setFormState((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }, []);

  const handleEdit = useCallback(
    (job) => {
      if (!canEdit) return;
      setEditingJobId(job.job_id);
      setFormState({
        job_id: job.job_id || '',
        source: job.source || '',
        transcript_id: job.transcript_id || '',
        customer_name: job.customer_name || '',
        customer_phone: job.customer_phone || '',
        customer_email: job.customer_email || '',
        address_street: job.address_street || '',
        address_unit: job.address_unit || '',
        address_city: job.address_city || '',
        address_postal: job.address_postal || '',
        service_type: job.service_type || '',
        subcategory: job.subcategory || '',
        priority: job.priority || '',
        window_start: formatDateForInput(job.window_start),
        window_end: formatDateForInput(job.window_end),
        notes_scope: job.notes_scope || '',
        compliance_only: Boolean(job.compliance_only),
        status: job.status || 'pending_approval',
        assigned_vendor_id: job.assigned_vendor_id || '',
        ai_confidence:
          typeof job.ai_confidence === 'number' && !Number.isNaN(job.ai_confidence)
            ? job.ai_confidence.toString()
            : '',
        ai_json: job.ai_json || '',
      });
      setStatusMessage('');
      setError('');
    },
    [canEdit]
  );

  const handleDelete = useCallback(
    async (jobId) => {
      if (!canEdit) return;
      if (!confirm('Are you sure you want to delete this job?')) return;

      try {
        const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload.success === false) {
          throw new Error(payload?.message || 'Failed to delete job');
        }
        toast.success('Job deleted successfully');
        await loadJobs();
        if (editingJobId === jobId) {
          resetForm();
        }
      } catch (err) {
        toast.error(err.message || 'Failed to delete job');
      }
    },
    [canEdit, loadJobs, editingJobId, resetForm, toast]
  );

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!canEdit) return;
      setIsSubmitting(true);
      setStatusMessage('');
      setError('');
      try {
        const payload = preparePayload(formState, { isUpdate: Boolean(editingJobId) });
        const method = editingJobId ? 'PUT' : 'POST';
        const url = editingJobId
          ? `/api/jobs/${encodeURIComponent(editingJobId)}`
          : '/api/jobs';
        const response = await fetch(url, {
          method,
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.success === false) {
          // Get detailed error message
          let errorMessage = data?.message || data?.error || 
            (editingJobId ? 'Failed to update job' : 'Failed to create job');
          
          // If error is an object or array, stringify it
          if (typeof errorMessage === 'object') {
            errorMessage = JSON.stringify(errorMessage);
          }
          
          // Include error details if available
          if (data?.error && typeof data.error !== 'string') {
            errorMessage += ': ' + JSON.stringify(data.error);
          }
          
          throw new Error(errorMessage);
        }
        toast.success(
          editingJobId ? 'Job updated successfully' : 'Job created successfully'
        );
        await loadJobs();
        resetForm();
      } catch (err) {
        const errorMessage = err.message || 'Unable to submit job';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsSubmitting(false);
      }
    },
    [canEdit, editingJobId, formState, loadJobs, resetForm, toast]
  );

  if (!canRead) {
    return (
      <div className={styles.container}>
        <h2 className={styles.heading}>Jobs</h2>
        <div className={styles.feedback + ' ' + styles.feedbackError}>
          You do not have permission to view jobs.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headingGroup}>
          <h2 className={styles.heading}>Jobs</h2>
          <p className={styles.subtitle}>
            Manage job requests and service orders. Track status, priority, and assignments.
          </p>
        </div>
        <div className={styles.headerMeta}>
          {canEdit && (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={resetForm}
              disabled={isSubmitting}
            >
              New Job
            </button>
          )}
        </div>
      </div>

      {statusMessage && (
        <div className={styles.feedback + ' ' + styles.feedbackSuccess}>{statusMessage}</div>
      )}
      {error && <div className={styles.feedback + ' ' + styles.feedbackError}>{error}</div>}

      {isLoading && (
        <div className={styles.feedback} style={{ textAlign: 'center' }}>
          Loading jobs...
        </div>
      )}

      {!isLoading && jobs.length === 0 && (
        <div className={styles.feedback} style={{ textAlign: 'center' }}>
          No jobs found.
        </div>
      )}

      {!isLoading && jobs.length > 0 && (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Job ID</th>
                <th>Customer</th>
                <th>Service</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Window</th>
                <th>Compliance</th>
                <th>Updated</th>
                {canEdit && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.job_id}>
                  <td>{job.job_id}</td>
                  <td>
                    <div className={styles.tableCellStack}>
                      <strong>{job.customer_name || '—'}</strong>
                      <span className={styles.subtleText}>{job.customer_email || job.customer_phone || '—'}</span>
                    </div>
                  </td>
                  <td>{job.service_type || '—'}</td>
                  <td>
                    <span
                      className={styles.statusBadge}
                      style={{
                        backgroundColor:
                          job.status === 'complete'
                            ? 'rgba(16, 185, 129, 0.1)'
                            : job.status === 'canceled'
                            ? 'rgba(239, 68, 68, 0.1)'
                            : 'rgba(148, 163, 184, 0.1)',
                        color:
                          job.status === 'complete'
                            ? '#10b981'
                            : job.status === 'canceled'
                            ? '#ef4444'
                            : '#64748b',
                      }}
                    >
                      {job.status || '—'}
                    </span>
                  </td>
                  <td>{job.priority || '—'}</td>
                  <td>
                    <div className={styles.tableCellStack}>
                      <span>{formatDateForDisplay(job.window_start)}</span>
                      <span className={styles.subtleText}>{formatDateForDisplay(job.window_end)}</span>
                    </div>
                  </td>
                  <td>{job.compliance_only ? 'Yes' : 'No'}</td>
                  <td>{formatDateForDisplay(job.updated_at || job.created_at)}</td>
                  {canEdit && (
                    <td>
                      <div className={styles.actionButtons}>
                        <button
                          type="button"
                          className={styles.editButton}
                          onClick={() => handleEdit(job)}
                          disabled={isSubmitting}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className={styles.deleteButton}
                          onClick={() => handleDelete(job.job_id)}
                          disabled={isSubmitting}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canEdit && (
        <form className={styles.form} onSubmit={handleSubmit}>
          <h3 className={styles.formTitle}>
            {editingJobId ? 'Edit Job' : 'Create New Job'}
          </h3>
          <div className={styles.formGrid}>
            <label className={styles.formField}>
              <span>Job ID *</span>
              <input
                type="text"
                name="job_id"
                value={formState.job_id}
                onChange={handleInputChange}
                required={!editingJobId}
                disabled={Boolean(editingJobId)}
                placeholder="job_uuid or leave blank to auto-generate"
              />
            </label>

            <label className={styles.formField}>
              <span>Source</span>
              <select name="source" value={formState.source} onChange={handleInputChange}>
                {SOURCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.formField}>
              <span>Service Type</span>
              <select
                name="service_type"
                value={formState.service_type}
                onChange={handleInputChange}
              >
                {SERVICE_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.formField}>
              <span>Priority</span>
              <select name="priority" value={formState.priority} onChange={handleInputChange}>
                {PRIORITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.formField}>
              <span>Status</span>
              <select name="status" value={formState.status} onChange={handleInputChange}>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.formField}>
              <span>Customer Name</span>
              <input
                type="text"
                name="customer_name"
                value={formState.customer_name}
                onChange={handleInputChange}
              />
            </label>

            <label className={styles.formField}>
              <span>Customer Email</span>
              <input
                type="email"
                name="customer_email"
                value={formState.customer_email}
                onChange={handleInputChange}
              />
            </label>

            <label className={styles.formField}>
              <span>Customer Phone</span>
              <input
                type="text"
                name="customer_phone"
                value={formState.customer_phone}
                onChange={handleInputChange}
              />
            </label>

            <label className={styles.formField}>
              <span>Transcript ID</span>
              <input
                type="text"
                name="transcript_id"
                value={formState.transcript_id}
                onChange={handleInputChange}
              />
            </label>

            <label className={styles.formField}>
              <span>Vendor ID</span>
              <input
                type="text"
                name="assigned_vendor_id"
                value={formState.assigned_vendor_id}
                onChange={handleInputChange}
              />
            </label>

            <label className={styles.formField}>
              <span>Window Start</span>
              <input
                type="datetime-local"
                name="window_start"
                value={formState.window_start}
                onChange={handleInputChange}
              />
            </label>

            <label className={styles.formField}>
              <span>Window End</span>
              <input
                type="datetime-local"
                name="window_end"
                value={formState.window_end}
                onChange={handleInputChange}
              />
            </label>

            <label className={styles.formField}>
              <span>Address Street</span>
              <input
                type="text"
                name="address_street"
                value={formState.address_street}
                onChange={handleInputChange}
              />
            </label>

            <label className={styles.formField}>
              <span>Address Unit</span>
              <input
                type="text"
                name="address_unit"
                value={formState.address_unit}
                onChange={handleInputChange}
              />
            </label>

            <label className={styles.formField}>
              <span>City</span>
              <input
                type="text"
                name="address_city"
                value={formState.address_city}
                onChange={handleInputChange}
              />
            </label>

            <label className={styles.formField}>
              <span>Postal Code</span>
              <input
                type="text"
                name="address_postal"
                value={formState.address_postal}
                onChange={handleInputChange}
              />
            </label>

            <label className={styles.formField}>
              <span>Subcategory</span>
              <input
                type="text"
                name="subcategory"
                value={formState.subcategory}
                onChange={handleInputChange}
              />
            </label>

            <label className={styles.formField}>
              <span>AI Confidence (0-1)</span>
              <input
                type="number"
                name="ai_confidence"
                min="0"
                max="1"
                step="0.01"
                value={formState.ai_confidence}
                onChange={handleInputChange}
              />
            </label>

            <label className={styles.formField} style={{ gridColumn: '1 / -1' }}>
              <span>Compliance Only</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  name="compliance_only"
                  checked={formState.compliance_only}
                  onChange={handleInputChange}
                />
                <span>Check if this is a compliance-only job</span>
              </label>
            </label>

            <label className={styles.formField} style={{ gridColumn: '1 / -1' }}>
              <span>Scope Notes</span>
              <textarea
                name="notes_scope"
                rows={3}
                value={formState.notes_scope}
                onChange={handleInputChange}
                placeholder="Enter job scope and notes"
              />
            </label>

            <label className={styles.formField} style={{ gridColumn: '1 / -1' }}>
              <span>AI JSON</span>
              <textarea
                name="ai_json"
                rows={3}
                placeholder='Paste JSON string (e.g. {"key":"value"})'
                value={formState.ai_json}
                onChange={handleInputChange}
              />
            </label>
          </div>

          <div className={styles.editActions}>
            <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
              {editingJobId ? 'Update Job' : 'Create Job'}
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={resetForm}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}


