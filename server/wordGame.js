// Core word game logic: placement validation, scoring, move application.
const db = require('./db');
const { PREMIUM_SQUARES } = require('./boardLayout');
const { TILE_VALUES, buildBag, drawTiles, scoreWord, shuffleBag } = require('./tileSystem');
const { isValid } = require('./wordList');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Look up a cell from either the live board or the pending placement map.
 * Returns { letter, value } or null.
 */
function getCell(r, c, board, pendingMap) {
  const key = `${r},${c}`;
  if (pendingMap && pendingMap.has(key)) return pendingMap.get(key);
  return board[key] || null;
}

/**
 * Collect all cells of the word that passes through (row, col) in direction dir.
 * Returns an array of { row, col, letter, value, isNew }.
 */
function getWordAt(row, col, dir, board, pendingMap) {
  let r = row, c = col;
  // Walk to start of word
  if (dir === 'H') { while (c > 0 && getCell(r, c - 1, board, pendingMap)) c--; }
  else             { while (r > 0 && getCell(r - 1, c, board, pendingMap)) r--; }

  const cells = [];
  while (r >= 0 && r <= 14 && c >= 0 && c <= 14) {
    const cell = getCell(r, c, board, pendingMap);
    if (!cell) break;
    cells.push({ row: r, col: c, letter: cell.letter, value: cell.value, isNew: pendingMap.has(`${r},${c}`) });
    if (dir === 'H') c++; else r++;
  }
  return cells;
}

function getScores(room) {
  return Object.values(room.players).map(p => ({
    socketId: p.socketId,
    name: p.name,
    score: p.score,
  }));
}

function advanceTurn(game, room) {
  const n = game.turnOrder.length;
  let skips = 0;
  do {
    game.currentTurnIndex = (game.currentTurnIndex + 1) % n;
    skips++;
  } while (
    skips < n &&
    room.players[game.turnOrder[game.currentTurnIndex]]?.status === 'disconnected'
  );
}

// ─── Start Game ───────────────────────────────────────────────────────────────

async function startWordGame(room) {
  const playerSids = Object.keys(room.players);
  if (playerSids.length < 2) throw new Error('Need at least 2 players');

  // Randomise turn order
  const turnOrder = [...playerSids].sort(() => Math.random() - 0.5);

  // Build & deal tiles
  const bag = buildBag();
  for (const sid of turnOrder) {
    const player = room.players[sid];
    player.rack = drawTiles(bag, 7);
    player.score = 0;
    player.turnPosition = turnOrder.indexOf(sid);
  }

  // Persist game record
  const [result] = await db.execute(
    `INSERT INTO games (room_code, status, current_turn, tile_bag, board_state)
     VALUES (?, 'active', 0, ?, '{}')`,
    [room.roomCode, JSON.stringify(bag)]
  );
  const gameId = result.insertId;

  for (const sid of turnOrder) {
    const p = room.players[sid];
    await db.execute(
      `INSERT INTO game_players (game_id, player_id, turn_position, tile_rack, score)
       VALUES (?, ?, ?, ?, 0)`,
      [gameId, p.id, p.turnPosition, JSON.stringify(p.rack)]
    );
  }

  await db.execute(`UPDATE rooms SET status='playing' WHERE room_code=?`, [room.roomCode]);

  room.status = 'playing';
  room.game = {
    gameId,
    turnOrder,
    currentTurnIndex: 0,
    moveNumber: 0,
    board: {},
    bag,
    consecutivePasses: 0,
  };

  return room;
}

// ─── Validate Placement ───────────────────────────────────────────────────────

/**
 * Validates tile placements and collects all words formed.
 * Returns { valid, error?, words?, direction? }
 * Each word is an array of cell objects { row, col, letter, value, isNew }.
 */
function validatePlacement(placements, board) {
  if (!placements || placements.length === 0)
    return { valid: false, error: 'No tiles placed' };

  const isFirstMove = Object.keys(board).length === 0;

  // Basic checks: bounds, duplicates, overlaps, valid letters
  const posSet = new Set();
  for (const p of placements) {
    const key = `${p.row},${p.col}`;
    if (posSet.has(key))     return { valid: false, error: 'Duplicate tile positions' };
    posSet.add(key);
    if (p.row < 0 || p.row > 14 || p.col < 0 || p.col > 14)
                             return { valid: false, error: 'Tile out of bounds' };
    if (board[key])          return { valid: false, error: 'That cell is already occupied' };
    if (!TILE_VALUES[p.letter])
                             return { valid: false, error: `Invalid letter: ${p.letter}` };
  }

  // Build pending map
  const pendingMap = new Map(
    placements.map(p => [`${p.row},${p.col}`, { letter: p.letter, value: TILE_VALUES[p.letter] }])
  );

  // Determine direction
  const rows = [...new Set(placements.map(p => p.row))];
  const cols = [...new Set(placements.map(p => p.col))];
  let direction = null; // null = single tile
  if (placements.length > 1) {
    if (rows.length === 1)      direction = 'H';
    else if (cols.length === 1) direction = 'V';
    else return { valid: false, error: 'Tiles must all be in the same row or column' };
  }

  // Gap check for multi-tile placements
  if (direction === 'H') {
    const row = rows[0];
    const minC = Math.min(...placements.map(p => p.col));
    const maxC = Math.max(...placements.map(p => p.col));
    for (let c = minC; c <= maxC; c++) {
      if (!getCell(row, c, board, pendingMap))
        return { valid: false, error: 'No gaps allowed between tiles' };
    }
  } else if (direction === 'V') {
    const col = cols[0];
    const minR = Math.min(...placements.map(p => p.row));
    const maxR = Math.max(...placements.map(p => p.row));
    for (let r = minR; r <= maxR; r++) {
      if (!getCell(r, col, board, pendingMap))
        return { valid: false, error: 'No gaps allowed between tiles' };
    }
  }

  // First-move: must cover center (7,7)
  if (isFirstMove) {
    if (!pendingMap.has('7,7'))
      return { valid: false, error: 'First word must cover the center square ★' };
  } else {
    // Must touch at least one existing board tile
    let touches = false;
    outer: for (const p of placements) {
      for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        if (board[`${p.row + dr},${p.col + dc}`]) { touches = true; break outer; }
      }
    }
    if (!touches)
      return { valid: false, error: 'Word must connect to existing tiles on the board' };
  }

  // Collect all words formed
  const wordsFormed = [];

  // Horizontal word (main word for H, or try for single tile)
  if (direction !== 'V') {
    const hWord = getWordAt(placements[0].row, placements[0].col, 'H', board, pendingMap);
    if (hWord.length >= 2) wordsFormed.push(hWord);
    else if (direction === 'H') return { valid: false, error: 'Word must be at least 2 letters' };
  }

  // Vertical word (main word for V, or try for single tile)
  if (direction !== 'H') {
    const vWord = getWordAt(placements[0].row, placements[0].col, 'V', board, pendingMap);
    if (vWord.length >= 2) wordsFormed.push(vWord);
    else if (direction === 'V') return { valid: false, error: 'Word must be at least 2 letters' };
  }

  // Cross-words for each new tile in multi-tile placements
  if (direction === 'H') {
    for (const p of placements) {
      const cross = getWordAt(p.row, p.col, 'V', board, pendingMap);
      if (cross.length >= 2) wordsFormed.push(cross);
    }
  } else if (direction === 'V') {
    for (const p of placements) {
      const cross = getWordAt(p.row, p.col, 'H', board, pendingMap);
      if (cross.length >= 2) wordsFormed.push(cross);
    }
  }

  if (wordsFormed.length === 0)
    return { valid: false, error: 'Must form at least one word of 2+ letters' };

  return { valid: true, words: wordsFormed, direction: direction || 'H' };
}

// ─── Apply Move ───────────────────────────────────────────────────────────────

async function applyMove(room, socketId, placements) {
  const game = room.game;
  const player = room.players[socketId];

  if (!player) return { success: false, reason: 'Player not found' };
  if (game.turnOrder[game.currentTurnIndex] !== socketId)
    return { success: false, reason: "It's not your turn yet!" };

  // Check rack has all required letters
  const rackCopy = [...player.rack];
  for (const p of placements) {
    const idx = rackCopy.indexOf(p.letter);
    if (idx === -1) return { success: false, reason: `You don't have the letter ${p.letter}` };
    rackCopy.splice(idx, 1);
  }

  // Validate placement geometry
  const validation = validatePlacement(placements, game.board);
  if (!validation.valid) return { success: false, reason: validation.error };

  // Build pending map for scoring
  const pendingMap = new Map(
    placements.map(p => [`${p.row},${p.col}`, { letter: p.letter, value: TILE_VALUES[p.letter] }])
  );

  // Validate all words
  const invalidWords = [];
  for (const wordCells of validation.words) {
    const word = wordCells.map(c => c.letter).join('');
    if (!isValid(word)) invalidWords.push(word);
  }
  if (invalidWords.length > 0)
    return { success: false, reason: "That word isn't in our word list — try again!", invalidWords };

  // Score
  let totalScore = 0;
  for (const wordCells of validation.words) {
    totalScore += scoreWord(wordCells, PREMIUM_SQUARES);
  }
  if (placements.length === 7) totalScore += 50; // bingo bonus

  // Apply tiles to board
  for (const p of placements) {
    game.board[`${p.row},${p.col}`] = { letter: p.letter, value: TILE_VALUES[p.letter], placedBy: socketId };
  }

  // Refill rack
  player.rack = rackCopy;
  const drawn = drawTiles(game.bag, 7 - player.rack.length);
  player.rack.push(...drawn);
  player.score += totalScore;
  game.consecutivePasses = 0;
  game.moveNumber++;

  // Persist
  try {
    await db.execute(
      `INSERT INTO moves (game_id, player_id, move_type, placements, words_formed, score, move_number)
       VALUES (?, ?, 'play', ?, ?, ?, ?)`,
      [game.gameId, player.id,
       JSON.stringify(placements),
       JSON.stringify(validation.words.map(w => w.map(c => c.letter).join(''))),
       totalScore, game.moveNumber]
    );
    await db.execute(
      `UPDATE games SET board_state=?, tile_bag=?, current_turn=? WHERE id=?`,
      [JSON.stringify(game.board), JSON.stringify(game.bag), game.moveNumber, game.gameId]
    );
    await db.execute(
      `UPDATE game_players SET tile_rack=?, score=? WHERE game_id=? AND player_id=?`,
      [JSON.stringify(player.rack), player.score, game.gameId, player.id]
    );
  } catch (e) { console.error('[applyMove] DB error:', e.message); }

  // Check game-over (bag empty and current player rack empty)
  const gameOver = game.bag.length === 0 && player.rack.length === 0;

  // Advance turn
  advanceTurn(game, room);

  return {
    success: true,
    board: game.board,
    scores: getScores(room),
    bagCount: game.bag.length,
    currentTurnSocketId: game.turnOrder[game.currentTurnIndex],
    wordsFormed: validation.words.map(w => w.map(c => c.letter).join('')),
    moveScore: totalScore,
    bySocketId: socketId,
    newRack: player.rack,
    gameOver,
  };
}

// ─── Apply Pass ───────────────────────────────────────────────────────────────

async function applyPass(room, socketId) {
  const game = room.game;
  const player = room.players[socketId];

  if (!player) return { success: false, reason: 'Player not found' };
  if (game.turnOrder[game.currentTurnIndex] !== socketId)
    return { success: false, reason: "It's not your turn yet!" };

  game.consecutivePasses++;
  game.moveNumber++;

  try {
    await db.execute(
      `INSERT INTO moves (game_id, player_id, move_type, score, move_number) VALUES (?, ?, 'pass', 0, ?)`,
      [game.gameId, player.id, game.moveNumber]
    );
  } catch (e) { console.error('[applyPass] DB error:', e.message); }

  const gameOver = game.consecutivePasses >= game.turnOrder.length * 2;
  advanceTurn(game, room);

  return {
    success: true,
    currentTurnSocketId: game.turnOrder[game.currentTurnIndex],
    consecutivePasses: game.consecutivePasses,
    gameOver,
  };
}

// ─── Apply Exchange ───────────────────────────────────────────────────────────

async function applyExchange(room, socketId, letters) {
  const game = room.game;
  const player = room.players[socketId];

  if (!player) return { success: false, reason: 'Player not found' };
  if (game.turnOrder[game.currentTurnIndex] !== socketId)
    return { success: false, reason: "It's not your turn yet!" };
  if (game.bag.length < 7)
    return { success: false, reason: 'Not enough tiles in the bag to exchange (need at least 7)' };
  if (!letters || letters.length === 0)
    return { success: false, reason: 'Select at least one tile to exchange' };

  // Validate letters are in rack
  const rackCopy = [...player.rack];
  for (const letter of letters) {
    const idx = rackCopy.indexOf(letter);
    if (idx === -1) return { success: false, reason: `You don't have the letter ${letter}` };
    rackCopy.splice(idx, 1);
  }

  // Draw replacement tiles first, then return old tiles to bag
  const drawn = drawTiles(game.bag, letters.length);
  rackCopy.push(...drawn);
  game.bag.push(...letters);
  shuffleBag(game.bag);

  player.rack = rackCopy;
  game.consecutivePasses++;
  game.moveNumber++;

  try {
    await db.execute(
      `INSERT INTO moves (game_id, player_id, move_type, score, move_number) VALUES (?, ?, 'exchange', 0, ?)`,
      [game.gameId, player.id, game.moveNumber]
    );
    await db.execute(
      `UPDATE game_players SET tile_rack=? WHERE game_id=? AND player_id=?`,
      [JSON.stringify(player.rack), game.gameId, player.id]
    );
    await db.execute(
      `UPDATE games SET tile_bag=?, current_turn=? WHERE id=?`,
      [JSON.stringify(game.bag), game.moveNumber, game.gameId]
    );
  } catch (e) { console.error('[applyExchange] DB error:', e.message); }

  advanceTurn(game, room);

  return {
    success: true,
    currentTurnSocketId: game.turnOrder[game.currentTurnIndex],
    bagCount: game.bag.length,
    newRack: player.rack,
  };
}

// ─── Finalize Game ────────────────────────────────────────────────────────────

async function finalizeGame(room) {
  const game = room.game;

  // Subtract remaining rack tile values from each player
  for (const player of Object.values(room.players)) {
    const rackValue = player.rack.reduce((sum, l) => sum + (TILE_VALUES[l] || 0), 0);
    player.score -= rackValue;
  }

  room.status = 'complete';

  try {
    await db.execute(`UPDATE games SET status='complete', ended_at=NOW() WHERE id=?`, [game.gameId]);
    await db.execute(`UPDATE rooms SET status='complete' WHERE room_code=?`, [room.roomCode]);
    for (const player of Object.values(room.players)) {
      await db.execute(
        `UPDATE game_players SET score=? WHERE game_id=? AND player_id=?`,
        [player.score, game.gameId, player.id]
      );
    }
  } catch (e) { console.error('[finalizeGame] DB error:', e.message); }

  return getScores(room);
}

module.exports = {
  startWordGame,
  validatePlacement,
  applyMove,
  applyPass,
  applyExchange,
  finalizeGame,
  getScores,
};
