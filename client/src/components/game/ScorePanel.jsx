import React from 'react';

/**
 * Horizontal score strip showing all players.
 * Props:
 *   players               [{socketId, name, score}]
 *   currentTurnSocketId   string
 *   mySocketId            string
 *   bagCount              number
 */
export default function ScorePanel({ players, currentTurnSocketId, mySocketId, bagCount }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 12px',
      background: 'var(--surface)',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      overflowX: 'auto',
      flexShrink: 0,
    }}>
      {players.map(p => {
        const isCurrent = p.socketId === currentTurnSocketId;
        const isMe      = p.socketId === mySocketId;
        return (
          <div key={p.socketId} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minWidth: 52,
            padding: '4px 6px',
            borderRadius: 8,
            background: isCurrent ? 'rgba(76,175,80,0.2)' : 'transparent',
            border: isCurrent ? '1.5px solid var(--green)' : '1.5px solid transparent',
            flexShrink: 0,
          }}>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              color: isMe ? 'var(--gold)' : 'var(--text)',
              maxWidth: 60,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {isMe ? `${p.name} ✦` : p.name}
            </span>
            <span style={{ fontSize: '1rem', fontWeight: 800, color: isCurrent ? 'var(--green)' : 'var(--text)' }}>
              {p.score}
            </span>
            {isCurrent && <span style={{ fontSize: '0.6rem', color: 'var(--green)' }}>▼ turn</span>}
          </div>
        );
      })}

      <div style={{ marginLeft: 'auto', flexShrink: 0, textAlign: 'center', minWidth: 44 }}>
        <div style={{ fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 600 }}>BAG</div>
        <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--muted)' }}>{bagCount}</div>
      </div>
    </div>
  );
}
