import React, { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import socket from '../socket';
import Board from '../components/game/Board';
import TileRack from '../components/game/TileRack';
import ActionBar from '../components/game/ActionBar';
import ScorePanel from '../components/game/ScorePanel';
import TurnBanner from '../components/game/TurnBanner';
import HintBanner from '../components/game/HintBanner';
import WordValidationFeedback from '../components/game/WordValidationFeedback';

export default function GamePage() {
  const { state, dispatch } = useGame();
  const navigate = useNavigate();
  const [showExchange, setShowExchange] = useState(false);
  const [exchangeSelected, setExchangeSelected] = useState([]);
  const [hintWord, setHintWord] = useState(null);

  const {
    roomCode, mySocketId, players,
    board, myRack, bagCount, currentTurnSocketId,
    pendingPlacements, selectedRackLetter,
    lastMoveResult, invalidMoveMsg, hintPlacements,
    gamePhase,
  } = state;

  const isMyTurn = currentTurnSocketId === mySocketId;
  const currentPlayer = players.find(p => p.socketId === currentTurnSocketId);

  useEffect(() => {
    if (!roomCode) navigate('/');
  }, [roomCode, navigate]);

  useEffect(() => {
    if (gamePhase === 'gameover') navigate('/end');
  }, [gamePhase, navigate]);

  // Track hint word separately (cleared when hint placements clear)
  useEffect(() => {
    if (!hintPlacements) setHintWord(null);
  }, [hintPlacements]);

  // Listen for hint results (to capture word name)
  useEffect(() => {
    function onHintResult({ word }) {
      if (word) setHintWord(word);
    }
    socket.on('hint_result', onHintResult);
    return () => socket.off('hint_result', onHintResult);
  }, []);

  // ── Tile placement ────────────────────────────────────────────────────────

  function handleRackSelect(letter) {
    if (!isMyTurn) return;
    dispatch({ type: 'SELECT_RACK_LETTER', letter: selectedRackLetter === letter ? null : letter });
  }

  function handleCellClick(row, col) {
    if (!isMyTurn || !selectedRackLetter) return;
    if (board[`${row},${col}`]) return;
    if (pendingPlacements.some(p => p.row === row && p.col === col)) return;
    dispatch({ type: 'PLACE_TILE', row, col, letter: selectedRackLetter });
  }

  function handleRecallTile(row, col) {
    dispatch({ type: 'RECALL_TILE', row, col });
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  function handlePlay() {
    if (pendingPlacements.length === 0) return;
    socket.emit('place_tiles', { roomCode, placements: pendingPlacements });
    dispatch({ type: 'RECALL_ALL' });
  }

  function handleRecallAll() {
    dispatch({ type: 'RECALL_ALL' });
  }

  function handlePass() {
    socket.emit('pass_turn', { roomCode });
  }

  function handleRequestHint() {
    socket.emit('request_hint', { roomCode });
  }

  function handleClearHint() {
    dispatch({ type: 'CLEAR_HINT' });
    setHintWord(null);
  }

  function handleClearFeedback() {
    dispatch({ type: 'CLEAR_FEEDBACK' });
  }

  // ── Exchange ──────────────────────────────────────────────────────────────

  function handleExchangeOpen() {
    setExchangeSelected([]);
    setShowExchange(true);
  }

  function handleExchangeSubmit() {
    if (exchangeSelected.length === 0) return;
    const letters = exchangeSelected.map(k => k.split('_')[0]);
    socket.emit('exchange_tiles', { roomCode, letters });
    setShowExchange(false);
    setExchangeSelected([]);
  }

  function toggleExchangeLetter(letter, idx) {
    setExchangeSelected(prev => {
      const key = `${letter}_${idx}`;
      return prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
    });
  }

  // ─────────────────────────────────────────────────────────────────────────

  if (!roomCode) return null;

  // Exchange modal
  if (showExchange) {
    const exKeys = new Set(exchangeSelected);
    return (
      <div className="page" style={{ gap: 16 }}>
        <div className="card" style={{ maxWidth: 400, width: '100%' }}>
          <h2 style={{ marginBottom: 8 }}>🔄 Exchange Tiles</h2>
          <p className="text-muted" style={{ marginBottom: 20, fontSize: '0.9rem' }}>
            Tap tiles to select, then hit Exchange. Your turn passes.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 20 }}>
            {myRack.map((letter, idx) => {
              const key = `${letter}_${idx}`;
              const sel = exKeys.has(key);
              return (
                <div key={key} onClick={() => toggleExchangeLetter(letter, idx)}
                  style={{
                    width: 52, height: 52, borderRadius: 8, display: 'flex',
                    flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    background: sel ? 'var(--accent)' : 'var(--tile-bg)',
                    color: sel ? '#fff' : 'var(--tile-text)',
                    fontWeight: 800, fontSize: 22, cursor: 'pointer',
                    border: sel ? '2px solid #fff' : '2px solid rgba(255,255,255,0.15)',
                    userSelect: 'none',
                  }}>
                  {letter}
                </div>
              );
            })}
          </div>
          <button className="btn btn-primary" disabled={exchangeSelected.length === 0} onClick={handleExchangeSubmit}>
            Exchange {exchangeSelected.length} tile{exchangeSelected.length !== 1 ? 's' : ''}
          </button>
          <button className="btn btn-ghost mt-2" onClick={() => setShowExchange(false)}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100%',
      overflow: 'hidden',
      background: 'var(--bg)',
    }}>
      {/* Score strip */}
      <ScorePanel
        players={players}
        currentTurnSocketId={currentTurnSocketId}
        mySocketId={mySocketId}
        bagCount={bagCount}
      />

      {/* Turn banner */}
      <TurnBanner isMyTurn={isMyTurn} currentName={currentPlayer?.name} />

      {/* Feedback */}
      <WordValidationFeedback
        lastMoveResult={lastMoveResult}
        invalidMoveMsg={invalidMoveMsg}
        mySocketId={mySocketId}
        onClear={handleClearFeedback}
      />

      {/* Hint banner */}
      {hintWord && (
        <HintBanner word={hintWord} onClear={handleClearHint} />
      )}

      {/* Board — scrollable area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '8px 4px',
        WebkitOverflowScrolling: 'touch',
      }}>
        <Board
          board={board}
          pendingPlacements={pendingPlacements}
          hintPlacements={hintPlacements}
          selectedLetter={selectedRackLetter}
          isMyTurn={isMyTurn}
          onCellClick={handleCellClick}
          onRecallTile={handleRecallTile}
        />
      </div>

      {/* Action bar */}
      <ActionBar
        isMyTurn={isMyTurn}
        hasPending={pendingPlacements.length > 0}
        canExchange={bagCount >= 7}
        onPlay={handlePlay}
        onRecallAll={handleRecallAll}
        onPass={handlePass}
        onExchange={handleExchangeOpen}
        onHint={handleRequestHint}
      />

      {/* Tile rack */}
      <TileRack
        rack={myRack}
        pendingPlacements={pendingPlacements}
        selectedLetter={selectedRackLetter}
        onSelect={handleRackSelect}
        isMyTurn={isMyTurn}
      />
    </div>
  );
}
