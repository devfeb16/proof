import { useEffect, useMemo, useState } from 'react';
import styles from '../../../styles/PerformanceDashboard.module.css';

function buildGradient(segments = []) {
  if (!segments.length) return 'conic-gradient(#e2e8f0 0deg, #cbd5f5 360deg)';
  let offset = 0;
  const stops = segments.map((segment) => {
    const start = offset;
    offset += segment.share;
    return `${segment.color || '#2563eb'} ${start}% ${offset}%`;
  });
  return `conic-gradient(${stops.join(', ')})`;
}

export default function RegionalBreakdown({ timeframe = '90d' }) {
  const [segments, setSegments] = useState([]);
  const [headline, setHeadline] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadRegional() {
      setIsLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/reports/regions?timeframe=${encodeURIComponent(timeframe)}`, {
          credentials: 'include',
        });
        const payload = await response.json();
        if (!response.ok || payload.success === false) {
          const message = payload?.message || 'Unable to load regional mix';
          throw new Error(message);
        }
        if (isMounted) {
          const data = payload?.data || {};
          setSegments(Array.isArray(data.segments) ? data.segments : []);
          setHeadline(data.headline || null);
        }
      } catch (err) {
        if (isMounted) {
          setSegments([]);
          setHeadline(null);
          setError(err.message || 'Failed to load regional mix');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadRegional();

    return () => {
      isMounted = false;
    };
  }, [timeframe]);

  const gradientStyle = useMemo(
    () => ({
      backgroundImage: buildGradient(segments),
    }),
    [segments]
  );

  const fallbackLabel = useMemo(() => {
    if (isLoading) return 'Loading regional mix…';
    if (error) return error;
    return 'No regional activity captured for this view.';
  }, [error, isLoading]);

  return (
    <div className={`${styles.card} ${styles.regionalCard}`}>
      <header className={styles.cardHeader}>
        <div>
          <h2 className={styles.cardTitle}>Regional split</h2>
          {headline && <p className={styles.cardSubtitle}>{headline}</p>}
        </div>
      </header>

      {segments.length === 0 ? (
        <div className={styles.cardFallback}>{fallbackLabel}</div>
      ) : (
        <div className={styles.regionContent}>
          <div className={styles.regionChart} style={gradientStyle}>
            <div className={styles.regionChartInner}>
              <span className={styles.regionChartValue}>
                {segments[0]?.label}
                <span className={styles.regionChartShare}>{segments[0]?.share}%</span>
              </span>
            </div>
          </div>
          <ul className={styles.regionList}>
            {segments.map((segment) => (
              <li key={segment.id} className={styles.regionItem}>
                <span className={styles.legendSwatch} style={{ backgroundColor: segment.color || '#2563eb' }} />
                <div className={styles.regionInfo}>
                  <span className={styles.regionLabel}>{segment.label}</span>
                  <span className={styles.regionShare}>{segment.share}%</span>
                </div>
                {typeof segment.delta === 'number' && (
                  <span
                    className={`${styles.regionDelta} ${segment.delta < 0 ? styles.regionDeltaDown : styles.regionDeltaUp}`}
                  >
                    {segment.delta > 0 ? `+${segment.delta}%` : `${segment.delta}%`}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}







