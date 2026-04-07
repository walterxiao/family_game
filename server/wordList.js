// Loads words.txt into a Set for O(1) lookups.
const fs = require('fs');
const path = require('path');

let WORD_SET;

try {
  const raw = fs.readFileSync(path.join(__dirname, 'data', 'words.txt'), 'utf8');
  WORD_SET = new Set(
    raw.split('\n')
       .map(w => w.trim().toLowerCase())
       .filter(w => w.length >= 2)
  );
  console.log(`[wordList] Loaded ${WORD_SET.size} words`);
} catch (err) {
  console.error('[wordList] Could not load words.txt — using empty set', err.message);
  WORD_SET = new Set();
}

function isValid(word) {
  return WORD_SET.has(word.toLowerCase());
}

module.exports = { WORD_SET, isValid };
