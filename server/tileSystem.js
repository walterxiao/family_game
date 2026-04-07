// Tile system: standard Scrabble letter distribution (98 tiles, no blanks).

const TILE_VALUES = {
  A:1, B:3, C:3, D:2, E:1, F:4, G:2, H:4,
  I:1, J:8, K:5, L:1, M:3, N:1, O:1, P:3,
  Q:10, R:1, S:1, T:1, U:1, V:4, W:4, X:8,
  Y:4, Z:10,
};

// Standard Scrabble distribution (total 98 tiles)
const DISTRIBUTION = {
  A:9, B:2, C:2, D:4, E:12, F:2, G:3, H:2,
  I:9, J:1, K:1, L:4, M:2, N:6, O:8, P:2,
  Q:1, R:6, S:4, T:6, U:4, V:2, W:2, X:1,
  Y:2, Z:1,
};

function buildBag() {
  const bag = [];
  for (const [letter, count] of Object.entries(DISTRIBUTION)) {
    for (let i = 0; i < count; i++) bag.push(letter);
  }
  // Fisher-Yates shuffle
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

/** Draw up to n tiles from bag (modifies bag in-place). */
function drawTiles(bag, n) {
  const drawn = [];
  for (let i = 0; i < n && bag.length > 0; i++) {
    drawn.push(bag.pop());
  }
  return drawn;
}

/** Score a single word given its cells, applying premium squares for NEW tiles only. */
function scoreWord(cells, PREMIUM_SQUARES) {
  let wordScore = 0;
  let wordMultiplier = 1;

  for (const cell of cells) {
    const key = `${cell.row},${cell.col}`;
    const premium = cell.isNew ? PREMIUM_SQUARES[key] : null;

    let letterScore = cell.value;
    if (premium === 'DL') letterScore *= 2;
    else if (premium === 'TL') letterScore *= 3;

    if (premium === 'DW' || premium === 'star') wordMultiplier *= 2;
    else if (premium === 'TW') wordMultiplier *= 3;

    wordScore += letterScore;
  }
  return wordScore * wordMultiplier;
}

function shuffleBag(bag) {
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
}

module.exports = { TILE_VALUES, DISTRIBUTION, buildBag, drawTiles, scoreWord, shuffleBag };
