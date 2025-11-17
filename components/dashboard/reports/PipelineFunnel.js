import { useEffect, useMemo, useState } from 'react';
import styles from '../../../styles/PerformanceDashboard.module.css';

export default function PipelineFunnel({ timeframe = '90d' }) {
  const [steps, setSteps] = useState([]);
  const [totals, setTotals] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadFunnel() {
      setIsLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/reports/funnel?timeframe=${encodeURIComponent(timeframe)}`, {
          credentials: 'include',
        });
        const payload = await response.json();
        if (!response.ok || payload.success === false) {
          const message = payload?.message || 'Unable to load funnel metrics';
          throw new Error(message);
        }
        if (isMounted) {
          const data = payload?.data || {};
          setSteps(Array.isArray(data.steps) ? data.steps : []);
          setTotals(data.totals || null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load funnel metrics');
          setSteps([]);
          setTotals(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadFunnel();

    return () => {
      isMounted = false;
    };
  }, [timeframe]);

  const maxValue = useMemo(() => {
    const values = steps.map((step) => step.value).filter((value) => typeof value === 'number');
    return values.length ? Math.max(...values) : 0;
  }, [steps]);

  const fallbackLabel = useMemo(() => {
    if (isLoading) return 'Loading funnel…';
    if (error) return error;
    return 'No funnel activity captured for this period.';
  }, [error, isLoading]);

  return (
    <div className={`${styles.card} ${styles.funnelCard}`}>
      <header className={styles.cardHeader}>
        <div>
          <h2 className={styles.cardTitle}>Pipeline funnel</h2>
          <p className={styles.cardSubtitle}>Track handoffs across each hiring stage and spot drop-offs quickly.</p>
        </div>
        {totals && (
          <div className={styles.funnelTotals}>
            <span className={styles.funnelTotalLabel}>Start</span>
            <span className={styles.funnelTotalValue}>{totals.start}</span>
            <span className={styles.funnelTotalLabel}>Hires</span>
            <span className={styles.funnelTotalValue}>{totals.hires}</span>
          </div>
        )}
      </header>

      {steps.length === 0 ? (
        <div className={styles.cardFallback}>{fallbackLabel}</div>
      ) : (
        <ol className={styles.funnelList}>
          {steps.map((step, index) => {
            const percent = maxValue ? Math.max((step.value / maxValue) * 100, 6) : 0;
            return (
              <li key={step.id} className={styles.funnelItem}>
                <div className={styles.funnelItemHeader}>
                  <span className={styles.funnelLabel}>
                    <span className={styles.funnelIndex}>{index + 1}</span>
                    {step.label}
                  </span>
                  <span className={styles.funnelValue}>{step.value.toLocaleString()}</span>
                </div>
                <div className={styles.funnelBarTrack} aria-hidden="true">
                  <div
                    className={styles.funnelBarFill}
                    style={{
                      width: `${percent}%`,
                      backgroundColor: step.color || '#2563eb',
                    }}
                  />
                </div>
                <div className={styles.funnelMeta}>
                  <span className={styles.funnelConversion}>
                    Conversion {typeof step.conversionRate === 'number' ? `${step.conversionRate}%` : step.conversionRate}
                  </span>
                  {typeof step.dropOff === 'number' && (
                    <span className={styles.funnelDrop}>
                      Drop-off {step.dropOff > 0 ? `${step.dropOff}%` : '—'}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}









