import { useEffect, useState } from 'react';
import styles from '../../../styles/PerformanceDashboard.module.css';

export default function ExportCenter({ timeframe = '90d' }) {
  const [options, setOptions] = useState([]);
  const [lastGeneratedAt, setLastGeneratedAt] = useState('');
  const [statusMap, setStatusMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadExports() {
      setIsLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/reports/exports?timeframe=${encodeURIComponent(timeframe)}`, {
          credentials: 'include',
        });
        const payload = await response.json();
        if (!response.ok || payload.success === false) {
          const messageText = payload?.message || 'Unable to load export options';
          throw new Error(messageText);
        }
        if (isMounted) {
          const data = payload?.data || {};
          setOptions(Array.isArray(data.options) ? data.options : []);
          setLastGeneratedAt(data.lastGeneratedAt || '');
          setStatusMap({});
        }
      } catch (err) {
        if (isMounted) {
          setOptions([]);
          setLastGeneratedAt('');
          setError(err.message || 'Failed to load export options');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadExports();

    return () => {
      isMounted = false;
    };
  }, [timeframe]);

  const handleRequestExport = async (option) => {
    if (!option) return;
    const optionId = option.id;
    setMessage('');
    setStatusMap((prev) => ({
      ...prev,
      [optionId]: 'processing',
    }));
    try {
      const response = await fetch('/api/reports/exports', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionId, timeframe }),
      });
      const payload = await response.json();
      if (!response.ok || payload.success === false) {
        const messageText = payload?.message || 'Failed to queue export';
        throw new Error(messageText);
      }
      setStatusMap((prev) => ({
        ...prev,
        [optionId]: 'ready',
      }));
      setMessage(payload?.message || `${option.label} export is being prepared.`);
      if (payload?.data?.readyAt) {
        setLastGeneratedAt(payload.data.readyAt);
      }
    } catch (err) {
      setStatusMap((prev) => ({
        ...prev,
        [optionId]: 'error',
      }));
      setMessage(err.message || 'Unable to queue export right now.');
    }
  };

  const fallbackLabel = (() => {
    if (isLoading) return 'Loading export options…';
    if (error) return error;
    return 'No export templates configured yet.';
  })();

  return (
    <div className={`${styles.card} ${styles.exportCard}`}>
      <header className={styles.cardHeader}>
        <div>
          <h2 className={styles.cardTitle}>Export center</h2>
          <p className={styles.cardSubtitle}>
            Generate CSV snapshots or presentation-ready decks to share with stakeholders.
          </p>
        </div>
        {lastGeneratedAt && (
          <span className={styles.cardMeta}>
            Last prepared {new Date(lastGeneratedAt).toLocaleString(undefined, { hour12: false })}
          </span>
        )}
      </header>

      {message && <div className={styles.exportMessage}>{message}</div>}

      {options.length === 0 ? (
        <div className={styles.cardFallback}>{fallbackLabel}</div>
      ) : (
        <ul className={styles.exportList}>
          {options.map((option) => {
            const status = statusMap[option.id] || 'idle';
            const isProcessing = status === 'processing';
            return (
              <li key={option.id} className={styles.exportItem}>
                <div className={styles.exportDetails}>
                  <span className={styles.exportTitle}>{option.label}</span>
                  <p className={styles.exportDescription}>{option.description}</p>
                  <div className={styles.exportMetaRow}>
                    <span className={styles.exportFormat}>{option.format}</span>
                    {option.eta && <span className={styles.exportEta}>Ready in ~{option.eta}</span>}
                  </div>
                </div>
                <div className={styles.exportActions}>
                  <button
                    type="button"
                    className={styles.exportButton}
                    onClick={() => handleRequestExport(option)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? 'Preparing…' : status === 'ready' ? 'Queued' : 'Generate'}
                  </button>
                  {status === 'ready' && (
                    <span className={styles.exportStatus}>We’ll email you a download link shortly.</span>
                  )}
                  {status === 'error' && (
                    <span className={styles.exportStatusError}>Something went wrong. Retry shortly.</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}







