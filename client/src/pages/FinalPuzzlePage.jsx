import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import socket from '../socket';

export default function FinalPuzzlePage() {
  const { state, dispatch } = useGame();
  const navigate = useNavigate();
  const { roomCode, finalPrompt, finalAnswer, finalResult, myFragment, players, theme } = state;
  const inputRef = useRef(null);

  useEffect(() => {
    if (!roomCode) { navigate('/'); return; }

    socket.on('round_complete', () => navigate('/results'));
    return () => { socket.off('round_complete'); };
  }, [roomCode, navigate]);

  useEffect(() => {
    // Auto-focus input
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  function handleTyping(e) {
    const value = e.target.value;
    dispatch({ type: 'SET_FINAL_ANSWER', value });
    socket.emit('final_answer_typing', { roomCode, partialAnswer: value });
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!finalAnswer.trim()) return;
    socket.emit('submit_final', { roomCode, answer: finalAnswer });
  }

  const themeIcons = { space: '🚀', jungle: '🌿', ocean: '🌊', castle: '🏰' };
  const icon = themeIcons[theme] || '🎯';

  return (
    <div className="page">
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 8 }}>{icon}</div>
        <h2 className="title-gradient">Final Challenge!</h2>
        <p className="mt-2">Combine everyone's clues to solve it together</p>
      </div>

      {/* Everyone's fragments */}
      <div className="card" style={{ width: '100%', maxWidth: 480 }}>
        <h3 style={{ marginBottom: 12 }}>Your clue words:</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
          {players.map(p => (
            <div key={p.socketId} style={{
              background: 'var(--surface2)',
              borderRadius: 10,
              padding: '8px 14px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 2 }}>{p.name}</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--gold)' }}>
                {p.socketId === socket.id && myFragment ? myFragment : '???'}
              </div>
            </div>
          ))}
        </div>
        <p className="text-muted" style={{ fontSize: '0.85rem' }}>
          Share your clue word out loud with the group!
        </p>
      </div>

      {/* Final puzzle */}
      <div className="card" style={{ width: '100%', maxWidth: 480 }}>
        <div style={{
          background: 'rgba(233,69,96,0.1)',
          border: '1.5px solid rgba(233,69,96,0.3)',
          borderRadius: 12,
          padding: '16px',
          marginBottom: 20,
          fontSize: '1rem',
          lineHeight: 1.6,
          color: 'var(--text)',
          fontWeight: 500,
        }}>
          {finalPrompt}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="final-input-wrap field">
            <label>Your Answer</label>
            <input
              ref={inputRef}
              type="text"
              value={finalAnswer}
              onChange={handleTyping}
              placeholder="Type the answer here…"
              autoComplete="off"
              autoCapitalize="characters"
              style={{ textTransform: 'uppercase' }}
            />
          </div>

          {finalResult === false && (
            <p className="feedback-wrong mt-2 text-center">Not quite — check your clue words and try again!</p>
          )}

          <button
            className="btn btn-success mt-4"
            type="submit"
            disabled={!finalAnswer.trim()}
          >
            Submit Answer!
          </button>
        </form>
      </div>

      <p className="text-muted" style={{ fontSize: '0.85rem', textAlign: 'center' }}>
        Any player can type — everyone sees the same answer!
      </p>
    </div>
  );
}
