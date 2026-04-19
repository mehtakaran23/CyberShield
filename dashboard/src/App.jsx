import React, { useEffect, useMemo, useState } from 'react';
import StatsCard from './components/StatsCard';
import ScansTable from './components/ScansTable';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://cybershield-backend-mrr3.onrender.com/').replace(
  /\/$/,
  '',
);

const styles = {
  app: {
    minHeight: '100vh',
    color: '#f7f4ea',
    fontFamily: '"Trebuchet MS", "Segoe UI", sans-serif',
    padding: '32px 20px 48px',
    background:
      'radial-gradient(circle at top left, rgba(246, 173, 85, 0.12), transparent 28%), linear-gradient(180deg, #07111f 0%, #0d1728 50%, #08101c 100%)',
  },
  shell: {
    maxWidth: '1100px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: '16px',
    marginBottom: '28px',
    flexWrap: 'wrap',
  },
  title: {
    fontSize: '32px',
    fontWeight: 800,
    letterSpacing: '0.02em',
    color: '#f9c74f',
    marginBottom: '6px',
  },
  subtitle: {
    color: '#a9b3c4',
    fontSize: '14px',
    maxWidth: '680px',
  },
  status: {
    border: '1px solid rgba(249, 199, 79, 0.28)',
    background: 'rgba(10, 21, 38, 0.8)',
    color: '#f7f4ea',
    borderRadius: '999px',
    padding: '10px 14px',
    fontSize: '12px',
  },
  banner: {
    marginBottom: '20px',
    padding: '14px 16px',
    borderRadius: '14px',
    border: '1px solid rgba(237, 137, 54, 0.35)',
    background: 'rgba(54, 26, 8, 0.55)',
    color: '#ffd8a8',
    fontSize: '14px',
  },
  toolbar: {
    display: 'grid',
    gridTemplateColumns: 'minmax(240px, 1.5fr) minmax(180px, 1fr) auto',
    gap: '12px',
    marginBottom: '18px',
    alignItems: 'center',
  },
  actions: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
  },
  input: {
    width: '100%',
    background: 'rgba(7, 17, 31, 0.88)',
    color: '#f7f4ea',
    border: '1px solid rgba(120, 142, 168, 0.22)',
    borderRadius: '14px',
    padding: '12px 14px',
    fontSize: '13px',
  },
  select: {
    width: '100%',
    background: 'rgba(7, 17, 31, 0.88)',
    color: '#f7f4ea',
    border: '1px solid rgba(120, 142, 168, 0.22)',
    borderRadius: '14px',
    padding: '12px 14px',
    fontSize: '13px',
  },
  button: {
    border: 'none',
    borderRadius: '14px',
    padding: '12px 16px',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    color: '#08111d',
    background: 'linear-gradient(90deg, #f9c74f, #f59e0b)',
  },
  secondaryButton: {
    borderRadius: '14px',
    padding: '12px 16px',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    color: '#f7f4ea',
    border: '1px solid rgba(120, 142, 168, 0.22)',
    background: 'rgba(7, 17, 31, 0.88)',
  },
  dangerButton: {
    borderRadius: '14px',
    padding: '12px 16px',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    color: '#ffe7e7',
    border: '1px solid rgba(255, 107, 107, 0.35)',
    background: 'linear-gradient(180deg, rgba(127, 29, 29, 0.9), rgba(91, 18, 18, 0.95))',
    boxShadow: '0 10px 24px rgba(127, 29, 29, 0.22)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    marginBottom: '28px',
  },
  panel: {
    background: 'rgba(7, 17, 31, 0.88)',
    borderRadius: '18px',
    border: '1px solid rgba(120, 142, 168, 0.2)',
    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.22)',
    padding: '20px',
    marginBottom: '24px',
  },
  panelTitle: {
    color: '#f9c74f',
    fontWeight: 700,
    marginBottom: '14px',
  },
  panelGrid: {
    display: 'grid',
    gridTemplateColumns: '1.1fr 1.6fr auto',
    gap: '12px',
    alignItems: 'start',
  },
  textarea: {
    minHeight: '120px',
    resize: 'vertical',
    width: '100%',
    background: 'rgba(4, 12, 23, 0.9)',
    color: '#f7f4ea',
    border: '1px solid rgba(120, 142, 168, 0.22)',
    borderRadius: '14px',
    padding: '12px 14px',
    fontSize: '13px',
  },
  helper: {
    color: '#8ea0b8',
    fontSize: '12px',
    marginTop: '8px',
  },
  scanResult: {
    marginTop: '14px',
    padding: '14px 16px',
    borderRadius: '14px',
    background: 'rgba(11, 24, 42, 0.8)',
    border: '1px solid rgba(120, 142, 168, 0.18)',
  },
};

const emptyStats = {
  total: 0,
  high: 0,
  medium: 0,
  low: 0,
  recentScans: [],
};

export default function App() {
  const [stats, setStats] = useState(emptyStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [backendStatus, setBackendStatus] = useState(null);
  const [query, setQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [lastUpdated, setLastUpdated] = useState('');
  const [manualUrl, setManualUrl] = useState('');
  const [manualContent, setManualContent] = useState('');
  const [manualResult, setManualResult] = useState(null);
  const [manualLoading, setManualLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadStats() {
      try {
        setLoading(true);
        setError('');

        const [statsResponse, statusResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/stats`, {
            signal: controller.signal,
          }),
          fetch(`${API_BASE_URL}/config-status`, {
            signal: controller.signal,
          }),
        ]);

        if (!statsResponse.ok) {
          throw new Error(`Request failed with status ${statsResponse.status}`);
        }

        const payload = await statsResponse.json();
        setStats({
          total: payload.total ?? 0,
          high: payload.high ?? 0,
          medium: payload.medium ?? 0,
          low: payload.low ?? 0,
          recentScans: payload.recentScans ?? [],
        });
        setLastUpdated(new Date().toLocaleTimeString());

        if (statusResponse.ok) {
          setBackendStatus(await statusResponse.json());
        }
      } catch (fetchError) {
        if (fetchError.name === 'AbortError') {
          return;
        }

        setStats(emptyStats);
        setBackendStatus(null);
        setError(
          `Unable to reach the backend at ${API_BASE_URL}. Start the API to see live scan data.`,
        );
      } finally {
        setLoading(false);
      }
    }

    loadStats();
    return () => controller.abort();
  }, [refreshTick]);

  const statusText = useMemo(() => {
    if (loading) {
      return 'Fetching latest scan activity';
    }

    return error ? 'Offline fallback mode' : `Connected to ${API_BASE_URL}`;
  }, [error, loading]);

  const filteredScans = useMemo(() => {
    return stats.recentScans.filter((scan) => {
      const matchesRisk = riskFilter === 'ALL' || scan.riskLevel === riskFilter;
      const haystack = `${scan.url} ${scan.reason} ${(scan.patterns || []).join(' ')}`.toLowerCase();
      const matchesQuery = !query.trim() || haystack.includes(query.trim().toLowerCase());
      return matchesRisk && matchesQuery;
    });
  }, [query, riskFilter, stats.recentScans]);

  const cloudWarning =
    backendStatus && !backendStatus.liveScanningReady
      ? 'Live cloud scanning is not ready yet. Add Firebase service account credentials and a GCP project ID for Vertex AI.'
      : '';

  function resetDashboardState() {
    setQuery('');
    setRiskFilter('ALL');
    setManualUrl('');
    setManualContent('');
    setManualResult(null);
    setRefreshTick((value) => value + 1);
  }

  async function clearDashboardData() {
    if (!window.confirm('Clear all scan history and dashboard stats?')) {
      return;
    }

    try {
      setClearing(true);
      const response = await fetch(`${API_BASE_URL}/stats`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.details || payload.error || `Request failed with ${response.status}`);
      }

      setStats(emptyStats);
      setLastUpdated(new Date().toLocaleTimeString());
      setQuery('');
      setRiskFilter('ALL');
      setManualResult(null);
    } catch (clearError) {
      setError(`Unable to clear dashboard data: ${clearError.message}`);
    } finally {
      setClearing(false);
    }
  }

  async function runManualScan() {
    if (!manualUrl.trim() && !manualContent.trim()) {
      setManualResult({ error: 'Enter a URL, some text, or both to test a scan.' });
      return;
    }

    try {
      setManualLoading(true);
      setManualResult(null);

      const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: manualUrl.trim(),
          content: manualContent.trim(),
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.details || payload.error || `Request failed with ${response.status}`);
      }

      const result = await response.json();
      setManualResult(result);
      setRefreshTick((value) => value + 1);
    } catch (scanError) {
      setManualResult({ error: scanError.message });
    } finally {
      setManualLoading(false);
    }
  }

  return (
    <div style={styles.app}>
      <div style={styles.shell}>
        <div style={styles.header}>
          <div>
            <div style={styles.title}>CyberShield Dashboard</div>
            <div style={styles.subtitle}>
              Monitor phishing scan activity, risk distribution, and recent findings from one
              place.
            </div>
          </div>

          <div style={styles.status}>{statusText}</div>
        </div>

        {error && <div style={styles.banner}>{error}</div>}
        {!error && cloudWarning && <div style={styles.banner}>{cloudWarning}</div>}

        <div style={styles.toolbar}>
          <input
            style={styles.input}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search URLs, reasons, or detected patterns"
          />
          <select
            style={styles.select}
            value={riskFilter}
            onChange={(event) => setRiskFilter(event.target.value)}
          >
            <option value="ALL">All risk levels</option>
            <option value="HIGH">High only</option>
            <option value="MEDIUM">Medium only</option>
            <option value="LOW">Safe only</option>
          </select>
          <div style={styles.actions}>
            <button style={styles.secondaryButton} onClick={() => setRefreshTick((value) => value + 1)}>
              Refresh
            </button>
            <button
              style={styles.secondaryButton}
              onClick={resetDashboardState}
            >
              Reset Filters
            </button>
            <button
              style={styles.dangerButton}
              onClick={clearDashboardData}
              disabled={clearing}
            >
              {clearing ? 'Clearing...' : 'Clear All Data'}
            </button>
          </div>
        </div>

        <div style={styles.grid}>
          <StatsCard
            label="Total Scans"
            value={stats.total}
            color="#4dabf7"
            active={riskFilter === 'ALL'}
            onClick={() => setRiskFilter('ALL')}
          />
          <StatsCard
            label="High Risk"
            value={stats.high}
            color="#ff6b6b"
            active={riskFilter === 'HIGH'}
            onClick={() => setRiskFilter('HIGH')}
          />
          <StatsCard
            label="Medium Risk"
            value={stats.medium}
            color="#f6ad55"
            active={riskFilter === 'MEDIUM'}
            onClick={() => setRiskFilter('MEDIUM')}
          />
          <StatsCard
            label="Safe"
            value={stats.low}
            color="#51cf66"
            active={riskFilter === 'LOW'}
            onClick={() => setRiskFilter('LOW')}
          />
        </div>

        <div style={styles.panel}>
          <div style={styles.panelTitle}>Quick Test Scan</div>
          <div style={styles.panelGrid}>
            <div>
              <input
                style={styles.input}
                value={manualUrl}
                onChange={(event) => setManualUrl(event.target.value)}
                placeholder="https://example.com/login"
              />
              <div style={styles.helper}>Optional: paste a suspicious link to analyze only the URL.</div>
            </div>

            <div>
              <textarea
                style={styles.textarea}
                value={manualContent}
                onChange={(event) => setManualContent(event.target.value)}
                placeholder="Paste suspicious page text or email content here..."
              />
              <div style={styles.helper}>Optional: paste page text or email content to analyze text only.</div>
            </div>

            <button style={styles.button} onClick={runManualScan} disabled={manualLoading}>
              {manualLoading ? 'Scanning...' : 'Analyze'}
            </button>
          </div>

          {manualResult && (
            <div style={styles.scanResult}>
              {'error' in manualResult ? (
                <div style={{ color: '#ff9a9a' }}>{manualResult.error}</div>
              ) : (
                <>
                  <div style={{ color: '#f7f4ea', fontWeight: 700, marginBottom: '6px' }}>
                    {manualResult.riskLevel} risk with score {manualResult.score}/100
                  </div>
                  <div style={{ color: '#a9b3c4', fontSize: '13px' }}>{manualResult.reason}</div>
                </>
              )}
            </div>
          )}
        </div>

        <div style={{ color: '#8ea0b8', fontSize: '12px', marginBottom: '10px' }}>
          Showing {filteredScans.length} of {stats.recentScans.length} recent scans. Last updated {lastUpdated || 'just now'}.
        </div>

        <ScansTable scans={filteredScans} loading={loading} />
      </div>
    </div>
  );
}
