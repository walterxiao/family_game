import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';

const REASON_MESSAGES = {
  rack_empty: 'Someone emptied their rack — game over!',
  all_passed: 'Everyone passed — game over!',
};

export default function EndPage() {
  const { state } = useGame();
  const navigate = useNavigate();

  const { finalScores, gameOverReason, mySocketId } = state;

  if (!finalScores) {
    navigate('/');
    return null;
  }

  // Sort by score descending
  const sorted = [...finalScores].sort((a, b) => b.score - a.score);
  const winner = sorted[0];
  const myResult = sorted.find(s => s.socketId === mySocketId);

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="page">
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: 8 }}>🏆</div>
        <h1 className="title-gradient">Game Over!</h1>
        <p className="text-muted mt-2">
          {REASON_MESSAGES[gameOverReason] || 'Great game everyone!'}
        </p>
      </div>

      {/* Winner callout */}
      <div className="card" style={{ textAlign: 'center', maxWidth: 400, width: '100%', background: 'rgba(245,166,35,0.1)', border: '1.5px solid rgba(245,166,35,0.4)' }}>
        <div style={{ fontSize: '2rem', marginBottom: 4 }}>🥇</div>
        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--gold)' }}>
          {winner.name}
        </div>
        <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--gold)' }}>
          {winner.score} pts
        </div>
        <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: 4 }}>
          {winner.socketId === mySocketId ? '🎉 That\'s you!' : '🎉 Winner!'}
        </p>
      </div>

      {/* Full scoreboard */}
      <div className="card" style={{ maxWidth: 400, width: '100%' }}>
        <h3 style={{ marginBottom: 16 }}>Final Scores</h3>
        {sorted.map((s, i) => (
          <div key={s.socketId} className="score-row" style={{
            background: s.socketId === mySocketId ? 'rgba(245,166,35,0.08)' : 'transparent',
            borderRadius: 8,
            padding: '10px 8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '1.3rem' }}>{medals[i] || '🎖'}</span>
              <div>
                <div style={{ fontWeight: 700 }}>
                  {s.name}
                  {s.socketId === mySocketId && <span style={{ color: 'var(--gold)', marginLeft: 6, fontSize: '0.8rem' }}>you</span>}
                </div>
              </div>
            </div>
            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: i === 0 ? 'var(--gold)' : 'var(--text)' }}>
              {s.score}
            </div>
          </div>
        ))}
      </div>

      <button className="btn btn-primary" style={{ maxWidth: 400 }} onClick={() => navigate('/')}>
        Play Again! 🔤
      </button>
    </div>
  );
}
