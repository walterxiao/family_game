const puzzles = require('./puzzles/index');
const finals = require('./puzzles/finals');

function getTier(age) {
  if (age <= 8) return 1;
  if (age <= 12) return 2;
  return 3;
}

// Assign one puzzle per player, alternating math/language across players
function selectPuzzles(players, theme, usedPuzzleIds) {
  const assignments = {};
  const subjects = ['math', 'language'];
  const playerList = Object.values(players);

  playerList.forEach((player, i) => {
    const subject = subjects[i % 2];
    const tier = player.tier;
    const pool = (puzzles[subject][tier] || []).filter(
      (p) => !usedPuzzleIds.has(p.id) && (!p.themes || p.themes.includes(theme))
    );
    const fallbackPool = (puzzles[subject][tier] || []).filter(
      (p) => !usedPuzzleIds.has(p.id)
    );
    const available = pool.length > 0 ? pool : fallbackPool;
    if (available.length === 0) {
      throw new Error(`No puzzles available for tier ${tier} ${subject}`);
    }
    const picked = available[Math.floor(Math.random() * available.length)];
    assignments[player.socketId] = picked;
    usedPuzzleIds.add(picked.id);
  });

  return assignments;
}

// Pick a fragment set for this round's theme
function selectFragmentSet(theme, usedSetIds) {
  const themeSets = finals[theme] || finals['space'];
  const available = themeSets.filter((s) => !usedSetIds.has(s.id));
  const pool = available.length > 0 ? available : themeSets;
  return pool[Math.floor(Math.random() * pool.length)];
}

// Assign one fragment per player from the set
function assignFragments(fragmentSet, playerSocketIds) {
  const shuffled = [...fragmentSet.fragments].sort(() => Math.random() - 0.5);
  const assignments = {};
  playerSocketIds.forEach((socketId, i) => {
    assignments[socketId] = shuffled[i % shuffled.length];
  });
  return assignments;
}

function validateAnswer(puzzle, answer) {
  const normalized = answer.toLowerCase().trim().replace(/\s+/g, '');
  return normalized === puzzle.normalizedAnswer;
}

function validateFinalAnswer(normalizedAnswer, submission) {
  const normalized = submission.toLowerCase().trim().replace(/\s+/g, '');
  return normalized === normalizedAnswer;
}

const THEMES = ['space', 'jungle', 'ocean', 'castle'];

function pickTheme(roundIndex) {
  return THEMES[roundIndex % THEMES.length];
}

module.exports = {
  getTier,
  selectPuzzles,
  selectFragmentSet,
  assignFragments,
  validateAnswer,
  validateFinalAnswer,
  pickTheme,
  THEMES,
};
