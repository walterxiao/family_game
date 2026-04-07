const math = {
  1: require('./math/tier1'),
  2: require('./math/tier2'),
  3: require('./math/tier3'),
};

const language = {
  1: require('./language/tier1'),
  2: require('./language/tier2'),
  3: require('./language/tier3'),
};

module.exports = { math, language };
