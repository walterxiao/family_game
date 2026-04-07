// Standard 15×15 Scrabble-style premium square map.
// Key: "row,col"  Value: 'TW' | 'DW' | 'TL' | 'DL' | 'star'
// Row/col are 0-indexed.  Center star (7,7) counts as DW.

const PREMIUM_SQUARES = {};

// Triple Word (TW) — 8 squares
for (const [r, c] of [
  [0,0],[0,7],[0,14],
  [7,0],[7,14],
  [14,0],[14,7],[14,14],
]) PREMIUM_SQUARES[`${r},${c}`] = 'TW';

// Double Word (DW) — 16 squares + center star
for (const [r, c] of [
  [1,1],[1,13],[2,2],[2,12],[3,3],[3,11],
  [4,4],[4,10],[10,4],[10,10],
  [11,3],[11,11],[12,2],[12,12],[13,1],[13,13],
]) PREMIUM_SQUARES[`${r},${c}`] = 'DW';

// Center / star — also a DW
PREMIUM_SQUARES['7,7'] = 'star';

// Triple Letter (TL) — 12 squares
for (const [r, c] of [
  [1,5],[1,9],
  [5,1],[5,5],[5,9],[5,13],
  [9,1],[9,5],[9,9],[9,13],
  [13,5],[13,9],
]) PREMIUM_SQUARES[`${r},${c}`] = 'TL';

// Double Letter (DL) — 24 squares
for (const [r, c] of [
  [0,3],[0,11],
  [2,6],[2,8],
  [3,0],[3,7],[3,14],
  [6,2],[6,6],[6,8],[6,12],
  [7,3],[7,11],
  [8,2],[8,6],[8,8],[8,12],
  [11,0],[11,7],[11,14],
  [12,6],[12,8],
  [14,3],[14,11],
]) PREMIUM_SQUARES[`${r},${c}`] = 'DL';

module.exports = { PREMIUM_SQUARES };
