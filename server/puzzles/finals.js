// Final puzzle fragment sets, keyed by theme.
// Each set has: id, fragments (one per player slot), prompt, and the answer.
// The server assigns one fragment per player; kids share them verbally,
// then all submit the combined final answer together.

module.exports = {
  space: [
    {
      id: 'space-final-001',
      fragments: ['ALPHA', 'BRAVO', 'DELTA', 'ECHO'],
      prompt: 'The launch code is your four NATO code words, in alphabetical order, separated by spaces.',
      answer: 'ALPHA BRAVO DELTA ECHO',
      normalizedAnswer: 'alphabravadeltaecho',
    },
    {
      id: 'space-final-002',
      fragments: ['3', '7', '2', '5'],
      prompt: 'The fuel calculation: add all four of your numbers together. What is the total?',
      answer: '17',
      normalizedAnswer: '17',
    },
    {
      id: 'space-final-003',
      fragments: ['RED', 'BLUE', 'GOLD', 'GREEN'],
      prompt: 'Enter the four crew uniform colours in alphabetical order, separated by spaces.',
      answer: 'BLUE GOLD GREEN RED',
      normalizedAnswer: 'bluegoldgreenred',
    },
    {
      id: 'space-final-004',
      fragments: ['4', '6', '2', '8'],
      prompt: 'Multiply all four of your numbers together. What is the product?',
      answer: '384',
      normalizedAnswer: '384',
    },
  ],

  jungle: [
    {
      id: 'jungle-final-001',
      fragments: ['TIGER', 'EAGLE', 'SNAKE', 'JAGUAR'],
      prompt: 'The temple password is your four animals in alphabetical order, separated by spaces.',
      answer: 'EAGLE JAGUAR SNAKE TIGER',
      normalizedAnswer: 'eaglejaguarsnaketiger',
    },
    {
      id: 'jungle-final-002',
      fragments: ['9', '4', '6', '3'],
      prompt: 'The ancient door code: add all four numbers, then subtract 2. What do you get?',
      answer: '20',
      normalizedAnswer: '20',
    },
    {
      id: 'jungle-final-003',
      fragments: ['NORTH', 'SOUTH', 'EAST', 'WEST'],
      prompt: 'The compass sequence to open the vault: enter all four directions in alphabetical order, separated by spaces.',
      answer: 'EAST NORTH SOUTH WEST',
      normalizedAnswer: 'eastnorthsouthwest',
    },
    {
      id: 'jungle-final-004',
      fragments: ['5', '3', '8', '2'],
      prompt: 'Multiply the two largest numbers, then subtract the two smallest. What is the result?',
      answer: '35',
      normalizedAnswer: '35',
    },
  ],

  ocean: [
    {
      id: 'ocean-final-001',
      fragments: ['SHARK', 'WHALE', 'CORAL', 'PEARL'],
      prompt: 'The submarine code: your four ocean words in alphabetical order, separated by spaces.',
      answer: 'CORAL PEARL SHARK WHALE',
      normalizedAnswer: 'coralpearlsharkwhale',
    },
    {
      id: 'ocean-final-002',
      fragments: ['8', '3', '5', '4'],
      prompt: 'The depth gauge: add all four numbers together. What is the total depth?',
      answer: '20',
      normalizedAnswer: '20',
    },
    {
      id: 'ocean-final-003',
      fragments: ['ANCHOR', 'BUOY', 'REEF', 'TIDE'],
      prompt: 'The captain\'s log code: your four nautical words in alphabetical order, separated by spaces.',
      answer: 'ANCHOR BUOY REEF TIDE',
      normalizedAnswer: 'anchorbuoyreeftide',
    },
    {
      id: 'ocean-final-004',
      fragments: ['6', '7', '2', '5'],
      prompt: 'The treasure grid coordinate: multiply the two largest numbers, then add the two smallest. What is it?',
      answer: '49',
      normalizedAnswer: '49',
    },
  ],

  castle: [
    {
      id: 'castle-final-001',
      fragments: ['CROWN', 'SWORD', 'SHIELD', 'TOWER'],
      prompt: 'The royal password: your four castle words in alphabetical order, separated by spaces.',
      answer: 'CROWN SHIELD SWORD TOWER',
      normalizedAnswer: 'crownshieldswordtower',
    },
    {
      id: 'castle-final-002',
      fragments: ['7', '4', '9', '2'],
      prompt: 'The drawbridge code: add the two largest numbers, then subtract the two smallest. What do you get?',
      answer: '10',
      normalizedAnswer: '10',
    },
    {
      id: 'castle-final-003',
      fragments: ['KNIGHT', 'QUEEN', 'KING', 'BISHOP'],
      prompt: 'The chess piece password: your four pieces in alphabetical order, separated by spaces.',
      answer: 'BISHOP KING KNIGHT QUEEN',
      normalizedAnswer: 'bishopkingknightqueen',
    },
    {
      id: 'castle-final-004',
      fragments: ['3', '5', '8', '6'],
      prompt: 'The vault combination: multiply all four numbers together. What is it?',
      answer: '720',
      normalizedAnswer: '720',
    },
  ],
};
