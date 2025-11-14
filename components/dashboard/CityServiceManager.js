import { useCallback, useEffect, useMemo, useState } from 'react';
import styles from '../../styles/AdminDataManager.module.css';

// Access control - exclude base_user
const FULL_ACCESS_ROLES = new Set(['superadmin', 'hr_admin', 'hr', 'admin', 'marketing', 'developer']);
const READ_ACCESS_ROLES = new Set([
  'superadmin',
  'hr_admin',
  'hr',
  'admin',
  'marketing',
  'developer',
]);

const INITIAL_FORM_STATE = {
  province: '',
  city: '',
  service: '',
  subservice: '',
  title: '',
  description: '',
  isActive: true,
};

function normalizeRole(role) {
  return typeof role === 'string' ? role.trim().toLowerCase() : '';
}

function hasFullAccess(user) {
  return FULL_ACCESS_ROLES.has(normalizeRole(user?.role));
}

function hasReadAccess(user) {
  const role = normalizeRole(user?.role);
  return READ_ACCESS_ROLES.has(role);
}

export default function CityServiceManager({ user }) {
  const canRead = useMemo(() => hasReadAccess(user), [user]);
  const canEdit = useMemo(() => hasFullAccess(user), [user]);

  const [routes, setRoutes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [formState, setFormState] = useState(INITIAL_FORM_STATE);
  const [editingId, setEditingId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [isTesting, setIsTesting] = useState(false);

  const loadRoutes = useCallback(async () => {
    if (!canRead) return;
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/city-service-routes?limit=100', {
        method: 'GET',
        credentials: 'include',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success === false) {
        const message = payload?.message || 'Failed to load city service routes';
        throw new Error(message);
      }
      const data = payload?.data?.items || [];
      setRoutes(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Unable to load city service routes');
      setRoutes([]);
    } finally {
      setIsLoading(false);
    }
  }, [canRead]);

  useEffect(() => {
    if (!canRead) return;
    loadRoutes();
  }, [canRead, loadRoutes]);

  const resetForm = useCallback(() => {
    setFormState(INITIAL_FORM_STATE);
    setEditingId('');
    setStatusMessage('');
    setError('');
    setTestResult(null);
  }, []);

  const handleInputChange = useCallback((event) => {
    const { name, value, type, checked } = event.target;
    setFormState((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }, []);

  const handleEdit = useCallback(
    (route) => {
      if (!canEdit) return;
      setFormState({
        province: route.province || '',
        city: route.city || '',
        service: route.service || '',
        subservice: route.subservice || '',
        title: route.title || '',
        description: route.description || '',
        isActive: route.isActive !== undefined ? route.isActive : true,
      });
      setEditingId(route._id);
      setTestResult(null);
      setError('');
      setStatusMessage('');
    },
    [canEdit]
  );

  const handleDelete = useCallback(
    async (id) => {
      if (!canEdit) return;
      if (!confirm('Are you sure you want to delete this route?')) return;

      try {
        const response = await fetch(`/api/city-service-routes/${id}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.success === false) {
          throw new Error(data?.message || 'Failed to delete route');
        }
        setStatusMessage('Route deleted successfully');
        await loadRoutes();
        if (editingId === id) {
          resetForm();
        }
      } catch (err) {
        setError(err.message || 'Unable to delete route');
      }
    },
    [canEdit, editingId, loadRoutes, resetForm]
  );

  const handleTest = useCallback(async () => {
    if (!canEdit) return;
    const { province, city, service, subservice } = formState;

    if (!province || !city || !service) {
      setError('Province, city, and service are required for testing');
      return;
    }

    setIsTesting(true);
    setError('');
    setTestResult(null);

    try {
      const response = await fetch('/api/city-service-routes/test', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ province, city, service, subservice: subservice || null }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success === false) {
        throw new Error(data?.message || 'Failed to test route');
      }
      setTestResult(data.data);
    } catch (err) {
      setError(err.message || 'Unable to test route');
    } finally {
      setIsTesting(false);
    }
  }, [canEdit, formState]);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!canEdit) return;
      setIsSubmitting(true);
      setStatusMessage('');
      setError('');

      try {
        const method = editingId ? 'PUT' : 'POST';
        const url = editingId
          ? `/api/city-service-routes/${editingId}`
          : '/api/city-service-routes';

        const response = await fetch(url, {
          method,
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formState),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.success === false) {
          const message =
            data?.message || (editingId ? 'Failed to update route' : 'Failed to create route');
          throw new Error(message);
        }
        setStatusMessage(editingId ? 'Route updated successfully' : 'Route created successfully');
        await loadRoutes();
        resetForm();
      } catch (err) {
        setError(err.message || 'Unable to submit route');
      } finally {
        setIsSubmitting(false);
      }
    },
    [canEdit, editingId, formState, loadRoutes, resetForm]
  );

  if (!canRead) {
    return (
      <div className={styles.container}>
        <h2 className={styles.heading}>City Service Routes</h2>
        <div className={styles.feedback + ' ' + styles.feedbackError}>
          You do not have permission to view city service routes.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>City Service Routes</h2>
      <p style={{ marginBottom: '1.5rem', color: '#666' }}>
        Manage dynamic city + service URL routes. Test routes before creating them.
      </p>

      {canEdit && (
        <div className={styles.toolbar}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={resetForm}
            disabled={isSubmitting}
          >
            New Route
          </button>
        </div>
      )}

      {statusMessage && (
        <div className={`${styles.feedback} ${styles.feedbackSuccess}`}>{statusMessage}</div>
      )}
      {error && <div className={`${styles.feedback} ${styles.feedbackError}`}>{error}</div>}

      {canEdit && (
        <form className={styles.form} onSubmit={handleSubmit}>
          <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>
            {editingId ? 'Edit Route' : 'Create New Route'}
          </h3>

          <div className={styles.formGrid}>
            <label className={styles.formField}>
              <span>Province/State Code *</span>
              <input
                type="text"
                name="province"
                value={formState.province}
                onChange={handleInputChange}
                placeholder="e.g., ab, bc, on"
                required
                disabled={isSubmitting}
              />
            </label>

            <label className={styles.formField}>
              <span>City *</span>
              <input
                type="text"
                name="city"
                value={formState.city}
                onChange={handleInputChange}
                placeholder="e.g., calgary, toronto"
                required
                disabled={isSubmitting}
              />
            </label>

            <label className={styles.formField}>
              <span>Service *</span>
              <input
                type="text"
                name="service"
                value={formState.service}
                onChange={handleInputChange}
                placeholder="e.g., electrician, plumber"
                required
                disabled={isSubmitting}
              />
            </label>

            <label className={styles.formField}>
              <span>Subservice (Optional)</span>
              <input
                type="text"
                name="subservice"
                value={formState.subservice}
                onChange={handleInputChange}
                placeholder="e.g., high-voltage-electrician"
                disabled={isSubmitting}
              />
            </label>

            <label className={styles.formField}>
              <span>Title (Optional - Auto-generated if empty)</span>
              <input
                type="text"
                name="title"
                value={formState.title}
                onChange={handleInputChange}
                disabled={isSubmitting}
              />
            </label>

            <label className={styles.formField}>
              <span>Description (Optional - Auto-generated if empty)</span>
              <textarea
                name="description"
                value={formState.description}
                onChange={handleInputChange}
                disabled={isSubmitting}
              />
            </label>

            <label className={styles.formFieldCheckbox}>
              <input
                type="checkbox"
                name="isActive"
                checked={formState.isActive}
                onChange={handleInputChange}
                disabled={isSubmitting}
              />
              <span>Active</span>
            </label>
          </div>

          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleTest}
              disabled={isSubmitting || isTesting || !formState.province || !formState.city || !formState.service}
            >
              {isTesting ? 'Testing...' : 'Test Route'}
            </button>
            <button
              type="submit"
              className={styles.primaryButton}
              disabled={isSubmitting || isTesting}
            >
              {isSubmitting ? 'Saving...' : editingId ? 'Update Route' : 'Create Route'}
            </button>
            {editingId && (
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={resetForm}
                disabled={isSubmitting}
              >
                Cancel
              </button>
            )}
          </div>

          {testResult && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: '#f0f9ff', borderRadius: '0.5rem', border: '1px solid #bae6fd' }}>
              <h4 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Test Results:</h4>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong>URL:</strong>{' '}
                <a href={testResult.testUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>
                  {testResult.testUrl}
                </a>
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong>Title:</strong> {testResult.metadata?.title}
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong>Description:</strong> {testResult.metadata?.description}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#666' }}>
                <strong>Valid:</strong> {testResult.isValid ? 'Yes' : 'No'}
              </div>
            </div>
          )}
        </form>
      )}

      <div className={styles.tableContainer}>
        {isLoading ? (
          <div className={styles.feedback + ' ' + styles.feedbackInfo}>Loading routes...</div>
        ) : routes.length === 0 ? (
          <div className={styles.feedback + ' ' + styles.feedbackInfo}>
            No routes found. Create your first route above.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Province</th>
                <th>City</th>
                <th>Service</th>
                <th>Subservice</th>
                <th>Title</th>
                <th>Status</th>
                <th>Created</th>
                {canEdit && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {routes.map((route) => (
                <tr key={route._id}>
                  <td>{route.province?.toUpperCase()}</td>
                  <td>{route.city}</td>
                  <td>{route.service}</td>
                  <td>{route.subservice || '-'}</td>
                  <td>{route.title || '-'}</td>
                  <td>
                    <span
                      style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.875rem',
                        background: route.isActive ? '#dcfce7' : '#fee2e2',
                        color: route.isActive ? '#166534' : '#991b1b',
                      }}
                    >
                      {route.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{new Date(route.createdAt).toLocaleDateString()}</td>
                  {canEdit && (
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          type="button"
                          className={styles.linkButton}
                          onClick={() => handleEdit(route)}
                          disabled={isSubmitting}
                        >
                          Edit
                        </button>
                        <a
                          href={`/${route.province}/${route.city}/${route.service}${route.subservice ? `/${route.subservice}` : ''}/`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.linkButton}
                        >
                          View
                        </a>
                        <button
                          type="button"
                          className={styles.linkButton}
                          onClick={() => handleDelete(route._id)}
                          disabled={isSubmitting}
                          style={{ color: '#dc2626' }}
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
        )}
      </div>
    </div>
  );
}

