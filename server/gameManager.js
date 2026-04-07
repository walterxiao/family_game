// Room & player management for the word game.
const db = require('./db');

// In-memory store: roomCode → room
const rooms = new Map();
// socketId → roomCode (for disconnect lookup)
const socketToRoom = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms.has(code));
  return code;
}

// ─── Create Room ──────────────────────────────────────────────────────────────

async function createRoom(hostSocketId, hostName, hostAge) {
  const roomCode = generateRoomCode();

  await db.execute(
    `INSERT INTO rooms (room_code, host_socket, status) VALUES (?, ?, 'lobby')`,
    [roomCode, hostSocketId]
  );

  const [playerResult] = await db.execute(
    `INSERT INTO players (room_code, socket_id, name, age, role) VALUES (?, ?, ?, ?, 'host')`,
    [roomCode, hostSocketId, hostName, hostAge]
  );

  const room = {
    roomCode,
    hostId: hostSocketId,
    status: 'lobby',
    players: {
      [hostSocketId]: {
        id: playerResult.insertId,
        socketId: hostSocketId,
        name: hostName,
        age: hostAge,
        role: 'host',
        status: 'active',
        score: 0,
        rack: [],
        turnPosition: 0,
      },
    },
    game: null,
  };

  rooms.set(roomCode, room);
  socketToRoom.set(hostSocketId, roomCode);
  return room;
}

// ─── Join Room ────────────────────────────────────────────────────────────────

async function joinRoom(roomCode, socketId, name, age) {
  const room = rooms.get(roomCode);
  if (!room)                   throw new Error('Room not found');
  if (room.status !== 'lobby') throw new Error('Game already started');
  if (Object.keys(room.players).length >= 5) throw new Error('Room is full (max 5 players)');

  const [result] = await db.execute(
    `INSERT INTO players (room_code, socket_id, name, age, role) VALUES (?, ?, ?, ?, 'player')`,
    [roomCode, socketId, name, age]
  );

  const player = {
    id: result.insertId,
    socketId,
    name,
    age,
    role: 'player',
    status: 'active',
    score: 0,
    rack: [],
    turnPosition: 0,
  };

  room.players[socketId] = player;
  socketToRoom.set(socketId, roomCode);

  return { room, player };
}

// ─── Rejoin Game ──────────────────────────────────────────────────────────────

async function rejoinGame(newSocketId, roomCode, playerName) {
  const room = rooms.get(roomCode);
  if (!room) throw new Error('Room not found');

  // Find disconnected player by name
  const existing = Object.values(room.players)
    .find(p => p.name === playerName && p.status === 'disconnected');
  if (!existing) throw new Error('No disconnected player found with that name');

  const oldSocketId = existing.socketId;

  // Remap socket references
  socketToRoom.delete(oldSocketId);
  socketToRoom.set(newSocketId, roomCode);

  existing.socketId = newSocketId;
  existing.status = 'active';
  delete room.players[oldSocketId];
  room.players[newSocketId] = existing;

  if (room.hostId === oldSocketId) room.hostId = newSocketId;

  if (room.game) {
    const idx = room.game.turnOrder.indexOf(oldSocketId);
    if (idx !== -1) room.game.turnOrder[idx] = newSocketId;
  }

  try {
    await db.execute(
      `UPDATE players SET socket_id=?, status='active' WHERE id=?`,
      [newSocketId, existing.id]
    );
  } catch (e) { console.error('[rejoinGame] DB error:', e.message); }

  return room;
}

// ─── Disconnect ───────────────────────────────────────────────────────────────

async function handleDisconnect(socketId) {
  const roomCode = socketToRoom.get(socketId);
  if (!roomCode) return null;

  const room = rooms.get(roomCode);
  if (!room) return null;

  const player = room.players[socketId];
  if (player) {
    player.status = 'disconnected';
    try {
      await db.execute(`UPDATE players SET status='disconnected' WHERE socket_id=?`, [socketId]);
    } catch (e) { console.error('[handleDisconnect] DB error:', e.message); }
  }

  socketToRoom.delete(socketId);

  // Elect new host if host left
  if (room.hostId === socketId) {
    const newHost = Object.values(room.players)
      .find(p => p.socketId !== socketId && p.status !== 'disconnected');
    if (newHost) {
      room.hostId = newHost.socketId;
      newHost.role = 'host';
      try {
        await db.execute(`UPDATE rooms SET host_socket=? WHERE room_code=?`, [newHost.socketId, roomCode]);
        await db.execute(`UPDATE players SET role='host' WHERE id=?`, [newHost.id]);
      } catch (e) { console.error('[handleDisconnect] DB error (host transfer):', e.message); }
    }
  }

  return { roomCode, room };
}

// ─── Lookups ──────────────────────────────────────────────────────────────────

function getRoom(roomCode) { return rooms.get(roomCode) || null; }

function getRoomBySocket(socketId) {
  const roomCode = socketToRoom.get(socketId);
  return roomCode ? rooms.get(roomCode) : null;
}

function getPlayerList(room) {
  return Object.values(room.players).map(({ socketId, name, age, role, status, score, turnPosition }) => ({
    socketId, name, age, role, status, score, turnPosition,
  }));
}

function listRooms() {
  const result = [];
  for (const room of rooms.values()) {
    if (room.status === 'lobby') {
      const host = Object.values(room.players).find(p => p.role === 'host');
      result.push({
        roomCode: room.roomCode,
        hostName: host?.name || 'Unknown',
        playerCount: Object.keys(room.players).length,
      });
    }
  }
  return result;
}

module.exports = {
  createRoom,
  joinRoom,
  rejoinGame,
  handleDisconnect,
  getRoom,
  getRoomBySocket,
  getPlayerList,
  listRooms,
};
