import { useCallback, useMemo, useState } from 'react';
import KpiSummary from './KpiSummary';
import TrendOverview from './TrendOverview';
import PipelineFunnel from './PipelineFunnel';
import RegionalBreakdown from './RegionalBreakdown';
import ExportCenter from './ExportCenter';
import styles from '../../../styles/PerformanceDashboard.module.css';

const TIMEFRAME_OPTIONS = [
  { value: '30d', label: '30 days' },
  { value: '90d', label: 'Quarter' },
  { value: '365d', label: 'Year' },
];

export default function PerformanceDashboard() {
  const [timeframe, setTimeframe] = useState('90d');
  const [includeBenchmark, setIncludeBenchmark] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState('');

  const handleSetTimeframe = useCallback((next) => {
    setTimeframe(next);
  }, []);

  const formattedUpdatedAt = useMemo(() => {
    if (!lastUpdatedAt) return '—';
    try {
      const formatter = new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      return formatter.format(new Date(lastUpdatedAt));
    } catch {
      return '—';
    }
  }, [lastUpdatedAt]);

  const timeframeLabel = useMemo(() => {
    const match = TIMEFRAME_OPTIONS.find((option) => option.value === timeframe);
    return match ? match.label : timeframe;
  }, [timeframe]);

  const handleKpiUpdated = useCallback((isoTimestamp) => {
    if (!isoTimestamp) return;
    setLastUpdatedAt(isoTimestamp);
  }, []);

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>Performance dashboard</h1>
          <p className={styles.subtitle}>
            Monitor KPIs and trends across your organization. Keep a pulse on funnel health, regional momentum,
            and export-ready snapshots for stakeholders.
          </p>
        </div>
        <div className={styles.headerMeta}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Timeframe</span>
            <span className={styles.metaValue}>{timeframeLabel}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Last sync</span>
            <span className={styles.metaValue}>{formattedUpdatedAt}</span>
          </div>
        </div>
      </header>

      <div className={styles.controlBar}>
        <div className={styles.timeframeGroup} role="tablist" aria-label="Select dashboard timeframe">
          {TIMEFRAME_OPTIONS.map((option) => {
            const isActive = option.value === timeframe;
            return (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`${styles.timeframeButton} ${isActive ? styles.timeframeButtonActive : ''}`}
                onClick={() => handleSetTimeframe(option.value)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={includeBenchmark}
            onChange={(event) => setIncludeBenchmark(event.target.checked)}
          />
          <span className={styles.toggleLabel}>Include benchmarks</span>
        </label>
      </div>

      <div className={styles.grid}>
        <section className={styles.gridFullWidth} aria-label="Key performance indicators">
          <KpiSummary timeframe={timeframe} onUpdated={handleKpiUpdated} />
        </section>

        <section className={styles.gridFullWidth} aria-label="Trend overview">
          <TrendOverview timeframe={timeframe} includeBenchmark={includeBenchmark} />
        </section>

        <div className={styles.gridSplit}>
          <section className={styles.gridCard} aria-label="Pipeline funnel health">
            <PipelineFunnel timeframe={timeframe} />
          </section>
          <section className={styles.gridCard} aria-label="Regional performance mix">
            <RegionalBreakdown timeframe={timeframe} />
          </section>
        </div>

        <section className={styles.gridFullWidth} aria-label="Export center">
          <ExportCenter timeframe={timeframe} />
        </section>
      </div>
    </div>
  );
}









