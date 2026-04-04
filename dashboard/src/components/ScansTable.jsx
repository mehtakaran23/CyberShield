import React from 'react';

const riskColor = {
  HIGH: '#ff6b6b',
  MEDIUM: '#f6ad55',
  LOW: '#51cf66',
};

function formatTime(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export default function ScansTable({ scans, loading }) {
  return (
    <div
      style={{
        background: 'rgba(7, 17, 31, 0.88)',
        borderRadius: '18px',
        overflow: 'hidden',
        border: '1px solid rgba(120, 142, 168, 0.2)',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.22)',
      }}
    >
      <div
        style={{
          padding: '18px 20px',
          borderBottom: '1px solid rgba(120, 142, 168, 0.16)',
          fontWeight: 700,
          color: '#f9c74f',
        }}
      >
        Recent Scans
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'rgba(255, 255, 255, 0.03)', color: '#8ea0b8' }}>
              <th style={{ padding: '12px 20px', textAlign: 'left' }}>URL</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Risk</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Score</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Time</th>
              <th style={{ padding: '12px 20px', textAlign: 'left' }}>Reason</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#8ea0b8' }}>
                  Loading scan history...
                </td>
              </tr>
            )}

            {!loading && scans.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#8ea0b8' }}>
                  No scans yet. Submit a scan to populate the dashboard.
                </td>
              </tr>
            )}

            {!loading &&
              scans.map((scan) => (
                <tr
                  key={scan.id || `${scan.url}-${scan.timestamp}`}
                  style={{ borderTop: '1px solid rgba(120, 142, 168, 0.12)' }}
                >
                  <td
                    style={{
                      padding: '12px 20px',
                      color: '#f7f4ea',
                      maxWidth: '240px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={scan.url}
                  >
                    {scan.url}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span
                      style={{
                        background: `${riskColor[scan.riskLevel] || '#94a3b8'}20`,
                        color: riskColor[scan.riskLevel] || '#cbd5e1',
                        padding: '4px 10px',
                        borderRadius: '999px',
                        fontWeight: 700,
                        fontSize: '11px',
                        display: 'inline-block',
                        minWidth: '68px',
                      }}
                    >
                      {scan.riskLevel}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: '12px',
                      textAlign: 'center',
                      color: riskColor[scan.riskLevel] || '#cbd5e1',
                      fontWeight: 700,
                    }}
                  >
                    {scan.score}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', color: '#8ea0b8' }}>
                    {formatTime(scan.timestamp)}
                  </td>
                  <td style={{ padding: '12px 20px', color: '#a9b3c4', fontSize: '12px' }}>
                    {scan.reason}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
