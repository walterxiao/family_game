import React from 'react';

export default function ClueFragment({ fragment, solvedCount, totalPlayers }) {
  const waiting = solvedCount < totalPlayers;

  return (
    <div className="card fragment-reveal" style={{ width: '100%', maxWidth: 480, textAlign: 'center' }}>
      <p style={{ color: 'var(--green)', fontWeight: 700, marginBottom: 8 }}>✓ Puzzle solved!</p>
      <p className="text-muted" style={{ marginBottom: 16 }}>Your clue word is:</p>
      <div className="fragment-word">{fragment}</div>
      <p className="text-muted" style={{ marginTop: 16, fontSize: '0.95rem' }}>
        📢 Shout this out to your family!
      </p>
      {waiting && (
        <div style={{ marginTop: 20 }}>
          <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: 8 }}>
            Waiting for others… ({solvedCount}/{totalPlayers} done)
          </p>
          <div className="progress-bar-wrap">
            <div
              className="progress-bar-fill"
              style={{ width: `${(solvedCount / totalPlayers) * 100}%` }}
            />
          </div>
        </div>
      )}
      {!waiting && (
        <p style={{ marginTop: 16, color: 'var(--gold)', fontWeight: 700 }}>
          Everyone's ready — check the final puzzle!
        </p>
      )}
    </div>
  );
}
