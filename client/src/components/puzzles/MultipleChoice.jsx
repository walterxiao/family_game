import React, { useState } from 'react';

export default function MultipleChoice({ puzzle, onSubmit, disabled }) {
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);

  function handleSelect(option) {
    if (disabled || answered) return;
    setSelected(option);
    setAnswered(true);
    onSubmit(option);
  }

  return (
    <div>
      <div className="puzzle-prompt">{puzzle.prompt}</div>
      <div className="options-grid">
        {puzzle.options.map(opt => (
          <button
            key={opt}
            className={`option-btn${selected === opt ? ' correct' : ''}`}
            onClick={() => handleSelect(opt)}
            disabled={disabled || answered}
            type="button"
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
