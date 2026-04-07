require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { networkInterfaces } = require('os');

const gm = require('./gameManager');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Serve built React app
const distPath = path.join(__dirname, '../client/dist');
app.use(express.static(distPath));
app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));

// ─── Socket Events ───────────────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`[connect] ${socket.id}`);

  // Create Room
  socket.on('create_room', async ({ name, age, totalRounds } = {}) => {
    try {
      const room = await gm.createRoom(socket.id, name, age, { totalRounds });
      socket.join(room.roomCode);
      socket.emit('room_created', {
        roomCode: room.roomCode,
        players: gm.getPlayerList(room),
        totalRounds: room.totalRounds,
      });
    } catch (err) {
      socket.emit('error', { code: 'CREATE_FAILED', message: err.message });
    }
  });

  // Join Room
  socket.on('join_room', async ({ roomCode, name, age } = {}) => {
    try {
      const { room, player } = await gm.joinRoom(roomCode.toUpperCase(), socket.id, name, age);
      socket.join(roomCode.toUpperCase());
      socket.emit('room_joined', {
        roomCode: room.roomCode,
        players: gm.getPlayerList(room),
        totalRounds: room.totalRounds,
        isHost: false,
      });
      socket.to(room.roomCode).emit('player_joined', {
        player: { socketId: player.socketId, name: player.name, age: player.age, tier: player.tier, role: player.role, status: player.status, score: 0 },
      });
    } catch (err) {
      socket.emit('error', { code: 'JOIN_FAILED', message: err.message });
    }
  });

  // Start Game (host only)
  socket.on('start_game', async ({ roomCode } = {}) => {
    try {
      const { room, roundState, puzzleAssignments, fragmentAssignments } = await gm.startGame(roomCode);

      io.to(roomCode).emit('game_started', {
        roundIndex: roundState.roundIndex,
        theme: roundState.theme,
        totalRounds: room.totalRounds,
      });

      // Send each player their puzzle (fragment revealed only after solve)
      for (const [socketId, puzzle] of Object.entries(puzzleAssignments)) {
        io.to(socketId).emit('puzzle_assigned', { puzzle: sanitizePuzzle(puzzle) });
      }
    } catch (err) {
      socket.emit('error', { code: 'START_FAILED', message: err.message });
    }
  });

  // Submit Answer
  socket.on('submit_answer', async ({ roomCode, answer } = {}) => {
    try {
      const result = await gm.submitAnswer(roomCode, socket.id, answer);
      if (!result.correct) {
        socket.emit('answer_result', { correct: false });
        return;
      }

      socket.emit('answer_result', { correct: true });
      socket.emit('fragment_revealed', { fragment: result.fragment });

      io.to(roomCode).emit('puzzle_solved', {
        socketId: socket.id,
        solvedCount: result.solvedCount,
        totalPlayers: result.totalPlayers,
      });

      if (result.allSolved) {
        io.to(roomCode).emit('final_puzzle_ready', {
          prompt: result.finalPuzzle.prompt,
        });
      }
    } catch (err) {
      socket.emit('error', { code: 'SUBMIT_FAILED', message: err.message });
    }
  });

  // Live-sync final answer typing
  socket.on('final_answer_typing', ({ roomCode, partialAnswer } = {}) => {
    socket.to(roomCode).emit('final_answer_update', { partialAnswer, by: socket.id });
  });

  // Submit Final Answer
  socket.on('submit_final', async ({ roomCode, answer } = {}) => {
    try {
      const result = await gm.submitFinal(roomCode, socket.id, answer);
      if (!result.correct) {
        socket.emit('final_answer_result', { correct: false });
        return;
      }

      io.to(roomCode).emit('round_complete', {
        scores: result.scores,
        gameOver: result.gameOver,
        nextRound: result.nextRound,
      });
    } catch (err) {
      socket.emit('error', { code: 'FINAL_FAILED', message: err.message });
    }
  });

  // Advance to next round
  socket.on('next_round', async ({ roomCode } = {}) => {
    try {
      const room = gm.getRoom(roomCode);
      if (!room || room.hostId !== socket.id) return;

      const { roundState, puzzleAssignments } = await gm.nextRound(roomCode);

      io.to(roomCode).emit('game_started', {
        roundIndex: roundState.roundIndex,
        theme: roundState.theme,
        totalRounds: room.totalRounds,
      });

      for (const [socketId, puzzle] of Object.entries(puzzleAssignments)) {
        io.to(socketId).emit('puzzle_assigned', { puzzle: sanitizePuzzle(puzzle) });
      }
    } catch (err) {
      socket.emit('error', { code: 'NEXT_ROUND_FAILED', message: err.message });
    }
  });

  // Request Hint
  socket.on('request_hint', ({ roomCode } = {}) => {
    try {
      const result = gm.requestHint(roomCode, socket.id);
      socket.emit('hint_sent', result);
    } catch (err) {
      socket.emit('error', { code: 'HINT_FAILED', message: err.message });
    }
  });

  // Skip Player (host only)
  socket.on('skip_player', async ({ roomCode, targetSocketId } = {}) => {
    try {
      const result = await gm.skipPlayer(roomCode, socket.id, targetSocketId);
      if (!result) return;

      io.to(targetSocketId).emit('fragment_revealed', { fragment: result.fragment, skipped: true });
      io.to(roomCode).emit('puzzle_solved', {
        socketId: targetSocketId,
        solvedCount: result.solvedCount,
        totalPlayers: result.totalPlayers,
      });

      if (result.allSolved) {
        const room = gm.getRoom(roomCode);
        const roundState = room.rounds[room.currentRound - 1] || room.rounds[room.currentRound];
        io.to(roomCode).emit('final_puzzle_ready', {
          prompt: roundState.fragmentSet.prompt,
        });
      }
    } catch (err) {
      socket.emit('error', { code: 'SKIP_FAILED', message: err.message });
    }
  });

  // Disconnect
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sanitizePuzzle(puzzle) {
  const { id, type, subject, prompt, options, hint, estimatedSeconds } = puzzle;
  return { id, type, subject, prompt, options, hint, estimatedSeconds };
}

// ─── Start Server ─────────────────────────────────────────────────────────────

function getLanIp() {
  for (const iface of Object.values(networkInterfaces()).flat()) {
    if (iface.family === 'IPv4' && !iface.internal) return iface.address;
  }
  return 'localhost';
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  const lanIp = getLanIp();
  console.log('\n  Family Escape Rooms is running!');
  console.log(`\n  Local:   http://localhost:${PORT}`);
  console.log(`  Network: http://${lanIp}:${PORT}  ← open this on iPads\n`);
});
