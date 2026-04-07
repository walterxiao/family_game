import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import PuzzleRouter from '../components/puzzles/PuzzleRouter';
import ClueFragment from '../components/clue/ClueFragment';
import socket from '../socket';

const THEME_META = {
  space:  { icon: '🚀', label: 'Space Station', bg: '#0d1b2a' },
  jungle: { icon: '🌿', label: 'Jungle Temple', bg: '#0d1f0d' },
  ocean:  { icon: '🌊', label: 'Deep Ocean',    bg: '#0d1a2a' },
  castle: { icon: '🏰', label: 'Ancient Castle', bg: '#1a0d1f' },
};

export default function GamePage() {
  const { state } = useGame();
  const navigate = useNavigate();
  const { roomCode, theme, roundIndex, totalRounds, myPuzzle, myFragment, solvedCount, players, isHost, hint } = state;

  const [feedback, setFeedback] = useState(null); // 'correct' | 'wrong'
  const [showHint, setShowHint] = useState(false);

  const meta = THEME_META[theme] || THEME_META.space;
  const totalPlayers = players.length;
  const mySolved = !!myFragment;

  useEffect(() => {
    if (!roomCode) { navigate('/'); return; }

    socket.on('final_puzzle_ready', () => navigate('/final'));
    return () => { socket.off('final_puzzle_ready'); };
  }, [roomCode, navigate]);

  function handleAnswer(answer) {
    socket.emit('submit_answer', { roomCode, answer });

    socket.once('answer_result', ({ correct }) => {
      setFeedback(correct ? 'correct' : 'wrong');
      if (!correct) setTimeout(() => setFeedback(null), 1200);
    });
  }

  function handleHint() {
    socket.emit('request_hint', { roomCode });
    setShowHint(true);
  }

  function skipPlayer(targetId) {
    socket.emit('skip_player', { roomCode, targetSocketId: targetId });
  }

  if (!roomCode || !myPuzzle) {
    return (
      <div className="page">
        <div className="card text-center">
          <p>Loading puzzle…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ background: meta.bg, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div className="flex justify-between items-center" style={{ marginBottom: 12 }}>
          <span className="theme-badge">{meta.icon} {meta.label}</span>
          <span className="text-muted" style={{ fontSize: '0.9rem' }}>
            Round {roundIndex + 1} / {totalRounds}
          </span>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 4 }}>
          <div className="flex justify-between" style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 4 }}>
            <span>{solvedCount} / {totalPlayers} solved their puzzle</span>
          </div>
          <div className="progress-bar-wrap">
            <div className="progress-bar-fill" style={{ width: `${(solvedCount / totalPlayers) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Puzzle or Fragment reveal */}
      {mySolved ? (
        <ClueFragment fragment={myFragment} solvedCount={solvedCount} totalPlayers={totalPlayers} />
      ) : (
        <div className="card" style={{ width: '100%', maxWidth: 480 }}>
          <PuzzleRouter
            puzzle={myPuzzle}
            onSubmit={handleAnswer}
            feedback={feedback}
            disabled={mySolved}
          />

          {feedback === 'wrong' && (
            <p className="feedback-wrong mt-2 text-center">Not quite — try again!</p>
          )}

          {showHint && hint && (
            <div className="hint-box mt-4">💡 {hint}</div>
          )}

          {!showHint && (
            <button className="btn btn-ghost mt-4" onClick={handleHint} style={{ fontSize: '0.9rem' }}>
              💡 Need a hint?
            </button>
          )}
        </div>
      )}

      {/* Host controls */}
      {isHost && (
        <div className="card" style={{ width: '100%', maxWidth: 480 }}>
          <h3 style={{ marginBottom: 12 }}>Host Controls</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {players.filter(p => p.status === 'solving').map(p => (
              <div key={p.socketId} className="flex justify-between items-center">
                <span>{p.name} is still solving…</span>
                <button
                  className="btn btn-ghost"
                  style={{ width: 'auto', padding: '8px 14px', fontSize: '0.85rem' }}
                  onClick={() => skipPlayer(p.socketId)}
                >
                  Skip
                </button>
              </div>
            ))}
            {players.every(p => p.status !== 'solving') && (
              <p className="text-muted" style={{ fontSize: '0.9rem' }}>All players are done!</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
