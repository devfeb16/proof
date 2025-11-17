import { useEffect, useMemo, useState } from 'react';
import styles from '../../../styles/PerformanceDashboard.module.css';

const CHART_WIDTH = 620;
const CHART_HEIGHT = 220;

function normalizeSeries(series = []) {
  const allValues = [];
  series.forEach((entry) => {
    entry.points?.forEach((point) => {
      if (typeof point.value === 'number') {
        allValues.push(point.value);
      }
    });
  });
  if (allValues.length === 0) {
    return { normalized: [], min: 0, max: 1 };
  }
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;

  const normalized = series.map((entry) => {
    const points = Array.isArray(entry.points) ? entry.points : [];
    const coords = points.map((point, index) => {
      const x = points.length > 1 ? (index / (points.length - 1)) * CHART_WIDTH : CHART_WIDTH / 2;
      const y = CHART_HEIGHT - ((point.value - min) / range) * CHART_HEIGHT;
      return {
        ...point,
        x: Number.isFinite(x) ? Number(x.toFixed(2)) : 0,
        y: Number.isFinite(y) ? Number(y.toFixed(2)) : CHART_HEIGHT,
      };
    });

    const areaPath = [
      `M 0 ${CHART_HEIGHT}`,
      ...coords.map((point) => `L ${point.x} ${point.y}`),
      `L ${CHART_WIDTH} ${CHART_HEIGHT}`,
      'Z',
    ].join(' ');

    const linePath = coords.map((point) => `${point.x},${point.y}`).join(' ');

    return {
      ...entry,
      coords,
      areaPath,
      linePath,
    };
  });

  return { normalized, min, max };
}

function SummaryStat({ item }) {
  if (!item) return null;
  const { label, value, delta } = item;
  const isDown = delta?.direction === 'down';
  return (
    <div className={styles.summaryStat}>
      <span className={styles.summaryLabel}>{label}</span>
      <span className={styles.summaryValue}>{value}</span>
      {delta && (
        <span className={`${styles.summaryDelta} ${isDown ? styles.summaryDeltaDown : styles.summaryDeltaUp}`}>
          {typeof delta.value === 'number'
            ? `${delta.value > 0 ? '+' : ''}${delta.value.toFixed(1)}%`
            : delta.value}
          {delta.label && <span className={styles.summaryDeltaLabel}>{delta.label}</span>}
        </span>
      )}
    </div>
  );
}

export default function TrendOverview({ timeframe = '90d', includeBenchmark = true }) {
  const [series, setSeries] = useState([]);
  const [categories, setCategories] = useState([]);
  const [benchmark, setBenchmark] = useState(null);
  const [summary, setSummary] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadTrend() {
      setIsLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/reports/trends?timeframe=${encodeURIComponent(timeframe)}`, {
          credentials: 'include',
        });
        const payload = await response.json();
        if (!response.ok || payload.success === false) {
          const message = payload?.message || 'Unable to load trend data';
          throw new Error(message);
        }
        if (isMounted) {
          const data = payload?.data || {};
          setSeries(Array.isArray(data.series) ? data.series : []);
          setCategories(Array.isArray(data.categories) ? data.categories : []);
          setBenchmark(data.benchmark || null);
          setSummary(Array.isArray(data.summary) ? data.summary : []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load trend data');
          setSeries([]);
          setCategories([]);
          setBenchmark(null);
          setSummary([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadTrend();

    return () => {
      isMounted = false;
    };
  }, [timeframe]);

  const { normalized, min, max } = useMemo(() => normalizeSeries(series), [series]);

  const chartContent = useMemo(() => {
    if (isLoading) {
      return <div className={styles.chartPlaceholder}>Loading trend…</div>;
    }
    if (error) {
      return <div className={styles.chartPlaceholder}>{error}</div>;
    }
    if (!normalized.length) {
      return <div className={styles.chartPlaceholder}>Trend data is not yet available.</div>;
    }

    const benchmarkY =
      includeBenchmark && benchmark && typeof benchmark.value === 'number'
        ? CHART_HEIGHT - ((benchmark.value - min) / (max - min || 1)) * CHART_HEIGHT
        : null;

    return (
      <svg
        className={styles.trendChart}
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Trend chart"
      >
        <defs>
          {normalized.map((entry) => (
            <linearGradient
              key={`gradient-${entry.id}`}
              id={`gradient-${entry.id}`}
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <stop offset="0%" stopColor={entry.color || '#2563eb'} stopOpacity="0.35" />
              <stop offset="90%" stopColor={entry.color || '#2563eb'} stopOpacity="0.05" />
            </linearGradient>
          ))}
        </defs>

        {normalized.map((entry) => (
          <g key={entry.id}>
            <path d={entry.areaPath} fill={`url(#gradient-${entry.id})`} className={styles.trendArea} />
            <polyline
              points={entry.linePath}
              className={styles.trendLine}
              style={{ stroke: entry.color || '#2563eb' }}
            />
            {entry.coords.map((point) => (
              <circle
                key={`${entry.id}-${point.label}`}
                cx={point.x}
                cy={point.y}
                r="3.5"
                className={styles.trendDot}
                style={{ fill: entry.color || '#2563eb' }}
              >
                <title>
                  {entry.label} {point.label}: {point.value}
                </title>
              </circle>
            ))}
          </g>
        ))}

        {benchmarkY !== null && (
          <>
            <line
              x1="0"
              x2={CHART_WIDTH}
              y1={benchmarkY}
              y2={benchmarkY}
              className={styles.trendBenchmarkLine}
            />
            <text x={CHART_WIDTH - 6} y={benchmarkY - 6} className={styles.trendBenchmarkLabel} textAnchor="end">
              {benchmark.label || 'Benchmark'} {benchmark.value}
            </text>
          </>
        )}

        {categories.length > 1 && (
          <g className={styles.trendAxis}>
            {categories.map((label, index) => {
              const x = categories.length > 1 ? (index / (categories.length - 1)) * CHART_WIDTH : CHART_WIDTH / 2;
              return (
                <text key={label} x={x} y={CHART_HEIGHT + 16} textAnchor="middle">
                  {label}
                </text>
              );
            })}
          </g>
        )}
      </svg>
    );
  }, [benchmark, categories, includeBenchmark, error, isLoading, max, min, normalized]);

  return (
    <div className={`${styles.card} ${styles.trendCard}`}>
      <header className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>Trend overview</h2>
        <div className={styles.legend} role="list">
          {normalized.map((entry) => (
            <span key={entry.id} className={styles.legendItem} role="listitem">
              <span className={styles.legendSwatch} style={{ backgroundColor: entry.color || '#2563eb' }} />
              {entry.label}
            </span>
          ))}
        </div>
      </header>

      <div className={styles.chartWrapper}>{chartContent}</div>

      {summary.length > 0 && (
        <footer className={styles.summaryGrid}>
          {summary.map((item) => (
            <SummaryStat key={item.id} item={item} />
          ))}
        </footer>
      )}
    </div>
  );
}









