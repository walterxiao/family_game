import React from 'react';
import Tile from './Tile';

/**
 * The 7-tile rack at the bottom of the screen.
 * Props:
 *   rack              string[]  — current rack letters
 *   pendingPlacements {row,col,letter}[]  — tiles placed on board (dimmed in rack)
 *   selectedLetter    string|null
 *   onSelect          fn(letter)
 *   isMyTurn          bool
 */
export default function TileRack({ rack, pendingPlacements, selectedLetter, onSelect, isMyTurn }) {
  // Count placed letters so we can dim duplicates correctly
  const placedCounts = {};
  for (const p of pendingPlacements) {
    placedCounts[p.letter] = (placedCounts[p.letter] || 0) + 1;
  }

  // Build display list: each slot tracks whether it's "used" by a pending placement
  const remaining = { ...placedCounts };
  const slots = rack.map((letter, idx) => {
    const isPlaced = (remaining[letter] || 0) > 0;
    if (isPlaced) remaining[letter]--;
    return { letter, idx, isPlaced };
  });

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      padding: '10px 8px',
      background: 'var(--surface)',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      flexWrap: 'wrap',
    }}>
      {slots.map(({ letter, idx, isPlaced }) => {
        const isSelected = !isPlaced && selectedLetter === letter && isMyTurn;
        return (
          <Tile
            key={idx}
            letter={letter}
            size={52}
            selected={isSelected}
            dim={isPlaced}
            onClick={isMyTurn && !isPlaced ? () => onSelect(letter) : undefined}
          />
        );
      })}
      {rack.length === 0 && (
        <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>No tiles — game almost over!</span>
      )}
    </div>
  );
}
