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
  const [selectedItem, setSelectedItem] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

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

  // Normalize URL to add protocol if missing
  const normalizeUrl = useCallback((inputUrl) => {
    if (!inputUrl || typeof inputUrl !== 'string') return '';
    
    let normalized = inputUrl.trim();
    
    // Remove any leading/trailing whitespace and slashes
    normalized = normalized.replace(/^\/+|\/+$/g, '');
    
    // If it already has http:// or https://, return as is
    if (/^https?:\/\//i.test(normalized)) {
      return normalized;
    }
    
    // If it starts with //, add https:
    if (/^\/\//.test(normalized)) {
      return `https:${normalized}`;
    }
    
    // If it looks like a domain (contains a dot and no spaces), add https://
    if (/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}/.test(normalized)) {
      return `https://${normalized}`;
    }
    
    // If it's a localhost or IP address, add http://
    if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])/.test(normalized)) {
      return `http://${normalized}`;
    }
    
    // Default: try with https://
    return `https://${normalized}`;
  }, []);

  const handleScrape = useCallback(
    async (e) => {
      e.preventDefault();
      if (!canAccess || !url.trim()) return;

      setIsScraping(true);
      setError('');
      setStatusMessage('');
      setScrapedData(null);

      try {
        // Normalize the URL before sending
        const normalizedUrl = normalizeUrl(url.trim());
        
        const response = await fetch('/api/scraper/scrape', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: normalizedUrl }),
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
    [canAccess, url, normalizeUrl]
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
        if (selectedItem && selectedItem.id === id) {
          setSelectedItem(null);
        }
        await loadSavedItems();
      } catch (err) {
        setError(err.message || 'Unable to delete scraped data');
      } finally {
        setIsSaving(false);
      }
    },
    [canAccess, loadSavedItems, selectedItem]
  );

  const handleViewDetails = useCallback(
    async (id) => {
      if (!canAccess) return;
      setIsLoadingDetails(true);
      setError('');

      try {
        const response = await fetch(`/api/scraper/${id}`, {
          method: 'GET',
          credentials: 'include',
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.success === false) {
          const message = data?.message || 'Failed to load scraped data details';
          throw new Error(message);
        }

        setSelectedItem(data.data?.scrapedData || null);
      } catch (err) {
        setError(err.message || 'Unable to load scraped data details');
      } finally {
        setIsLoadingDetails(false);
      }
    },
    [canAccess]
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
            <span>Website URL or Domain *</span>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="example.com or https://example.com"
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

          <div className={styles.previewGrid}>
            {/* Domain Info Card */}
            {scrapedData.domainInfo && Object.keys(scrapedData.domainInfo).length > 0 && (
              <div className={`${styles.previewCard} ${styles.cardDomain}`}>
                <div className={styles.cardHeader}>
                  <h4 className={styles.cardTitle}>Domain Information</h4>
                </div>
                <div className={styles.cardContent}>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Domain:</span>
                    <span className={styles.infoValue}>{scrapedData.domainInfo.domain || '—'}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Protocol:</span>
                    <span className={styles.infoValue}>{scrapedData.domainInfo.protocol || '—'}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Host:</span>
                    <span className={styles.infoValue}>{scrapedData.domainInfo.host || '—'}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Path:</span>
                    <span className={styles.infoValue}>{scrapedData.domainInfo.path || '/'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Title Card */}
            {scrapedData.title && (
              <div className={`${styles.previewCard} ${styles.cardTitle}`}>
                <div className={styles.cardHeader}>
                  <h4 className={styles.cardTitle}>Page Title</h4>
                </div>
                <div className={styles.cardContent}>
                  <p className={styles.cardText}>{scrapedData.title}</p>
                </div>
              </div>
            )}

            {/* Description Card */}
            {scrapedData.description && (
              <div className={`${styles.previewCard} ${styles.cardDescription}`}>
                <div className={styles.cardHeader}>
                  <h4 className={styles.cardTitle}>Description</h4>
                </div>
                <div className={styles.cardContent}>
                  <p className={styles.cardText}>{scrapedData.description}</p>
                </div>
              </div>
            )}

            {/* Statistics Card */}
            {scrapedData.stats && (
              <div className={`${styles.previewCard} ${styles.cardStats}`}>
                <div className={styles.cardHeader}>
                  <h4 className={styles.cardTitle}>Statistics</h4>
                </div>
                <div className={styles.cardContent}>
                  <div className={styles.statsGrid}>
                    <div className={styles.statItem}>
                      <span className={styles.statValue}>{scrapedData.stats.totalHeadings || 0}</span>
                      <span className={styles.statLabel}>Headings</span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statValue}>{scrapedData.stats.totalLinks || 0}</span>
                      <span className={styles.statLabel}>Links</span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statValue}>{scrapedData.stats.totalImages || 0}</span>
                      <span className={styles.statLabel}>Images</span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statValue}>{scrapedData.stats.totalKeywords || 0}</span>
                      <span className={styles.statLabel}>Keywords</span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statValue}>
                        {scrapedData.stats.textLength ? `${Math.round(scrapedData.stats.textLength / 1000)}k` : '0'}
                      </span>
                      <span className={styles.statLabel}>Text Length</span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statValue}>
                        {scrapedData.stats.hasStructuredData ? 'Yes' : 'No'}
                      </span>
                      <span className={styles.statLabel}>Structured Data</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Keywords Card */}
            {Array.isArray(scrapedData.keywords) && scrapedData.keywords.length > 0 && (
              <div className={`${styles.previewCard} ${styles.cardKeywords}`}>
                <div className={styles.cardHeader}>
                  <h4 className={styles.cardTitle}>Keywords</h4>
                </div>
                <div className={styles.cardContent}>
                  <div className={styles.keywordsList}>
                    {scrapedData.keywords.map((keyword, i) => (
                      <span key={i} className={styles.keywordTag}>{keyword}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Headings Card */}
            {scrapedData.headings && typeof scrapedData.headings === 'object' && (
              <div className={`${styles.previewCard} ${styles.cardHeadings}`}>
                <div className={styles.cardHeader}>
                  <h4 className={styles.cardTitle}>Headings</h4>
                </div>
                <div className={styles.cardContent}>
                  {Array.isArray(scrapedData.headings.h1) && scrapedData.headings.h1.length > 0 && (
                    <div className={styles.headingGroup}>
                      <strong className={styles.headingLabel}>H1 ({scrapedData.headings.h1.length}):</strong>
                      <ul className={styles.previewList}>
                        {scrapedData.headings.h1.slice(0, 5).map((h, i) => (
                          <li key={i}>{h}</li>
                        ))}
                        {scrapedData.headings.h1.length > 5 && <li>... and {scrapedData.headings.h1.length - 5} more</li>}
                      </ul>
                    </div>
                  )}
                  {Array.isArray(scrapedData.headings.h2) && scrapedData.headings.h2.length > 0 && (
                    <div className={styles.headingGroup}>
                      <strong className={styles.headingLabel}>H2 ({scrapedData.headings.h2.length}):</strong>
                      <ul className={styles.previewList}>
                        {scrapedData.headings.h2.slice(0, 10).map((h, i) => (
                          <li key={i}>{h}</li>
                        ))}
                        {scrapedData.headings.h2.length > 10 && <li>... and {scrapedData.headings.h2.length - 10} more</li>}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Links Card */}
            {Array.isArray(scrapedData.links) && scrapedData.links.length > 0 && (
              <div className={`${styles.previewCard} ${styles.cardLinks}`}>
                <div className={styles.cardHeader}>
                  <h4 className={styles.cardTitle}>Links ({scrapedData.links.length})</h4>
                </div>
                <div className={styles.cardContent}>
                  <div className={styles.linksList}>
                    {scrapedData.links.slice(0, 20).map((link, i) => (
                      <a
                        key={i}
                        href={link?.href || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.linkItem}
                      >
                        {link?.text || link?.href || 'Link'}
                      </a>
                    ))}
                    {scrapedData.links.length > 20 && (
                      <div className={styles.moreIndicator}>... and {scrapedData.links.length - 20} more links</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Images Card */}
            {Array.isArray(scrapedData.images) && scrapedData.images.length > 0 && (
              <div className={`${styles.previewCard} ${styles.cardImages}`}>
                <div className={styles.cardHeader}>
                  <h4 className={styles.cardTitle}>Images ({scrapedData.images.length})</h4>
                </div>
                <div className={styles.cardContent}>
                  <div className={styles.previewImages}>
                    {scrapedData.images.slice(0, 6).map((img, i) => (
                      <div key={i} className={styles.previewImage}>
                        <img
                          src={img?.src || ''}
                          alt={img?.alt || 'Image'}
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                        {img?.alt && <p>{img.alt.substring(0, 50)}</p>}
                      </div>
                    ))}
                    {scrapedData.images.length > 6 && (
                      <div className={styles.moreIndicator}>... and {scrapedData.images.length - 6} more images</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Metadata Card */}
            {scrapedData.metadata && typeof scrapedData.metadata === 'object' && Object.keys(scrapedData.metadata).length > 0 && (
              <div className={`${styles.previewCard} ${styles.cardMetadata}`}>
                <div className={styles.cardHeader}>
                  <h4 className={styles.cardTitle}>Metadata</h4>
                </div>
                <div className={styles.cardContent}>
                  <div className={styles.metadataList}>
                    {scrapedData.metadata.language && (
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Language:</span>
                        <span className={styles.infoValue}>{scrapedData.metadata.language}</span>
                      </div>
                    )}
                    {scrapedData.metadata.charset && (
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Charset:</span>
                        <span className={styles.infoValue}>{scrapedData.metadata.charset}</span>
                      </div>
                    )}
                    {scrapedData.metadata.viewport && (
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Viewport:</span>
                        <span className={styles.infoValue}>{scrapedData.metadata.viewport}</span>
                      </div>
                    )}
                    {scrapedData.metadata.author && (
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Author:</span>
                        <span className={styles.infoValue}>{scrapedData.metadata.author}</span>
                      </div>
                    )}
                    {scrapedData.metadata.generator && (
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Generator:</span>
                        <span className={styles.infoValue}>{scrapedData.metadata.generator}</span>
                      </div>
                    )}
                    {scrapedData.metadata.canonical && (
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Canonical:</span>
                        <a href={scrapedData.metadata.canonical} target="_blank" rel="noopener noreferrer" className={styles.previewLink}>
                          {scrapedData.metadata.canonical}
                        </a>
                      </div>
                    )}
                    {scrapedData.metadata.robots && (
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Robots:</span>
                        <span className={styles.infoValue}>{scrapedData.metadata.robots}</span>
                      </div>
                    )}
                    {scrapedData.stats?.hasOpenGraph && (
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Open Graph:</span>
                        <span className={styles.infoValue}>Yes</span>
                      </div>
                    )}
                    {scrapedData.stats?.hasTwitterCard && (
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Twitter Card:</span>
                        <span className={styles.infoValue}>Yes</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Text Preview Card */}
            {scrapedData.text && typeof scrapedData.text === 'string' && (
              <div className={`${styles.previewCard} ${styles.cardTextPreview}`}>
                <div className={styles.cardHeader}>
                  <h4 className={styles.cardTitle}>Text Preview</h4>
                </div>
                <div className={styles.cardContent}>
                  <div className={styles.previewText}>
                    {scrapedData.text.substring(0, 2000)}
                    {scrapedData.text.length > 2000 && '...'}
                  </div>
                </div>
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
                        className={styles.linkButton}
                        onClick={() => handleViewDetails(item.id)}
                        disabled={isLoadingDetails}
                      >
                        View Details
                      </button>
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

      {/* Details Modal */}
      {selectedItem && (
        <div className={styles.modalOverlay} onClick={() => setSelectedItem(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Scraped Data Details</h3>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setSelectedItem(null)}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.previewGrid}>
                {/* Domain Info Card */}
                {selectedItem.domainInfo && Object.keys(selectedItem.domainInfo).length > 0 && (
                  <div className={`${styles.previewCard} ${styles.cardDomain}`}>
                    <div className={styles.cardHeader}>
                      <h4 className={styles.cardTitle}>Domain Information</h4>
                    </div>
                    <div className={styles.cardContent}>
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Domain:</span>
                        <span className={styles.infoValue}>{selectedItem.domainInfo.domain || '—'}</span>
                      </div>
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Protocol:</span>
                        <span className={styles.infoValue}>{selectedItem.domainInfo.protocol || '—'}</span>
                      </div>
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Host:</span>
                        <span className={styles.infoValue}>{selectedItem.domainInfo.host || '—'}</span>
                      </div>
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Path:</span>
                        <span className={styles.infoValue}>{selectedItem.domainInfo.path || '/'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Title Card */}
                {selectedItem.title && (
                  <div className={`${styles.previewCard} ${styles.cardTitle}`}>
                    <div className={styles.cardHeader}>
                      <h4 className={styles.cardTitle}>Page Title</h4>
                    </div>
                    <div className={styles.cardContent}>
                      <p className={styles.cardText}>{selectedItem.title}</p>
                    </div>
                  </div>
                )}

                {/* Description Card */}
                {selectedItem.description && (
                  <div className={`${styles.previewCard} ${styles.cardDescription}`}>
                    <div className={styles.cardHeader}>
                      <h4 className={styles.cardTitle}>Description</h4>
                    </div>
                    <div className={styles.cardContent}>
                      <p className={styles.cardText}>{selectedItem.description}</p>
                    </div>
                  </div>
                )}

                {/* Statistics Card */}
                {(selectedItem.stats || selectedItem.imageCount !== undefined) && (
                  <div className={`${styles.previewCard} ${styles.cardStats}`}>
                    <div className={styles.cardHeader}>
                      <h4 className={styles.cardTitle}>Statistics</h4>
                    </div>
                    <div className={styles.cardContent}>
                      <div className={styles.statsGrid}>
                        {selectedItem.stats ? (
                          <>
                            <div className={styles.statItem}>
                              <span className={styles.statValue}>{selectedItem.stats.totalHeadings || 0}</span>
                              <span className={styles.statLabel}>Headings</span>
                            </div>
                            <div className={styles.statItem}>
                              <span className={styles.statValue}>{selectedItem.stats.totalLinks || selectedItem.importantLinks?.length || 0}</span>
                              <span className={styles.statLabel}>Links</span>
                            </div>
                            <div className={styles.statItem}>
                              <span className={styles.statValue}>{selectedItem.stats.totalImages || selectedItem.imageCount || 0}</span>
                              <span className={styles.statLabel}>Images</span>
                            </div>
                            <div className={styles.statItem}>
                              <span className={styles.statValue}>{selectedItem.stats.totalKeywords || selectedItem.keywords?.length || 0}</span>
                              <span className={styles.statLabel}>Keywords</span>
                            </div>
                            <div className={styles.statItem}>
                              <span className={styles.statValue}>
                                {selectedItem.stats.textLength ? `${Math.round(selectedItem.stats.textLength / 1000)}k` : (selectedItem.textPreview ? `${Math.round(selectedItem.textPreview.length / 1000)}k` : '0')}
                              </span>
                              <span className={styles.statLabel}>Text Length</span>
                            </div>
                            <div className={styles.statItem}>
                              <span className={styles.statValue}>
                                {selectedItem.stats.hasStructuredData ? 'Yes' : (selectedItem.structuredDataCount > 0 ? 'Yes' : 'No')}
                              </span>
                              <span className={styles.statLabel}>Structured Data</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className={styles.statItem}>
                              <span className={styles.statValue}>{(selectedItem.mainHeadings?.h1?.length || 0) + (selectedItem.mainHeadings?.h2?.length || 0)}</span>
                              <span className={styles.statLabel}>Headings</span>
                            </div>
                            <div className={styles.statItem}>
                              <span className={styles.statValue}>{selectedItem.importantLinks?.length || 0}</span>
                              <span className={styles.statLabel}>Links</span>
                            </div>
                            <div className={styles.statItem}>
                              <span className={styles.statValue}>{selectedItem.imageCount || 0}</span>
                              <span className={styles.statLabel}>Images</span>
                            </div>
                            <div className={styles.statItem}>
                              <span className={styles.statValue}>{selectedItem.keywords?.length || 0}</span>
                              <span className={styles.statLabel}>Keywords</span>
                            </div>
                            <div className={styles.statItem}>
                              <span className={styles.statValue}>
                                {selectedItem.textPreview ? `${Math.round(selectedItem.textPreview.length / 1000)}k` : '0'}
                              </span>
                              <span className={styles.statLabel}>Text Length</span>
                            </div>
                            <div className={styles.statItem}>
                              <span className={styles.statValue}>
                                {selectedItem.structuredDataCount > 0 ? 'Yes' : 'No'}
                              </span>
                              <span className={styles.statLabel}>Structured Data</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Keywords Card */}
                {Array.isArray(selectedItem.keywords) && selectedItem.keywords.length > 0 && (
                  <div className={`${styles.previewCard} ${styles.cardKeywords}`}>
                    <div className={styles.cardHeader}>
                      <h4 className={styles.cardTitle}>Keywords</h4>
                    </div>
                    <div className={styles.cardContent}>
                      <div className={styles.keywordsList}>
                        {selectedItem.keywords.map((keyword, i) => (
                          <span key={i} className={styles.keywordTag}>{keyword}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Headings Card */}
                {(selectedItem.headings || selectedItem.mainHeadings) && typeof (selectedItem.headings || selectedItem.mainHeadings) === 'object' && (
                  <div className={`${styles.previewCard} ${styles.cardHeadings}`}>
                    <div className={styles.cardHeader}>
                      <h4 className={styles.cardTitle}>Headings</h4>
                    </div>
                    <div className={styles.cardContent}>
                      {(() => {
                        const headings = selectedItem.headings || selectedItem.mainHeadings || {};
                        const h1Array = Array.isArray(headings.h1) ? headings.h1 : [];
                        const h2Array = Array.isArray(headings.h2) ? headings.h2 : [];
                        return (
                          <>
                            {h1Array.length > 0 && (
                              <div className={styles.headingGroup}>
                                <strong className={styles.headingLabel}>H1 ({h1Array.length}):</strong>
                                <ul className={styles.previewList}>
                                  {h1Array.map((h, i) => (
                                    <li key={i}>{h}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {h2Array.length > 0 && (
                              <div className={styles.headingGroup}>
                                <strong className={styles.headingLabel}>H2 ({h2Array.length}):</strong>
                                <ul className={styles.previewList}>
                                  {h2Array.map((h, i) => (
                                    <li key={i}>{h}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Links Card */}
                {Array.isArray(selectedItem.importantLinks) && selectedItem.importantLinks.length > 0 && (
                  <div className={`${styles.previewCard} ${styles.cardLinks}`}>
                    <div className={styles.cardHeader}>
                      <h4 className={styles.cardTitle}>Links ({selectedItem.importantLinks.length})</h4>
                    </div>
                    <div className={styles.cardContent}>
                      <div className={styles.linksList}>
                        {selectedItem.importantLinks.map((link, i) => (
                          <a
                            key={i}
                            href={link?.href || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.linkItem}
                          >
                            {link?.text || link?.href || 'Link'}
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Images Card */}
                {Array.isArray(selectedItem.mainImages) && selectedItem.mainImages.length > 0 && (
                  <div className={`${styles.previewCard} ${styles.cardImages}`}>
                    <div className={styles.cardHeader}>
                      <h4 className={styles.cardTitle}>Images ({selectedItem.imageCount || 0})</h4>
                    </div>
                    <div className={styles.cardContent}>
                      <div className={styles.previewImages}>
                        {selectedItem.mainImages.map((img, i) => (
                          <div key={i} className={styles.previewImage}>
                            <img
                              src={img?.src || ''}
                              alt={img?.alt || 'Image'}
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                            {img?.alt && <p>{img.alt.substring(0, 50)}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Metadata Card */}
                {selectedItem.metadata && typeof selectedItem.metadata === 'object' && Object.keys(selectedItem.metadata).length > 0 && (
                  <div className={`${styles.previewCard} ${styles.cardMetadata}`}>
                    <div className={styles.cardHeader}>
                      <h4 className={styles.cardTitle}>Metadata</h4>
                    </div>
                    <div className={styles.cardContent}>
                      <div className={styles.metadataList}>
                        {selectedItem.metadata.language && (
                          <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Language:</span>
                            <span className={styles.infoValue}>{selectedItem.metadata.language}</span>
                          </div>
                        )}
                        {selectedItem.metadata.charset && (
                          <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Charset:</span>
                            <span className={styles.infoValue}>{selectedItem.metadata.charset}</span>
                          </div>
                        )}
                        {selectedItem.metadata.viewport && (
                          <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Viewport:</span>
                            <span className={styles.infoValue}>{selectedItem.metadata.viewport}</span>
                          </div>
                        )}
                        {selectedItem.metadata.author && (
                          <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Author:</span>
                            <span className={styles.infoValue}>{selectedItem.metadata.author}</span>
                          </div>
                        )}
                        {selectedItem.metadata.generator && (
                          <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Generator:</span>
                            <span className={styles.infoValue}>{selectedItem.metadata.generator}</span>
                          </div>
                        )}
                        {selectedItem.metadata.canonical && (
                          <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Canonical:</span>
                            <a href={selectedItem.metadata.canonical} target="_blank" rel="noopener noreferrer" className={styles.previewLink}>
                              {selectedItem.metadata.canonical}
                            </a>
                          </div>
                        )}
                        {selectedItem.metadata.robots && (
                          <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Robots:</span>
                            <span className={styles.infoValue}>{selectedItem.metadata.robots}</span>
                          </div>
                        )}
                        {selectedItem.metadata.ogTitle && (
                          <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>OG Title:</span>
                            <span className={styles.infoValue}>{selectedItem.metadata.ogTitle}</span>
                          </div>
                        )}
                        {selectedItem.metadata.ogDescription && (
                          <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>OG Description:</span>
                            <span className={styles.infoValue}>{selectedItem.metadata.ogDescription}</span>
                          </div>
                        )}
                        {selectedItem.metadata.ogImage && (
                          <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>OG Image:</span>
                            <a href={selectedItem.metadata.ogImage} target="_blank" rel="noopener noreferrer" className={styles.previewLink}>
                              {selectedItem.metadata.ogImage}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Text Preview Card */}
                {selectedItem.textPreview && (
                  <div className={`${styles.previewCard} ${styles.cardTextPreview}`}>
                    <div className={styles.cardHeader}>
                      <h4 className={styles.cardTitle}>Text Preview</h4>
                    </div>
                    <div className={styles.cardContent}>
                      <div className={styles.previewText}>
                        {selectedItem.textPreview}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

