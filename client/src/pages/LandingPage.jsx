import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import socket from '../socket';

const THEME_ICONS = { space: '🚀', jungle: '🌿', ocean: '🌊', castle: '🏰' };
const VERSION = 'v1.0.1';

export default function LandingPage() {
  const { state, dispatch } = useGame();
  const navigate = useNavigate();

  const [mode, setMode] = useState(null); // null | 'create' | 'join'
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [code, setCode] = useState('');
  const [rounds, setRounds] = useState('4');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(true);

  // Poll for open rooms every 3 seconds
  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 3000);
    return () => clearInterval(interval);
  }, []);

  async function fetchRooms() {
    try {
      const res = await fetch('/api/rooms');
      const data = await res.json();
      setRooms(data);
    } catch (_) {
      // silently ignore network errors
    } finally {
      setRoomsLoading(false);
    }
  }

  function handleCreate(e) {
    e.preventDefault();
    if (!name.trim() || !age) { setErr('Please enter your name and age.'); return; }
    setLoading(true);
    dispatch({ type: 'SET_IDENTITY', name: name.trim(), age: Number(age), isHost: true });
    socket.emit('create_room', { name: name.trim(), age: Number(age), totalRounds: Number(rounds) });
    socket.once('room_created', () => { navigate('/lobby'); setLoading(false); });
    socket.once('error', ({ message }) => { setErr(message); setLoading(false); });
  }

  function handleJoin(e, prefillCode) {
    e?.preventDefault();
    const roomCode = (prefillCode || code).trim().toUpperCase();
    if (!name.trim() || !age || !roomCode) { setErr('Please fill in all fields.'); return; }
    setLoading(true);
    dispatch({ type: 'SET_IDENTITY', name: name.trim(), age: Number(age), isHost: false });
    socket.emit('join_room', { roomCode, name: name.trim(), age: Number(age) });
    socket.once('room_joined', () => { navigate('/lobby'); setLoading(false); });
    socket.once('error', ({ message }) => { setErr(message); setLoading(false); });
  }

  function selectRoom(roomCode) {
    setCode(roomCode);
    setMode('join');
  }

  // ── Name + age form (shared between create/join) ─────────────────────────
  const identityFields = (
    <>
      <div className="field">
        <label>Your Name</label>
        <input
          type="text" placeholder="e.g. Dad" value={name}
          onChange={e => setName(e.target.value)} autoComplete="off" />
      </div>
      <div className="field">
        <label>Your Age</label>
        <input
          type="number" inputMode="numeric" placeholder="e.g. 42" value={age}
          onChange={e => setAge(e.target.value)} min="5" max="99" />
      </div>
    </>
  );

  return (
    <div className="page">
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: '3.5rem', marginBottom: 8 }}>
          {Object.values(THEME_ICONS).join(' ')}
        </div>
        <h1 className="title-gradient">Family Escape Rooms</h1>
        <p className="mt-2">Solve puzzles together on your iPads!</p>
        <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 4 }}>{VERSION}</p>
      </div>

      {/* ── Home screen: room list ── */}
      {!mode && (
        <>
          {/* Open rooms */}
          <div className="card" style={{ width: '100%', maxWidth: 480 }}>
            <div className="flex justify-between items-center" style={{ marginBottom: 14 }}>
              <h3>Open Games</h3>
              <span
                style={{ fontSize: '0.8rem', color: 'var(--muted)', cursor: 'pointer' }}
                onClick={fetchRooms}
              >
                ↻ Refresh
              </span>
            </div>

            {roomsLoading ? (
              <p className="text-muted" style={{ fontSize: '0.9rem' }}>Looking for games…</p>
            ) : rooms.length === 0 ? (
              <p className="text-muted" style={{ fontSize: '0.9rem' }}>
                No open games yet — create one below!
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {rooms.map(room => (
                  <div key={room.roomCode} style={{
                    background: 'var(--surface2)',
                    borderRadius: 12,
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                        {room.hostName}'s Game
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 2 }}>
                        {room.playerCount} player{room.playerCount !== 1 ? 's' : ''} · {room.totalRounds} rounds · Code: <span style={{ color: 'var(--gold)', fontFamily: 'monospace', fontWeight: 700 }}>{room.roomCode}</span>
                      </div>
                    </div>
                    <button
                      className="btn btn-primary"
                      style={{ width: 'auto', padding: '10px 18px', fontSize: '0.95rem', flexShrink: 0 }}
                      onClick={() => selectRoom(room.roomCode)}
                    >
                      Join
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="btn btn-primary" onClick={() => setMode('create')}>
              + Create New Game
            </button>
            <button className="btn btn-ghost" onClick={() => setMode('join')}>
              Enter Room Code Manually
            </button>
          </div>
        </>
      )}

      {/* ── Create room ── */}
      {mode === 'create' && (
        <div className="card" style={{ width: '100%', maxWidth: 480 }}>
          <h2 style={{ marginBottom: 20 }}>Create Game</h2>
          <form onSubmit={handleCreate}>
            {identityFields}
            <div className="field">
              <label>Number of Rounds</label>
              <input
                type="number" inputMode="numeric" value={rounds}
                onChange={e => setRounds(e.target.value)} min="1" max="8" />
            </div>
            {err && <p className="feedback-wrong mt-2">{err}</p>}
            <button className="btn btn-primary mt-4" type="submit" disabled={loading}>
              {loading ? 'Creating…' : 'Create Game'}
            </button>
            <button type="button" className="btn btn-ghost mt-2" onClick={() => { setMode(null); setErr(''); }}>
              Back
            </button>
          </form>
        </div>
      )}

      {/* ── Join room ── */}
      {mode === 'join' && (
        <div className="card" style={{ width: '100%', maxWidth: 480 }}>
          <h2 style={{ marginBottom: 20 }}>Join Game</h2>
          <form onSubmit={handleJoin}>
            <div className="field">
              <label>Room Code</label>
              <input
                type="text" placeholder="e.g. A7BX" value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                maxLength={4}
                style={{ textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '1.4rem', textAlign: 'center' }}
                autoComplete="off" autoCapitalize="characters" />
            </div>
            {identityFields}
            {err && <p className="feedback-wrong mt-2">{err}</p>}
            <button className="btn btn-primary mt-4" type="submit" disabled={loading}>
              {loading ? 'Joining…' : 'Join Game'}
            </button>
            <button type="button" className="btn btn-ghost mt-2" onClick={() => { setMode(null); setErr(''); setCode(''); }}>
              Back
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
