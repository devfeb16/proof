import { useCallback, useEffect, useMemo, useState } from 'react';
import styles from '../../styles/AdminDataManager.module.css';
import { useToast } from '../ToastProvider';

const FULL_ACCESS_ROLES = new Set(['superadmin', 'hr_admin', 'hr', 'admin', 'marketer', 'marketing_admin', 'simple_user']);
const READ_ACCESS_ROLES = new Set(['superadmin', 'hr_admin', 'hr', 'admin', 'marketer', 'marketing_admin', 'simple_user']);

const INITIAL_FORM_STATE = {
  transcript_id: '',
  raw_text: '',
  call_start: '',
  call_end: '',
  caller_number: '',
  agent_name: '',
  ai_parse_json: '',
  parse_confidence: '',
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
    if (key === 'parse_confidence') {
      const parsed = parseFloat(value);
      if (!Number.isNaN(parsed)) {
        payload.parse_confidence = parsed;
      }
      return;
    }
    if (key === 'call_start' || key === 'call_end') {
      const date = value ? new Date(value) : null;
      if (date && !Number.isNaN(date.getTime())) {
        payload[key] = date.toISOString();
      }
      return;
    }
    payload[key] = typeof value === 'string' ? value.trim() : value;
  });

  if (!isUpdate && !payload.transcript_id) {
    throw new Error('Transcript ID is required');
  }

  return payload;
}

export default function TranscriptManager({ user }) {
  const toast = useToast();
  const canRead = useMemo(() => hasReadAccess(user), [user]);
  const canEdit = useMemo(() => hasFullAccess(user), [user]);

  const [transcripts, setTranscripts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [formState, setFormState] = useState(INITIAL_FORM_STATE);
  const [editingId, setEditingId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadTranscripts = useCallback(async () => {
    if (!canRead) return;
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/transcripts?limit=100', {
        method: 'GET',
        credentials: 'include',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success === false) {
        const message = payload?.message || 'Failed to load transcripts';
        throw new Error(message);
      }
      const data = payload?.data?.items || [];
      setTranscripts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Unable to load transcripts');
      setTranscripts([]);
    } finally {
      setIsLoading(false);
    }
  }, [canRead]);

  useEffect(() => {
    if (!canRead) return;
    loadTranscripts();
  }, [canRead, loadTranscripts]);

  const resetForm = useCallback(() => {
    setFormState(INITIAL_FORM_STATE);
    setEditingId('');
    setStatusMessage('');
    setError('');
  }, []);

  const handleInputChange = useCallback((event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const handleEdit = useCallback(
    (transcript) => {
      if (!canEdit) return;
      setEditingId(transcript.transcript_id);
      setFormState({
        transcript_id: transcript.transcript_id || '',
        raw_text: transcript.raw_text || '',
        call_start: formatDateForInput(transcript.call_start),
        call_end: formatDateForInput(transcript.call_end),
        caller_number: transcript.caller_number || '',
        agent_name: transcript.agent_name || '',
        ai_parse_json: transcript.ai_parse_json || '',
        parse_confidence:
          typeof transcript.parse_confidence === 'number' && !Number.isNaN(transcript.parse_confidence)
            ? transcript.parse_confidence.toString()
            : '',
      });
      setStatusMessage('');
      setError('');
    },
    [canEdit]
  );

  const handleDelete = useCallback(
    async (transcriptId) => {
      if (!canEdit) return;
      if (!confirm('Are you sure you want to delete this transcript?')) return;

      try {
        const response = await fetch(`/api/transcripts/${encodeURIComponent(transcriptId)}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload.success === false) {
          throw new Error(payload?.message || 'Failed to delete transcript');
        }
        toast.success('Transcript deleted successfully');
        await loadTranscripts();
        if (editingId === transcriptId) {
          resetForm();
        }
      } catch (err) {
        toast.error(err.message || 'Failed to delete transcript');
      }
    },
    [canEdit, loadTranscripts, editingId, resetForm, toast]
  );

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!canEdit) return;
      setIsSubmitting(true);
      setStatusMessage('');
      setError('');
      try {
        const payload = preparePayload(formState, { isUpdate: Boolean(editingId) });
        const method = editingId ? 'PUT' : 'POST';
        const url = editingId
          ? `/api/transcripts/${encodeURIComponent(editingId)}`
          : '/api/transcripts';
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
            (editingId ? 'Failed to update transcript' : 'Failed to create transcript');
          
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
          editingId ? 'Transcript updated successfully' : 'Transcript created successfully'
        );
        await loadTranscripts();
        resetForm();
      } catch (err) {
        const errorMessage = err.message || 'Unable to submit transcript';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsSubmitting(false);
      }
    },
    [canEdit, editingId, formState, loadTranscripts, resetForm, toast]
  );

  if (!canRead) {
    return (
      <div className={styles.container}>
        <h2 className={styles.heading}>Transcripts</h2>
        <div className={styles.feedback + ' ' + styles.feedbackError}>
          You do not have permission to view transcripts.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headingGroup}>
          <h2 className={styles.heading}>Transcripts</h2>
          <p className={styles.subtitle}>
            Manage call transcripts and AI parsing results. Track call metadata and confidence scores.
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
              New Transcript
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
          Loading transcripts...
        </div>
      )}

      {!isLoading && transcripts.length === 0 && (
        <div className={styles.feedback} style={{ textAlign: 'center' }}>
          No transcripts found.
        </div>
      )}

      {!isLoading && transcripts.length > 0 && (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Transcript ID</th>
                <th>Caller</th>
                <th>Agent</th>
                <th>Call Window</th>
                <th>Confidence</th>
                <th>Updated</th>
                {canEdit && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {transcripts.map((transcript) => (
                <tr key={transcript.transcript_id}>
                  <td>{transcript.transcript_id}</td>
                  <td>{transcript.caller_number || '—'}</td>
                  <td>{transcript.agent_name || '—'}</td>
                  <td>
                    <div className={styles.tableCellStack}>
                      <span>{formatDateForDisplay(transcript.call_start)}</span>
                      <span className={styles.subtleText}>{formatDateForDisplay(transcript.call_end)}</span>
                    </div>
                  </td>
                  <td>
                    {typeof transcript.parse_confidence === 'number'
                      ? transcript.parse_confidence.toFixed(2)
                      : '—'}
                  </td>
                  <td>{formatDateForDisplay(transcript.updated_at || transcript.created_at)}</td>
                  {canEdit && (
                    <td>
                      <div className={styles.actionButtons}>
                        <button
                          type="button"
                          className={styles.editButton}
                          onClick={() => handleEdit(transcript)}
                          disabled={isSubmitting}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className={styles.deleteButton}
                          onClick={() => handleDelete(transcript.transcript_id)}
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
            {editingId ? 'Edit Transcript' : 'Create New Transcript'}
          </h3>
          <div className={styles.formGrid}>
            <label className={styles.formField}>
              <span>Transcript ID *</span>
              <input
                type="text"
                name="transcript_id"
                value={formState.transcript_id}
                onChange={handleInputChange}
                required={!editingId}
                disabled={Boolean(editingId)}
                placeholder="transcript_uuid or leave blank to auto-generate"
              />
            </label>

            <label className={styles.formField}>
              <span>Caller Number</span>
              <input
                type="text"
                name="caller_number"
                value={formState.caller_number}
                onChange={handleInputChange}
              />
            </label>

            <label className={styles.formField}>
              <span>Agent Name</span>
              <input
                type="text"
                name="agent_name"
                value={formState.agent_name}
                onChange={handleInputChange}
              />
            </label>

            <label className={styles.formField}>
              <span>Parse Confidence (0-1)</span>
              <input
                type="number"
                name="parse_confidence"
                min="0"
                max="1"
                step="0.01"
                value={formState.parse_confidence}
                onChange={handleInputChange}
              />
            </label>

            <label className={styles.formField}>
              <span>Call Start</span>
              <input
                type="datetime-local"
                name="call_start"
                value={formState.call_start}
                onChange={handleInputChange}
              />
            </label>

            <label className={styles.formField}>
              <span>Call End</span>
              <input
                type="datetime-local"
                name="call_end"
                value={formState.call_end}
                onChange={handleInputChange}
              />
            </label>

            <label className={styles.formField} style={{ gridColumn: '1 / -1' }}>
              <span>Raw Text</span>
              <textarea
                name="raw_text"
                rows={4}
                value={formState.raw_text}
                onChange={handleInputChange}
                placeholder="Paste transcript text…"
              />
            </label>

            <label className={styles.formField} style={{ gridColumn: '1 / -1' }}>
              <span>AI Parse JSON</span>
              <textarea
                name="ai_parse_json"
                rows={3}
                value={formState.ai_parse_json}
                onChange={handleInputChange}
                placeholder='Paste JSON string (e.g. {"key":"value"})'
              />
            </label>
          </div>

          <div className={styles.editActions}>
            <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
              {editingId ? 'Update Transcript' : 'Create Transcript'}
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


