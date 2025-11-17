import { useCallback, useEffect, useMemo, useState } from 'react';
import styles from '../../styles/ScraperManager.module.css';

const FULL_ACCESS_ROLES = new Set(['superadmin', 'hr_admin', 'hr', 'admin']);

function normalizeRole(role) {
  return typeof role === 'string' ? role.trim().toLowerCase() : '';
}

function hasFullAccess(user) {
  return FULL_ACCESS_ROLES.has(normalizeRole(user?.role));
}

function formatDateForDisplay(value) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

export default function ScraperManager({ user }) {
  const canAccess = useMemo(() => hasFullAccess(user), [user]);

  const [url, setUrl] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [scrapedData, setScrapedData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedItems, setSavedItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const loadSavedItems = useCallback(async () => {
    if (!canAccess) return;
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/scraper?limit=50', {
        method: 'GET',
        credentials: 'include',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success === false) {
        const message = payload?.message || 'Failed to load saved scraped data';
        throw new Error(message);
      }
      const data = payload?.data?.items || [];
      setSavedItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Unable to load saved scraped data');
      setSavedItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [canAccess]);

  useEffect(() => {
    if (!canAccess) return;
    loadSavedItems();
  }, [canAccess, loadSavedItems]);

  const handleScrape = useCallback(
    async (e) => {
      e.preventDefault();
      if (!canAccess || !url.trim()) return;

      setIsScraping(true);
      setError('');
      setStatusMessage('');
      setScrapedData(null);

      try {
        const response = await fetch('/api/scraper/scrape', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: url.trim() }),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.success === false) {
          const message = data?.message || 'Failed to scrape website';
          throw new Error(message);
        }

        setScrapedData(data.data?.scrapedData || null);
        setStatusMessage('Website scraped successfully! Review the data below and click "Save Scraped Data" to save it.');
      } catch (err) {
        setError(err.message || 'Unable to scrape website');
        setScrapedData(null);
      } finally {
        setIsScraping(false);
      }
    },
    [canAccess, url]
  );

  const handleSave = useCallback(async () => {
    if (!canAccess || !scrapedData) return;

    setIsSaving(true);
    setError('');
    setStatusMessage('');

    try {
      const response = await fetch('/api/scraper/save', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scrapedData }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success === false) {
        const message = data?.message || 'Failed to save scraped data';
        throw new Error(message);
      }

      setStatusMessage('Scraped data saved successfully!');
      setScrapedData(null);
      setUrl('');
      await loadSavedItems();
    } catch (err) {
      setError(err.message || 'Unable to save scraped data');
    } finally {
      setIsSaving(false);
    }
  }, [canAccess, scrapedData, loadSavedItems]);

  const handleDelete = useCallback(
    async (id) => {
      if (!canAccess) return;
      const confirmed =
        typeof window === 'undefined'
          ? true
          : window.confirm('Delete this saved scraped data? This action cannot be undone.');
      if (!confirmed) return;

      setIsSaving(true);
      setError('');
      setStatusMessage('');

      try {
        const response = await fetch(`/api/scraper/${id}`, {
          method: 'DELETE',
          credentials: 'include',
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload.success === false) {
          const message = payload?.message || 'Failed to delete scraped data';
          throw new Error(message);
        }

        setStatusMessage('Scraped data deleted successfully');
        await loadSavedItems();
      } catch (err) {
        setError(err.message || 'Unable to delete scraped data');
      } finally {
        setIsSaving(false);
      }
    },
    [canAccess, loadSavedItems]
  );

  if (!canAccess) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headingGroup}>
            <h2 className={styles.heading}>Web Scraper</h2>
          </div>
        </div>
        <div className={styles.feedback + ' ' + styles.feedbackError}>
          You do not have permission to access the web scraper.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headingGroup}>
          <h2 className={styles.heading}>Web Scraper</h2>
          <p className={styles.subtitle}>
            Scrape websites and extract structured data. Save important information for future reference.
          </p>
        </div>
      </div>

      {statusMessage && (
        <div className={`${styles.feedback} ${styles.feedbackSuccess}`}>{statusMessage}</div>
      )}
      {error && <div className={`${styles.feedback} ${styles.feedbackError}`}>{error}</div>}

      {/* Scraping Form */}
      <form className={styles.form} onSubmit={handleScrape}>
        <h3 className={styles.formTitle}>Scrape Website</h3>
        <div className={styles.formGrid}>
          <label className={`${styles.formField} ${styles.formFieldFullWidth}`}>
            <span>Website URL *</span>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              required
              disabled={isScraping}
            />
          </label>
        </div>
        <div className={styles.formActions}>
          <button
            type="submit"
            className={styles.primaryButton}
            disabled={isScraping || !url.trim()}
          >
            {isScraping ? 'Scraping...' : 'Scrape Website'}
          </button>
        </div>
      </form>

      {/* Scraped Data Preview */}
      {scrapedData && (
        <div className={styles.previewSection}>
          <div className={styles.previewHeader}>
            <h3 className={styles.formTitle}>Scraped Data Preview</h3>
            <button
              type="button"
              onClick={handleSave}
              className={styles.primaryButton}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Scraped Data'}
            </button>
          </div>

          <div className={styles.previewContent}>
            {scrapedData.title && (
              <div className={styles.previewItem}>
                <strong>Title:</strong>
                <p>{scrapedData.title}</p>
              </div>
            )}

            {scrapedData.description && (
              <div className={styles.previewItem}>
                <strong>Description:</strong>
                <p>{scrapedData.description}</p>
              </div>
            )}

            {scrapedData.keywords && scrapedData.keywords.length > 0 && (
              <div className={styles.previewItem}>
                <strong>Keywords:</strong>
                <p>{scrapedData.keywords.join(', ')}</p>
              </div>
            )}

            {scrapedData.headings && (
              <div className={styles.previewItem}>
                <strong>Headings:</strong>
                <div>
                  {scrapedData.headings.h1 && scrapedData.headings.h1.length > 0 && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong style={{ fontSize: '0.9rem' }}>H1:</strong>
                      <ul className={styles.previewList}>
                        {scrapedData.headings.h1.slice(0, 5).map((h, i) => (
                          <li key={i}>{h}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {scrapedData.headings.h2 && scrapedData.headings.h2.length > 0 && (
                    <div>
                      <strong style={{ fontSize: '0.9rem' }}>H2:</strong>
                      <ul className={styles.previewList}>
                        {scrapedData.headings.h2.slice(0, 10).map((h, i) => (
                          <li key={i}>{h}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {scrapedData.links && scrapedData.links.length > 0 && (
              <div className={styles.previewItem}>
                <strong>Links ({scrapedData.links.length} found):</strong>
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  <ul className={styles.previewList}>
                    {scrapedData.links.slice(0, 20).map((link, i) => (
                      <li key={i}>
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.previewLink}
                        >
                          {link.text || link.href}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {scrapedData.images && scrapedData.images.length > 0 && (
              <div className={styles.previewItem}>
                <strong>Images ({scrapedData.images.length} found):</strong>
                <div className={styles.previewImages}>
                  {scrapedData.images.slice(0, 6).map((img, i) => (
                    <div key={i} className={styles.previewImage}>
                      <img
                        src={img.src}
                        alt={img.alt || 'Image'}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                      {img.alt && <p>{img.alt.substring(0, 50)}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {scrapedData.text && (
              <div className={styles.previewItem}>
                <strong>Text Preview:</strong>
                <div className={styles.previewText}>
                  {scrapedData.text.substring(0, 2000)}
                  {scrapedData.text.length > 2000 && '...'}
                </div>
              </div>
            )}

            {scrapedData.metadata && Object.keys(scrapedData.metadata).length > 0 && (
              <div className={styles.previewItem}>
                <strong>Metadata:</strong>
                <pre className={styles.previewMetadata}>
                  {JSON.stringify(scrapedData.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Saved Items List */}
      <div className={styles.savedListHeader}>
        <h3 className={styles.heading}>
          Saved Scraped Data ({savedItems.length})
        </h3>
      </div>

      <div className={styles.listHeader}>
        <button
          type="button"
          onClick={loadSavedItems}
          className={styles.refreshButton}
          disabled={isLoading}
        >
          {isLoading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className={styles.tableWrapper}>
        {isLoading ? (
          <div className={`${styles.feedback} ${styles.feedbackInfo}`}>
            Loading saved scraped data…
          </div>
        ) : savedItems.length === 0 ? (
          <div className={`${styles.feedback} ${styles.feedbackInfo}`}>
            No saved scraped data yet. Scrape a website and save it to see it here.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>URL</th>
                <th>Title</th>
                <th>Description</th>
                <th>Images</th>
                <th>Links</th>
                <th>Scraped At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {savedItems.map((item) => (
                <tr key={item.id}>
                  <td>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.previewLink}
                    >
                      {item.url.length > 50 ? `${item.url.substring(0, 50)}...` : item.url}
                    </a>
                  </td>
                  <td>{item.title || '—'}</td>
                  <td>
                    {item.description
                      ? item.description.length > 100
                        ? `${item.description.substring(0, 100)}...`
                        : item.description
                      : '—'}
                  </td>
                  <td>{item.imageCount || 0}</td>
                  <td>{item.importantLinks?.length || 0}</td>
                  <td>{formatDateForDisplay(item.scrapedAt)}</td>
                  <td>
                    <div className={styles.actionGroup}>
                      <button
                        type="button"
                        className={styles.linkButtonDanger}
                        onClick={() => handleDelete(item.id)}
                        disabled={isSaving}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

