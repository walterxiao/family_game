import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import socket from '../socket';

export default function LobbyPage() {
  const { state } = useGame();
  const navigate = useNavigate();
  const { roomCode, players, isHost, error } = state;

  useEffect(() => {
    if (!roomCode) { navigate('/'); return; }
    socket.on('game_started', () => navigate('/game'));
    return () => { socket.off('game_started'); };
  }, [roomCode, navigate]);

  function startGame() {
    socket.emit('start_game', { roomCode });
  }

  if (!roomCode) return null;

  return (
    <div className="page">
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 8 }}>🔤</div>
        <h2 style={{ color: 'var(--muted)', marginBottom: 4 }}>Room Code</h2>
        <div className="room-code">{roomCode}</div>
        <p className="text-muted mt-2">Share this code if others want to join directly</p>
      </div>

      <div className="card">
        <div className="flex justify-between items-center" style={{ marginBottom: 16 }}>
          <h3>Players ({players.length})</h3>
        </div>

        <div className="player-list">
          {players.map(p => (
            <div key={p.socketId} className="player-chip">
              <span style={{ fontSize: '1.3rem' }}>
                {p.age <= 8 ? '🌟' : p.age <= 12 ? '⚡' : '🔥'}
              </span>
              <div>
                <div style={{ fontWeight: 700 }}>{p.name}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                  Age {p.age}
                </div>
              </div>
              {p.role === 'host' && (
                <span className="role-badge" style={{ marginLeft: 'auto' }}>Host</span>
              )}
            </div>
          ))}
        </div>

        {players.length < 2 && (
          <p className="text-muted mt-4" style={{ textAlign: 'center', fontSize: '0.9rem' }}>
            Waiting for at least 2 players to join…
          </p>
        )}

        {error && (
          <p style={{
            color: '#ef9a9a', background: 'rgba(233,69,96,0.12)',
            border: '1px solid rgba(233,69,96,0.3)',
            borderRadius: 10, padding: '10px 14px',
            fontSize: '0.9rem', marginTop: 16, fontWeight: 600,
          }}>
            ⚠️ {error}
          </p>
        )}

        {isHost && (
          <button
            className="btn btn-primary mt-6"
            onClick={startGame}
            disabled={players.length < 2}
          >
            Start Word Game! 🔤
          </button>
        )}

        {!isHost && (
          <p className="text-muted mt-6" style={{ textAlign: 'center' }}>
            Waiting for the host to start the game…
          </p>
        )}
      </div>
    </div>
  );
}
