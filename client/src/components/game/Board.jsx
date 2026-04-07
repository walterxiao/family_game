import React from 'react';
import BoardCell from './BoardCell';

const ROWS = 15, COLS = 15;

/**
 * The 15×15 game board.
 * Props:
 *   board             Object  sparse map "row,col" → {letter,value,placedBy}
 *   pendingPlacements [{row,col,letter}]
 *   hintPlacements    [{row,col,letter}] | null
 *   selectedLetter    string | null   — a rack tile is ready to place
 *   isMyTurn          bool
 *   onCellClick       fn(row, col)
 *   onRecallTile      fn(row, col)    — tap a pending tile to take it back
 */
export default function Board({
  board, pendingPlacements, hintPlacements,
  selectedLetter, isMyTurn,
  onCellClick, onRecallTile,
}) {
  const pendingMap = new Map(pendingPlacements.map(p => [`${p.row},${p.col}`, p]));
  const hintSet   = new Set((hintPlacements || []).map(p => `${p.row},${p.col}`));

  const cells = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const key = `${r},${c}`;
      const boardTile   = board[key];
      const pendingTile = pendingMap.get(key);
      const isHint      = !boardTile && !pendingTile && hintSet.has(key);

      cells.push(
        <BoardCell
          key={key}
          row={r}
          col={c}
          boardTile={boardTile}
          pendingTile={pendingTile}
          isHint={isHint}
          isMyTurn={isMyTurn}
          hasSelection={!!selectedLetter}
          onClick={() => {
            if (pendingTile) { onRecallTile(r, c); }
            else if (isMyTurn && selectedLetter && !boardTile) { onCellClick(r, c); }
          }}
        />
      );
    }
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${COLS}, clamp(28px, calc((100vw - 8px) / 15), 42px))`,
      gridTemplateRows:    `repeat(${ROWS}, clamp(28px, calc((100vw - 8px) / 15), 42px))`,
      gap: 1,
      background: 'rgba(255,255,255,0.06)',
      border: '2px solid rgba(255,255,255,0.1)',
      borderRadius: 8,
      padding: 2,
      margin: '0 auto',
      width: 'max-content',
      maxWidth: '100vw',
      overflow: 'hidden',
    }}>
      {cells}
    </div>
  );
}
