import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import socket from '../socket';

export default function ResultsPage() {
  const { state } = useGame();
  const navigate = useNavigate();
  const { roomCode, scores, isHost, gamePhase, totalRounds, roundIndex } = state;

  const isComplete = gamePhase === 'complete';

  useEffect(() => {
    if (!roomCode) { navigate('/'); return; }

    socket.on('game_started', () => navigate('/game'));
    return () => { socket.off('game_started'); };
  }, [roomCode, navigate]);

  function handleNext() {
    if (isHost) {
      socket.emit('next_round', { roomCode });
    }
  }

  function handlePlayAgain() {
    navigate('/');
  }

  const sorted = [...scores].sort((a, b) => b.score - a.score);

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="page">
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 8 }}>
          {isComplete ? '🎉' : '✅'}
        </div>
        <h2 className="title-gradient">
          {isComplete ? 'Game Over!' : `Round ${roundIndex + 1} Complete!`}
        </h2>
        <p className="mt-2">
          {isComplete
            ? 'Amazing teamwork — you escaped all the rooms!'
            : `${totalRounds - roundIndex - 1} more room${totalRounds - roundIndex - 1 !== 1 ? 's' : ''} to go!`}
        </p>
      </div>

      <div className="card" style={{ width: '100%', maxWidth: 480 }}>
        <h3 style={{ marginBottom: 16 }}>Scores</h3>
        {sorted.map((player, i) => (
          <div key={player.name} className="score-row">
            <span>{medals[i] || '🎮'} {player.name}</span>
            <span style={{ color: 'var(--gold)', fontWeight: 800 }}>{player.score} pts</span>
          </div>
        ))}
      </div>

      {isComplete ? (
        <button className="btn btn-primary" style={{ maxWidth: 480, width: '100%' }} onClick={handlePlayAgain}>
          Play Again!
        </button>
      ) : isHost ? (
        <button className="btn btn-primary" style={{ maxWidth: 480, width: '100%' }} onClick={handleNext}>
          Next Room →
        </button>
      ) : (
        <p className="text-muted" style={{ textAlign: 'center' }}>
          Waiting for the host to start the next room…
        </p>
      )}
    </div>
  );
}
