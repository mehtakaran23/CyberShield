import React from 'react';

export default function StatsCard({ label, value, color, active = false, onClick }) {
  return (
    <div
      style={{
        background: 'linear-gradient(180deg, rgba(9, 20, 36, 0.94), rgba(6, 15, 28, 0.9))',
        border: `1px solid ${active ? color : `${color}33`}`,
        borderRadius: '18px',
        padding: '22px 18px',
        textAlign: 'center',
        boxShadow: '0 12px 24px rgba(0, 0, 0, 0.18)',
        transform: active ? 'translateY(-2px)' : 'none',
        cursor: onClick ? 'pointer' : 'default',
      }}
      onClick={onClick}
    >
      <div style={{ fontSize: '36px', fontWeight: 800, color }}>{value}</div>
      <div style={{ color: '#a9b3c4', fontSize: '13px', marginTop: '6px' }}>{label}</div>
    </div>
  );
}
