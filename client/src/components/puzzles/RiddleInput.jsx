import React, { useState } from 'react';

export default function RiddleInput({ puzzle, onSubmit, feedback, disabled }) {
  const [value, setValue] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (!value.trim() || disabled) return;
    onSubmit(value.trim());
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ fontSize: '1.5rem', textAlign: 'center', marginBottom: 12 }}>🧩</div>
      <div className="puzzle-prompt" style={{ fontStyle: 'italic' }}>{puzzle.prompt}</div>
      <div className="field">
        <input
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="What am I?"
          disabled={disabled}
          autoComplete="off"
          style={{ textAlign: 'center' }}
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
