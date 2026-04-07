const db = require('./db');
const { getTier, selectPuzzles, selectFragmentSet, assignFragments, validateAnswer, validateFinalAnswer, pickTheme } = require('./puzzleEngine');

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

// ─── Create Room ────────────────────────────────────────────────────────────

async function createRoom(hostSocketId, hostName, hostAge, config = {}) {
  const roomCode = generateRoomCode();
  const tier = getTier(hostAge);
  const totalRounds = config.totalRounds || 4;

  await db.execute(
    `INSERT INTO rooms (room_code, host_socket, status, total_rounds) VALUES (?, ?, 'lobby', ?)`,
    [roomCode, hostSocketId, totalRounds]
  );

  const [playerResult] = await db.execute(
    `INSERT INTO players (room_code, socket_id, name, age, tier, role) VALUES (?, ?, ?, ?, ?, 'host')`,
    [roomCode, hostSocketId, hostName, hostAge, tier]
  );

  const room = {
    roomCode,
    hostId: hostSocketId,
    status: 'lobby',
    totalRounds,
    currentRound: 0,
    hintsAllowed: 3,
    hintsUsed: 0,
    players: {
      [hostSocketId]: {
        id: playerResult.insertId,
        socketId: hostSocketId,
        name: hostName,
        age: hostAge,
        tier,
        role: 'host',
        status: 'waiting',
        score: 0,
      },
    },
    rounds: [],
    usedPuzzleIds: new Set(),
    usedFragmentSetIds: new Set(),
  };

  rooms.set(roomCode, room);
  socketToRoom.set(hostSocketId, roomCode);
  return room;
}

// ─── Join Room ───────────────────────────────────────────────────────────────

async function joinRoom(roomCode, socketId, name, age) {
  const room = rooms.get(roomCode);
  if (!room) throw new Error('Room not found');
  if (room.status !== 'lobby') throw new Error('Game already started');

  const tier = getTier(age);

  const [result] = await db.execute(
    `INSERT INTO players (room_code, socket_id, name, age, tier, role) VALUES (?, ?, ?, ?, ?, 'player')`,
    [roomCode, socketId, name, age, tier]
  );

  const player = {
    id: result.insertId,
    socketId,
    name,
    age,
    tier,
    role: 'player',
    status: 'waiting',
    score: 0,
  };

  room.players[socketId] = player;
  socketToRoom.set(socketId, roomCode);

  return { room, player };
}

// ─── Start Game ──────────────────────────────────────────────────────────────

async function startGame(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) throw new Error('Room not found');
  if (Object.keys(room.players).length < 2) throw new Error('Need at least 2 players');

  room.status = 'puzzle';
  await db.execute(`UPDATE rooms SET status='puzzle' WHERE room_code=?`, [roomCode]);

  return await advanceRound(room);
}

async function advanceRound(room) {
  const roundIndex = room.currentRound;
  const theme = pickTheme(roundIndex);

  // Assign puzzles
  const puzzleAssignments = selectPuzzles(room.players, theme, room.usedPuzzleIds);
  // Assign fragments
  const fragmentSet = selectFragmentSet(theme, room.usedFragmentSetIds);
  room.usedFragmentSetIds.add(fragmentSet.id);
  const fragmentAssignments = assignFragments(fragmentSet, Object.keys(room.players));

  // Persist round
  const [roundResult] = await db.execute(
    `INSERT INTO rounds (room_code, round_index, theme, status, started_at) VALUES (?, ?, ?, 'active', NOW())`,
    [room.roomCode, roundIndex, theme]
  );
  const roundId = roundResult.insertId;

  // Persist round_players
  for (const [socketId, puzzle] of Object.entries(puzzleAssignments)) {
    const player = room.players[socketId];
    await db.execute(
      `INSERT INTO round_players (round_id, player_id, puzzle_id, fragment) VALUES (?, ?, ?, ?)`,
      [roundId, player.id, puzzle.id, fragmentAssignments[socketId]]
    );
    player.status = 'solving';
    player.currentPuzzle = puzzle;
    player.currentFragment = null;
  }

  // Persist final puzzle
  await db.execute(
    `INSERT INTO final_puzzles (round_id, prompt, normalized_answer) VALUES (?, ?, ?)`,
    [roundId, fragmentSet.prompt, fragmentSet.normalizedAnswer]
  );

  const roundState = {
    roundId,
    roundIndex,
    theme,
    status: 'active',
    puzzleAssignments,
    fragmentAssignments,
    fragmentSet,
    solvedCount: 0,
  };
  room.rounds[roundIndex] = roundState;

  await db.execute(`UPDATE rooms SET current_round=?, status='puzzle' WHERE room_code=?`, [roundIndex, room.roomCode]);

  return { room, roundState, puzzleAssignments, fragmentAssignments };
}

// ─── Submit Answer ───────────────────────────────────────────────────────────

async function submitAnswer(roomCode, socketId, answer) {
  const room = rooms.get(roomCode);
  if (!room) throw new Error('Room not found');

  const player = room.players[socketId];
  if (!player || player.status !== 'solving') throw new Error('Not in solving state');

  const puzzle = player.currentPuzzle;
  if (!validateAnswer(puzzle, answer)) {
    return { correct: false };
  }

  const roundState = room.rounds[room.currentRound];
  const fragment = roundState.fragmentAssignments[socketId];

  player.status = 'solved';
  player.currentFragment = fragment;
  roundState.solvedCount++;

  // Update DB
  await db.execute(
    `UPDATE round_players SET solved_at=NOW() WHERE round_id=? AND player_id=?`,
    [roundState.roundId, player.id]
  );

  const allSolved = Object.values(room.players).every((p) => p.status === 'solved');

  if (allSolved) {
    room.status = 'final';
    await db.execute(`UPDATE rooms SET status='final' WHERE room_code=?`, [roomCode]);
  }

  return {
    correct: true,
    fragment,
    allSolved,
    solvedCount: roundState.solvedCount,
    totalPlayers: Object.keys(room.players).length,
    finalPuzzle: allSolved ? { prompt: roundState.fragmentSet.prompt } : null,
  };
}

// ─── Submit Final Answer ─────────────────────────────────────────────────────

async function submitFinal(roomCode, socketId, answer) {
  const room = rooms.get(roomCode);
  if (!room) throw new Error('Room not found');
  if (room.status !== 'final') throw new Error('Not in final phase');

  const roundState = room.rounds[room.currentRound];
  if (!validateFinalAnswer(roundState.fragmentSet.normalizedAnswer, answer)) {
    return { correct: false };
  }

  const player = room.players[socketId];
  const roundId = roundState.roundId;

  // Score: bonus for speed could be added later
  Object.values(room.players).forEach((p) => { p.score += 100; });

  await db.execute(
    `UPDATE final_puzzles SET answered_by_player=?, answered_at=NOW() WHERE round_id=?`,
    [player.id, roundId]
  );
  await db.execute(
    `UPDATE rounds SET status='complete', completed_at=NOW() WHERE id=?`,
    [roundId]
  );
  await db.execute(
    `UPDATE players SET score=score+100 WHERE room_code=?`,
    [roomCode]
  );

  roundState.status = 'complete';
  room.currentRound++;

  const gameOver = room.currentRound >= room.totalRounds;

  if (gameOver) {
    room.status = 'complete';
    await db.execute(`UPDATE rooms SET status='complete' WHERE room_code=?`, [roomCode]);
  } else {
    // Reset player statuses for next round
    Object.values(room.players).forEach((p) => { p.status = 'waiting'; p.currentFragment = null; });
  }

  const scores = Object.values(room.players).map((p) => ({ name: p.name, score: p.score }));

  return { correct: true, gameOver, scores, nextRound: gameOver ? null : room.currentRound };
}

// ─── Next Round ──────────────────────────────────────────────────────────────

async function nextRound(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) throw new Error('Room not found');
  return await advanceRound(room);
}

// ─── Request Hint ────────────────────────────────────────────────────────────

function requestHint(roomCode, socketId) {
  const room = rooms.get(roomCode);
  if (!room) throw new Error('Room not found');
  if (room.hintsUsed >= room.hintsAllowed) return { hint: null, exhausted: true };

  const player = room.players[socketId];
  const puzzle = player?.currentPuzzle;
  if (!puzzle) return { hint: null, exhausted: false };

  room.hintsUsed++;
  return { hint: puzzle.hint, exhausted: room.hintsUsed >= room.hintsAllowed, hintsRemaining: room.hintsAllowed - room.hintsUsed };
}

// ─── Skip Player (host only) ─────────────────────────────────────────────────

async function skipPlayer(roomCode, hostSocketId, targetSocketId) {
  const room = rooms.get(roomCode);
  if (!room || room.hostId !== hostSocketId) throw new Error('Unauthorized');

  const target = room.players[targetSocketId];
  if (!target || target.status !== 'solving') return null;

  const roundState = room.rounds[room.currentRound];
  const fragment = roundState.fragmentAssignments[targetSocketId];

  target.status = 'solved';
  target.currentFragment = fragment;
  roundState.solvedCount++;

  await db.execute(
    `UPDATE round_players SET solved_at=NOW() WHERE round_id=? AND player_id=?`,
    [roundState.roundId, target.id]
  );

  const allSolved = Object.values(room.players).every((p) => p.status === 'solved');
  if (allSolved) {
    room.status = 'final';
    await db.execute(`UPDATE rooms SET status='final' WHERE room_code=?`, [roomCode]);
  }

  return { fragment, allSolved, solvedCount: roundState.solvedCount, totalPlayers: Object.keys(room.players).length };
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
    await db.execute(`UPDATE players SET status='disconnected' WHERE socket_id=?`, [socketId]);
  }

  socketToRoom.delete(socketId);

  // If host disconnected, pick a new host (first remaining connected player)
  if (room.hostId === socketId) {
    const newHost = Object.values(room.players).find((p) => p.socketId !== socketId && p.status !== 'disconnected');
    if (newHost) {
      room.hostId = newHost.socketId;
      newHost.role = 'host';
      await db.execute(`UPDATE rooms SET host_socket=? WHERE room_code=?`, [newHost.socketId, roomCode]);
      await db.execute(`UPDATE players SET role='host' WHERE id=?`, [newHost.id]);
    }
  }

  return { roomCode, room };
}

// ─── Lookups ─────────────────────────────────────────────────────────────────

function getRoom(roomCode) {
  return rooms.get(roomCode) || null;
}

function getRoomBySocket(socketId) {
  const roomCode = socketToRoom.get(socketId);
  return roomCode ? rooms.get(roomCode) : null;
}

function getPlayerList(room) {
  return Object.values(room.players).map(({ socketId, name, age, tier, role, status, score }) => ({
    socketId, name, age, tier, role, status, score,
  }));
}

module.exports = {
  createRoom,
  joinRoom,
  startGame,
  nextRound,
  submitAnswer,
  submitFinal,
  requestHint,
  skipPlayer,
  handleDisconnect,
  getRoom,
  getRoomBySocket,
  getPlayerList,
};
