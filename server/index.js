require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { networkInterfaces } = require('os');

const gm  = require('./gameManager');
const wg  = require('./wordGame');
const { findHint } = require('./hintEngine');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });

// ─── REST ─────────────────────────────────────────────────────────────────────

app.get('/api/rooms', (_req, res) => res.json(gm.listRooms()));

// Serve built React app
const distPath = path.join(__dirname, '../client/dist');
app.use(express.static(distPath));
app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));

// ─── Socket Events ────────────────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`[connect] ${socket.id}`);

  // ── Lobby ──────────────────────────────────────────────────────────────────

  socket.on('create_room', async ({ name, age } = {}) => {
    try {
      const room = await gm.createRoom(socket.id, name, age);
      socket.join(room.roomCode);
      socket.emit('room_created', {
        roomCode: room.roomCode,
        players: gm.getPlayerList(room),
        isHost: true,
      });
    } catch (err) {
      socket.emit('error', { code: 'CREATE_FAILED', message: err.message });
    }
  });

  socket.on('join_room', async ({ roomCode, name, age } = {}) => {
    try {
      const { room, player } = await gm.joinRoom(roomCode.toUpperCase(), socket.id, name, age);
      const rc = room.roomCode;
      socket.join(rc);
      socket.emit('room_joined', { roomCode: rc, players: gm.getPlayerList(room), isHost: false });
      socket.to(rc).emit('player_joined', {
        player: { socketId: player.socketId, name: player.name, age: player.age, role: player.role, status: player.status, score: 0, turnPosition: 0 },
      });
    } catch (err) {
      socket.emit('error', { code: 'JOIN_FAILED', message: err.message });
    }
  });

  // ── Start Game ─────────────────────────────────────────────────────────────

  socket.on('start_game', async ({ roomCode } = {}) => {
    try {
      const room = gm.getRoom(roomCode);
      if (!room)                   return socket.emit('error', { message: 'Room not found' });
      if (room.hostId !== socket.id) return socket.emit('error', { message: 'Only the host can start the game' });
      if (Object.keys(room.players).length < 2) return socket.emit('error', { message: 'Need at least 2 players to start' });

      await wg.startWordGame(room);
      const game = room.game;

      // Broadcast game state (no racks — those are private)
      io.to(roomCode).emit('game_started', {
        board: game.board,
        turnOrder: game.turnOrder,
        currentTurnSocketId: game.turnOrder[game.currentTurnIndex],
        players: gm.getPlayerList(room),
        bagCount: game.bag.length,
      });

      // Send each player their private rack
      for (const sid of game.turnOrder) {
        io.to(sid).emit('rack_dealt', { rack: room.players[sid].rack });
      }
    } catch (err) {
      socket.emit('error', { code: 'START_FAILED', message: err.message });
    }
  });

  // ── Place Tiles ────────────────────────────────────────────────────────────

  socket.on('place_tiles', async ({ roomCode, placements } = {}) => {
    try {
      const room = gm.getRoom(roomCode);
      if (!room || room.status !== 'playing') return;

      const result = await wg.applyMove(room, socket.id, placements);

      if (!result.success) {
        socket.emit('invalid_move', { reason: result.reason, invalidWords: result.invalidWords });
        return;
      }

      // Broadcast updated board and scores
      io.to(roomCode).emit('move_accepted', {
        board: result.board,
        scores: result.scores,
        bagCount: result.bagCount,
        currentTurnSocketId: result.currentTurnSocketId,
        wordsFormed: result.wordsFormed,
        moveScore: result.moveScore,
        bySocketId: result.bySocketId,
      });

      // Send private new rack to the player who just moved
      socket.emit('rack_updated', { rack: result.newRack });

      if (result.gameOver) {
        const finalScores = await wg.finalizeGame(room);
        io.to(roomCode).emit('game_over', { reason: 'rack_empty', finalScores });
      }
    } catch (err) {
      socket.emit('error', { code: 'PLACE_FAILED', message: err.message });
    }
  });

  // ── Pass Turn ──────────────────────────────────────────────────────────────

  socket.on('pass_turn', async ({ roomCode } = {}) => {
    try {
      const room = gm.getRoom(roomCode);
      if (!room || room.status !== 'playing') return;

      const result = await wg.applyPass(room, socket.id);
      if (!result.success) { socket.emit('invalid_move', { reason: result.reason }); return; }

      io.to(roomCode).emit('turn_passed', {
        bySocketId: socket.id,
        currentTurnSocketId: result.currentTurnSocketId,
        consecutivePasses: result.consecutivePasses,
      });

      if (result.gameOver) {
        const finalScores = await wg.finalizeGame(room);
        io.to(roomCode).emit('game_over', { reason: 'all_passed', finalScores });
      }
    } catch (err) {
      socket.emit('error', { code: 'PASS_FAILED', message: err.message });
    }
  });

  // ── Exchange Tiles ─────────────────────────────────────────────────────────

  socket.on('exchange_tiles', async ({ roomCode, letters } = {}) => {
    try {
      const room = gm.getRoom(roomCode);
      if (!room || room.status !== 'playing') return;

      const result = await wg.applyExchange(room, socket.id, letters);
      if (!result.success) { socket.emit('invalid_move', { reason: result.reason }); return; }

      io.to(roomCode).emit('tiles_exchanged', {
        bySocketId: socket.id,
        currentTurnSocketId: result.currentTurnSocketId,
        bagCount: result.bagCount,
      });

      // Private new rack
      socket.emit('rack_updated', { rack: result.newRack });
    } catch (err) {
      socket.emit('error', { code: 'EXCHANGE_FAILED', message: err.message });
    }
  });

  // ── Request Hint ───────────────────────────────────────────────────────────

  socket.on('request_hint', ({ roomCode } = {}) => {
    try {
      const room = gm.getRoom(roomCode);
      if (!room || !room.game) return;

      const player = room.players[socket.id];
      if (!player) return;

      const hint = findHint(player.rack, room.game.board);
      socket.emit('hint_result', hint ? { word: hint.word, placements: hint.placements } : { word: null, placements: [] });
    } catch (err) {
      socket.emit('error', { code: 'HINT_FAILED', message: err.message });
    }
  });

  // ── Rejoin ─────────────────────────────────────────────────────────────────

  socket.on('rejoin_game', async ({ roomCode, playerName } = {}) => {
    try {
      const room = await gm.rejoinGame(socket.id, roomCode.toUpperCase(), playerName);
      socket.join(room.roomCode);

      const player = room.players[socket.id];
      const game = room.game;

      socket.emit('game_rejoined', {
        roomCode: room.roomCode,
        board: game ? game.board : {},
        rack: player.rack,
        scores: game ? wg.getScores(room) : [],
        currentTurnSocketId: game ? game.turnOrder[game.currentTurnIndex] : null,
        bagCount: game ? game.bag.length : 98,
        players: gm.getPlayerList(room),
        isHost: room.hostId === socket.id,
      });

      socket.to(room.roomCode).emit('player_rejoined', {
        socketId: socket.id,
        name: player.name,
      });
    } catch (err) {
      socket.emit('error', { code: 'REJOIN_FAILED', message: err.message });
    }
  });

  // ── Disconnect ─────────────────────────────────────────────────────────────

  socket.on('disconnect', async () => {
    console.log(`[disconnect] ${socket.id}`);
    const result = await gm.handleDisconnect(socket.id);
    if (result) {
      socket.to(result.roomCode).emit('player_left', {
        socketId: socket.id,
        newHostId: result.room.hostId,
      });
    }
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────

function getLanIp() {
  for (const iface of Object.values(networkInterfaces()).flat()) {
    if (iface.family === 'IPv4' && !iface.internal) return iface.address;
  }
  return 'localhost';
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('\n  Family Word Game is running!');
  console.log(`\n  Local:   http://localhost:${PORT}`);
  console.log(`  Network: http://${getLanIp()}:${PORT}  ← open this on iPads\n`);
});
