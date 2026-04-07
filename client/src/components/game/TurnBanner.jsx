import React from 'react';

/**
 * Full-width banner showing whose turn it is.
 * Props:
 *   isMyTurn      bool
 *   currentName   string   — name of the player whose turn it is
 */
export default function TurnBanner({ isMyTurn, currentName }) {
  if (isMyTurn) {
    return (
      <div style={{
        background: 'var(--green)',
        color: '#fff',
        textAlign: 'center',
        padding: '10px 16px',
        fontWeight: 800,
        fontSize: '1.05rem',
        flexShrink: 0,
        letterSpacing: '0.02em',
      }}>
        🎯 Your Turn! — tap a tile then tap the board
      </div>
    );
  }
  return (
    <div style={{
      background: 'rgba(255,255,255,0.06)',
      color: 'var(--muted)',
      textAlign: 'center',
      padding: '10px 16px',
      fontWeight: 600,
      fontSize: '0.95rem',
      flexShrink: 0,
    }}>
      ⏳ {currentName ? `${currentName}'s turn…` : 'Waiting…'}
    </div>
  );
}
