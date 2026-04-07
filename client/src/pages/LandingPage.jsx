import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import socket from '../socket';

const THEME_ICONS = { a: '🔤', b: '🌟', c: '⭐', d: '🏆' };
const VERSION = 'v1.0.1';

export default function LandingPage() {
  const { dispatch } = useGame();
  const navigate = useNavigate();

  const [mode, setMode]       = useState(null);   // null | 'create' | 'join'
  const [selectedRoom, setSelectedRoom] = useState(null); // room object to join
  const [name, setName]       = useState('');
  const [age, setAge]         = useState('');
  // rounds removed — word game has no fixed round count
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState('');
  const [rooms, setRooms]     = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(true);

  // Poll open rooms every 3 seconds
  useEffect(() => {
    fetchRooms();
    const id = setInterval(fetchRooms, 3000);
    return () => clearInterval(id);
  }, []);

  async function fetchRooms() {
    try {
      const res = await fetch('/api/rooms');
      setRooms(await res.json());
    } catch (_) {}
    finally { setRoomsLoading(false); }
  }

  function handleCreate(e) {
    e.preventDefault();
    if (!name.trim() || !age) { setErr('Please enter your name and age.'); return; }
    setLoading(true);
    dispatch({ type: 'SET_IDENTITY', name: name.trim(), age: Number(age), isHost: true });
    socket.emit('create_room', { name: name.trim(), age: Number(age) });
    socket.once('room_created', () => { navigate('/lobby'); setLoading(false); });
    socket.once('error', ({ message }) => { setErr(message); setLoading(false); });
  }

  function handleJoin(e) {
    e.preventDefault();
    if (!name.trim() || !age) { setErr('Please enter your name and age.'); return; }
    setLoading(true);
    dispatch({ type: 'SET_IDENTITY', name: name.trim(), age: Number(age), isHost: false });
    socket.emit('join_room', { roomCode: selectedRoom.roomCode, name: name.trim(), age: Number(age) });
    socket.once('room_joined', () => { navigate('/lobby'); setLoading(false); });
    socket.once('error', ({ message }) => { setErr(message); setLoading(false); });
  }

  function pickRoom(room) {
    setSelectedRoom(room);
    setErr('');
    setMode('join');
  }

  const identityFields = (
    <>
      <div className="field">
        <label>Your Name</label>
        <input type="text" placeholder="e.g. Dad" value={name}
          onChange={e => setName(e.target.value)} autoComplete="off" />
      </div>
      <div className="field">
        <label>Your Age</label>
        <input type="number" inputMode="numeric" placeholder="e.g. 42" value={age}
          onChange={e => setAge(e.target.value)} min="5" max="99" />
      </div>
    </>
  );

  return (
    <div className="page">
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: '3.5rem', marginBottom: 8 }}>🔤 🌟 🏆</div>
        <h1 className="title-gradient">Family Word Game</h1>
        <p className="mt-2">Play words together on your iPads!</p>
        <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 4 }}>{VERSION}</p>
      </div>

      {/* ── Home: room list ── */}
      {!mode && (
        <>
          <div className="card" style={{ width: '100%', maxWidth: 480 }}>
            <div className="flex justify-between items-center" style={{ marginBottom: 14 }}>
              <h3>Open Games</h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted)', cursor: 'pointer' }}
                onClick={fetchRooms}>↻ Refresh</span>
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
                    background: 'var(--surface2)', borderRadius: 12,
                    padding: '14px 16px', display: 'flex',
                    alignItems: 'center', justifyContent: 'space-between', gap: 12,
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                        {room.hostName}'s Game
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 2 }}>
                        {room.playerCount} player{room.playerCount !== 1 ? 's' : ''} waiting
                      </div>
                    </div>
                    <button
                      className="btn btn-primary"
                      style={{ width: 'auto', padding: '10px 18px', fontSize: '0.95rem', flexShrink: 0 }}
                      onClick={() => pickRoom(room)}
                    >
                      Join
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button className="btn btn-ghost" style={{ maxWidth: 480, width: '100%' }}
            onClick={() => { setMode('create'); setErr(''); }}>
            + Create New Game
          </button>
        </>
      )}

      {/* ── Join: name + age only ── */}
      {mode === 'join' && selectedRoom && (
        <div className="card" style={{ width: '100%', maxWidth: 480 }}>
          <div style={{ marginBottom: 20 }}>
            <h2>Join {selectedRoom.hostName}'s Game</h2>
            <p className="text-muted mt-2" style={{ fontSize: '0.9rem' }}>
              {selectedRoom.playerCount} player{selectedRoom.playerCount !== 1 ? 's' : ''} waiting
            </p>
          </div>
          <form onSubmit={handleJoin}>
            {identityFields}
            {err && <p className="feedback-wrong mt-2">{err}</p>}
            <button className="btn btn-primary mt-4" type="submit" disabled={loading}>
              {loading ? 'Joining…' : 'Join Game'}
            </button>
            <button type="button" className="btn btn-ghost mt-2"
              onClick={() => { setMode(null); setErr(''); setSelectedRoom(null); }}>
              Back
            </button>
          </form>
        </div>
      )}

      {/* ── Create: name + age ── */}
      {mode === 'create' && (
        <div className="card" style={{ width: '100%', maxWidth: 480 }}>
          <h2 style={{ marginBottom: 20 }}>Create Game 🔤</h2>
          <form onSubmit={handleCreate}>
            {identityFields}
            {err && <p className="feedback-wrong mt-2">{err}</p>}
            <button className="btn btn-primary mt-4" type="submit" disabled={loading}>
              {loading ? 'Creating…' : 'Create Game'}
            </button>
            <button type="button" className="btn btn-ghost mt-2"
              onClick={() => { setMode(null); setErr(''); }}>
              Back
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
