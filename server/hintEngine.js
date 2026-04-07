// Hint engine: find a playable word for the current player.
// Strategy: scan WORD_SET for words that fit near anchor cells using rack letters.

const { WORD_SET } = require('./wordList');
const { TILE_VALUES } = require('./tileSystem');

/** Return all empty cells adjacent to existing board tiles (anchor cells). */
function getAnchors(board) {
  const anchors = new Set();
  for (const key of Object.keys(board)) {
    const [r, c] = key.split(',').map(Number);
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr <= 14 && nc >= 0 && nc <= 14 && !board[`${nr},${nc}`]) {
        anchors.add(`${nr},${nc}`);
      }
    }
  }
  return [...anchors].map(k => {
    const [row, col] = k.split(',').map(Number);
    return { row, col };
  });
}

/** Check if all uppercase letters in `word` can be formed from rack (array). */
function canMakeWord(word, rack) {
  const pool = [...rack];
  for (const letter of word) {
    const idx = pool.indexOf(letter);
    if (idx === -1) return false;
    pool.splice(idx, 1);
  }
  return true;
}

/** Get prefix string from existing board tiles before (r,c) in direction dir. */
function getPrefix(row, col, dir, board) {
  let prefix = '';
  if (dir === 'H') {
    let c = col - 1;
    while (c >= 0 && board[`${row},${c}`]) { prefix = board[`${row},${c}`].letter + prefix; c--; }
  } else {
    let r = row - 1;
    while (r >= 0 && board[`${r},${col}`]) { prefix = board[`${r},${col}`].letter + prefix; r--; }
  }
  return prefix;
}

/** Get suffix string from existing board tiles after (r,c) in direction dir. */
function getSuffix(row, col, dir, board) {
  let suffix = '';
  if (dir === 'H') {
    let c = col + 1;
    while (c <= 14 && board[`${row},${c}`]) { suffix += board[`${row},${c}`].letter; c++; }
  } else {
    let r = row + 1;
    while (r <= 14 && board[`${r},${col}`]) { suffix += board[`${r},${col}`].letter; r++; }
  }
  return suffix;
}

/**
 * Try to find a playable word through the anchor cell in the given direction.
 * Returns { word, placements } or null.
 */
function tryAnchor(anchorRow, anchorCol, dir, rack, board) {
  // Anchor must be empty
  if (board[`${anchorRow},${anchorCol}`]) return null;

  const prefix = getPrefix(anchorRow, anchorCol, dir, board);
  const suffix = getSuffix(anchorRow, anchorCol, dir, board);
  const prefixU = prefix.toUpperCase();
  const suffixU = suffix.toUpperCase();

  for (const word of WORD_SET) {
    if (word.length < 2) continue;
    const w = word.toUpperCase();

    // Word must start with prefix and end with suffix
    if (!w.startsWith(prefixU)) continue;
    if (suffixU && !w.endsWith(suffixU)) continue;

    // Middle letters (between prefix and suffix positions) must come from rack
    const middleStart = prefix.length;
    const middleEnd = suffixU ? w.length - suffix.length : w.length;
    if (middleEnd <= middleStart) continue;
    const middle = w.slice(middleStart, middleEnd);
    if (!canMakeWord(middle, rack)) continue;

    // Build placements
    const startCol = dir === 'H' ? anchorCol - prefix.length : anchorCol;
    const startRow = dir === 'V' ? anchorRow - prefix.length : anchorRow;

    // Check the word fits on the board
    const endCol = dir === 'H' ? startCol + w.length - 1 : anchorCol;
    const endRow = dir === 'V' ? startRow + w.length - 1 : anchorRow;
    if (endCol > 14 || endRow > 14 || startCol < 0 || startRow < 0) continue;

    // Check no conflict with existing tiles
    let conflict = false;
    for (let i = 0; i < w.length; i++) {
      const r = dir === 'H' ? anchorRow : startRow + i;
      const c = dir === 'H' ? startCol + i : anchorCol;
      const existing = board[`${r},${c}`];
      if (existing && existing.letter !== w[i]) { conflict = true; break; }
    }
    if (conflict) continue;

    // Build placement list (only new cells)
    const placements = [];
    let rackCopy = [...rack];
    for (let i = 0; i < w.length; i++) {
      const r = dir === 'H' ? anchorRow : startRow + i;
      const c = dir === 'H' ? startCol + i : anchorCol;
      if (!board[`${r},${c}`]) {
        const li = rackCopy.indexOf(w[i]);
        if (li === -1) { conflict = true; break; }
        rackCopy.splice(li, 1);
        placements.push({ row: r, col: c, letter: w[i] });
      }
    }
    if (conflict || placements.length === 0) continue;

    return { word: w, placements };
  }

  return null;
}

/**
 * Try to place any word from rack crossing the center on an empty board.
 */
function firstWordHint(rack) {
  for (const word of WORD_SET) {
    if (word.length < 2 || word.length > rack.length) continue;
    const w = word.toUpperCase();
    if (!canMakeWord(w, rack)) continue;

    const startCol = 7 - Math.floor(w.length / 2);
    if (startCol < 0) continue;
    const placements = [];
    const rackCopy = [...rack];
    for (let i = 0; i < w.length; i++) {
      const li = rackCopy.indexOf(w[i]);
      rackCopy.splice(li, 1);
      placements.push({ row: 7, col: startCol + i, letter: w[i] });
    }
    return { word: w, placements };
  }
  return null;
}

/**
 * Main entry point.
 * @param {string[]} rack  Array of uppercase letters.
 * @param {Object}   board Sparse board map.
 * @returns {{ word: string, placements: {row,col,letter}[] } | null}
 */
function findHint(rack, board) {
  if (Object.keys(board).length === 0) return firstWordHint(rack);

  const anchors = getAnchors(board);
  // Shuffle anchors so hints vary
  anchors.sort(() => Math.random() - 0.5);

  for (const anchor of anchors) {
    const hint = tryAnchor(anchor.row, anchor.col, 'H', rack, board)
              || tryAnchor(anchor.row, anchor.col, 'V', rack, board);
    if (hint) return hint;
  }
  return null;
}

module.exports = { findHint };
