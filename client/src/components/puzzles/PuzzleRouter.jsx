import React from 'react';
import MathEquation from './MathEquation';
import WordScramble from './WordScramble';
import MultipleChoice from './MultipleChoice';
import FillInBlank from './FillInBlank';
import AlgebraInput from './AlgebraInput';
import RiddleInput from './RiddleInput';

export default function PuzzleRouter({ puzzle, onSubmit, feedback, disabled }) {
  if (!puzzle) return null;

  const props = { puzzle, onSubmit, feedback, disabled };

  switch (puzzle.type) {
    case 'equation':      return <MathEquation {...props} />;
    case 'word_scramble': return <WordScramble {...props} />;
    case 'multiple_choice': return <MultipleChoice {...props} />;
    case 'fill_blank':    return <FillInBlank {...props} />;
    case 'algebra':       return <AlgebraInput {...props} />;
    case 'riddle':        return <RiddleInput {...props} />;
    default:              return <MathEquation {...props} />;
  }
}
