import React from 'react';

/**
 * Action buttons shown during your turn.
 * Props:
 *   isMyTurn          bool
 *   hasPending        bool   — tiles placed on board
 *   canExchange       bool   — bag has ≥7 tiles
 *   onPlay            fn
 *   onRecallAll       fn
 *   onPass            fn
 *   onExchange        fn
 *   onHint            fn
 */
export default function ActionBar({
  isMyTurn, hasPending, canExchange,
  onPlay, onRecallAll, onPass, onExchange, onHint,
}) {
  if (!isMyTurn) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 12px' }}>
        <button className="btn btn-ghost" style={{ fontSize: '0.9rem', width: 'auto', padding: '10px 20px' }}
          onClick={onHint}>
          💡 Hint
        </button>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      gap: 8,
      padding: '8px 12px',
      flexWrap: 'wrap',
      justifyContent: 'center',
    }}>
      {hasPending ? (
        <>
          <button className="btn btn-success" style={{ flex: 1, minWidth: 120 }} onClick={onPlay}>
            ✅ Play Word
          </button>
          <button className="btn btn-ghost" style={{ width: 'auto', padding: '10px 16px' }} onClick={onRecallAll}>
            ↩ Recall
          </button>
        </>
      ) : (
        <>
          <button className="btn btn-ghost" style={{ flex: 1, fontSize: '0.9rem' }} onClick={onPass}>
            ⏭ Pass
          </button>
          {canExchange && (
            <button className="btn btn-ghost" style={{ flex: 1, fontSize: '0.9rem' }} onClick={onExchange}>
              🔄 Exchange
            </button>
          )}
          <button className="btn btn-ghost" style={{ width: 'auto', padding: '10px 16px' }} onClick={onHint}>
            💡 Hint
          </button>
        </>
      )}
    </div>
  );
}
