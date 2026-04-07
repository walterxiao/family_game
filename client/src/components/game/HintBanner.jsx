import React, { useEffect } from 'react';

/**
 * Shows when a hint is active — displays the suggested word and auto-clears.
 * Props:
 *   word     string  — e.g. "PLANT"
 *   onClear  fn
 */
export default function HintBanner({ word, onClear }) {
  useEffect(() => {
    if (!word) return;
    const t = setTimeout(onClear, 8000);
    return () => clearTimeout(t);
  }, [word, onClear]);

  if (!word) return null;

  return (
    <div style={{
      background: 'rgba(245,166,35,0.15)',
      border: '1.5px solid rgba(245,166,35,0.5)',
      borderRadius: 10,
      padding: '8px 16px',
      textAlign: 'center',
      fontSize: '0.9rem',
      color: 'var(--gold)',
      fontWeight: 600,
      margin: '4px 8px',
      flexShrink: 0,
    }}>
      💡 Try: <strong>{word}</strong> — highlighted in yellow on the board
      <button onClick={onClear} style={{
        marginLeft: 12, background: 'none', border: 'none', color: 'var(--gold)',
        cursor: 'pointer', fontSize: '1rem', lineHeight: 1,
      }}>✕</button>
    </div>
  );
}
