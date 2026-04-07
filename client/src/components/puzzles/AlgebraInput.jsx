import React, { useState } from 'react';

export default function AlgebraInput({ puzzle, onSubmit, feedback, disabled }) {
  const [value, setValue] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (!value.trim() || disabled) return;
    onSubmit(value.trim());
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="puzzle-prompt">{puzzle.prompt}</div>
      <div className="field">
        <label style={{ textAlign: 'center' }}>x =</label>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="Enter the value of x"
          disabled={disabled}
          autoComplete="off"
          style={{ textAlign: 'center', fontSize: '1.4rem' }}
        />
      </div>
      <button
        className={`btn ${feedback === 'correct' ? 'btn-success' : 'btn-primary'}`}
        type="submit"
        disabled={disabled || !value.trim()}
      >
        {feedback === 'correct' ? '✓ Correct!' : 'Submit'}
      </button>
    </form>
  );
}
