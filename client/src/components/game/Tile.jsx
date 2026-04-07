import React from 'react';

const TILE_VALUES = {
  A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,I:1,J:8,K:5,L:1,M:3,
  N:1,O:1,P:3,Q:10,R:1,S:1,T:1,U:1,V:4,W:4,X:8,Y:4,Z:10,
};

/**
 * A single letter tile.
 * Props:
 *   letter     string  — the uppercase letter
 *   size       number  — px size (default 52)
 *   selected   bool    — highlight as selected
 *   dim        bool    — fade out (used in rack for placed tiles)
 *   onClick    fn
 */
export default function Tile({ letter, size = 52, selected, dim, onClick }) {
  const value = TILE_VALUES[letter] ?? 0;
  return (
    <div
      onClick={onClick}
      style={{
        width: size,
        height: size,
        background: selected ? 'var(--gold)' : 'var(--tile-bg)',
        color: selected ? '#1a1a2e' : 'var(--tile-text)',
        border: selected ? '2px solid #fff' : '2px solid rgba(255,255,255,0.15)',
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: Math.round(size * 0.46),
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
        opacity: dim ? 0.35 : 1,
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        transition: 'transform 0.1s, background 0.15s',
        flexShrink: 0,
        boxShadow: selected
          ? '0 0 0 3px rgba(245,166,35,0.5)'
          : '0 2px 6px rgba(0,0,0,0.4)',
      }}
    >
      {letter}
      <span style={{
        position: 'absolute',
        bottom: 2,
        right: 4,
        fontSize: Math.round(size * 0.2),
        fontWeight: 600,
        lineHeight: 1,
        color: selected ? '#333' : 'var(--muted)',
      }}>
        {value}
      </span>
    </div>
  );
}
