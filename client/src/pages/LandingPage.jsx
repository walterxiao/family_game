import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import socket from '../socket';

const THEME_ICONS = { space: '🚀', jungle: '🌿', ocean: '🌊', castle: '🏰' };
const VERSION = 'v1.0.1';

export default function LandingPage() {
  const { state, dispatch } = useGame();
  const navigate = useNavigate();

  const [mode, setMode] = useState(null); // 'create' | 'join'
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [code, setCode] = useState('');
  const [rounds, setRounds] = useState('4');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  function handleCreate(e) {
    e.preventDefault();
    if (!name.trim() || !age) { setErr('Please enter your name and age.'); return; }
    setLoading(true);
    dispatch({ type: 'SET_IDENTITY', name: name.trim(), age: Number(age), isHost: true });

    socket.emit('create_room', { name: name.trim(), age: Number(age), totalRounds: Number(rounds) });

    socket.once('room_created', () => { navigate('/lobby'); setLoading(false); });
    socket.once('error', ({ message }) => { setErr(message); setLoading(false); });
  }

  function handleJoin(e) {
    e.preventDefault();
    if (!name.trim() || !age || !code.trim()) { setErr('Please fill in all fields.'); return; }
    setLoading(true);
    dispatch({ type: 'SET_IDENTITY', name: name.trim(), age: Number(age), isHost: false });

    socket.emit('join_room', { roomCode: code.trim().toUpperCase(), name: name.trim(), age: Number(age) });

    socket.once('room_joined', () => { navigate('/lobby'); setLoading(false); });
    socket.once('error', ({ message }) => { setErr(message); setLoading(false); });
  }

  return (
    <div className="page">
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: '3.5rem', marginBottom: 8 }}>
          {Object.values(THEME_ICONS).join(' ')}
        </div>
        <h1 className="title-gradient">Family Escape Rooms</h1>
        <p className="mt-2">Solve puzzles together on your iPads!</p>
        <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 4 }}>{VERSION}</p>
      </div>

      {!mode && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button className="btn btn-primary" onClick={() => setMode('create')}>
            Create a Room
          </button>
          <button className="btn btn-ghost" onClick={() => setMode('join')}>
            Join a Room
          </button>
        </div>
      )}

      {mode === 'create' && (
        <div className="card">
          <h2 style={{ marginBottom: 20 }}>Create Room</h2>
          <form onSubmit={handleCreate}>
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

      {mode === 'join' && (
        <div className="card">
          <h2 style={{ marginBottom: 20 }}>Join Room</h2>
          <form onSubmit={handleJoin}>
            <div className="field">
              <label>Room Code</label>
              <input
                type="text" placeholder="e.g. A7BX" value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                maxLength={4} style={{ textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '1.4rem', textAlign: 'center' }}
                autoComplete="off" autoCapitalize="characters" />
            </div>
            <div className="field">
              <label>Your Name</label>
              <input
                type="text" placeholder="e.g. Alex" value={name}
                onChange={e => setName(e.target.value)} autoComplete="off" />
            </div>
            <div className="field">
              <label>Your Age</label>
              <input
                type="number" inputMode="numeric" placeholder="e.g. 15" value={age}
                onChange={e => setAge(e.target.value)} min="5" max="99" />
            </div>
            {err && <p className="feedback-wrong mt-2">{err}</p>}
            <button className="btn btn-primary mt-4" type="submit" disabled={loading}>
              {loading ? 'Joining…' : 'Join Game'}
            </button>
            <button type="button" className="btn btn-ghost mt-2" onClick={() => { setMode(null); setErr(''); }}>
              Back
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
