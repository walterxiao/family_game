import React from 'react';
import { PREMIUM_SQUARES } from '../../lib/boardLayout';
import Tile from './Tile';

const PREMIUM_LABELS = { TW: 'Triple\nWord', DW: 'Double\nWord', TL: 'Triple\nLetter', DL: 'Double\nLetter', star: '★' };
const PREMIUM_COLORS = {
  TW:   { bg: '#b71c1c', text: '#ffcdd2' },
  DW:   { bg: '#880e4f', text: '#fce4ec' },
  TL:   { bg: '#1565c0', text: '#bbdefb' },
  DL:   { bg: '#0277bd', text: '#e1f5fe' },
  star: { bg: '#880e4f', text: '#fce4ec' },
};

const TILE_SIZE = 'clamp(28px, calc((100vw - 8px) / 15), 42px)';

/**
 * One cell of the 15×15 board.
 * Props:
 *   row, col     number
 *   boardTile    { letter, value, placedBy } | undefined — settled tile
 *   pendingTile  { letter } | undefined — tile placed this turn (not yet submitted)
 *   isHint       bool — highlight as hint suggestion
 *   isMyTurn     bool
 *   hasSelection bool — a rack tile is selected, cell is empty → tappable
 *   onClick      fn()
 */
export default function BoardCell({
  row, col,
  boardTile, pendingTile, isHint,
  isMyTurn, hasSelection,
  onClick,
}) {
  const key = `${row},${col}`;
  const premium = PREMIUM_SQUARES[key];
  const pStyle = premium ? PREMIUM_COLORS[premium] : null;

  const hasTile = !!(boardTile || pendingTile);
  const canPlace = isMyTurn && hasSelection && !hasTile;
  const tileToShow = pendingTile || (boardTile ? boardTile : null);

  return (
    <div
      onClick={canPlace || (isMyTurn && pendingTile) ? onClick : undefined}
      style={{
        width:  TILE_SIZE,
        height: TILE_SIZE,
        background: hasTile
          ? 'transparent'
          : isHint
            ? 'rgba(245,166,35,0.25)'
            : pStyle
              ? pStyle.bg
              : 'var(--surface2)',
        border: pendingTile
          ? '2px solid var(--gold)'
          : isHint
            ? '2px dashed var(--gold)'
            : '1px solid rgba(255,255,255,0.07)',
        borderRadius: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: (canPlace || (isMyTurn && pendingTile)) ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
        WebkitTapHighlightColor: 'transparent',
        transition: 'background 0.15s',
      }}
    >
      {hasTile ? (
        <BoardTileView tile={tileToShow} isPending={!!pendingTile} />
      ) : (
        <PremiumLabel premium={premium} pStyle={pStyle} />
      )}
    </div>
  );
}

function BoardTileView({ tile, isPending }) {
  const TILE_VALUES = {
    A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,I:1,J:8,K:5,L:1,M:3,
    N:1,O:1,P:3,Q:10,R:1,S:1,T:1,U:1,V:4,W:4,X:8,Y:4,Z:10,
  };
  return (
    <div style={{
      width: '100%', height: '100%',
      background: isPending ? '#c8a84b' : 'var(--tile-bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 800,
      fontSize: 'clamp(13px, calc((100vw - 8px) / 15 * 0.46), 20px)',
      color: isPending ? '#1a1a2e' : 'var(--tile-text)',
      position: 'relative',
    }}>
      {tile.letter}
      <span style={{
        position: 'absolute',
        bottom: '5%',
        right: '8%',
        fontSize: 'clamp(7px, calc((100vw - 8px) / 15 * 0.19), 10px)',
        fontWeight: 600,
        color: isPending ? '#5a3d00' : 'var(--muted)',
      }}>
        {TILE_VALUES[tile.letter] ?? tile.value ?? 0}
      </span>
    </div>
  );
}

function PremiumLabel({ premium, pStyle }) {
  if (!premium) return null;
  const label = PREMIUM_LABELS[premium] || '';
  return (
    <span style={{
      fontSize: premium === 'star' ? '1.1em' : 'clamp(5px, 1.1vw, 8px)',
      fontWeight: 700,
      color: pStyle?.text,
      textAlign: 'center',
      lineHeight: 1.2,
      whiteSpace: 'pre',
      pointerEvents: 'none',
      userSelect: 'none',
    }}>
      {label}
    </span>
  );
}
