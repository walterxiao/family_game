import React, { createContext, useContext, useReducer, useCallback } from 'react';
import socket from '../socket';

const GameContext = createContext(null);

const initialState = {
  // Identity
  roomCode: null,
  mySocketId: null,
  myName: null,
  myAge: null,
  isHost: false,

  // Lobby
  players: [],   // [{ socketId, name, age, role, status, score, turnPosition }]

  // Game state
  gamePhase: 'landing',          // landing | lobby | playing | gameover
  board: {},                     // sparse: "row,col" → { letter, value, placedBy }
  myRack: [],                    // ['A','B',...]
  bagCount: 98,
  currentTurnSocketId: null,

  // Client-side pending placements (not yet submitted)
  pendingPlacements: [],         // [{ row, col, letter }]
  selectedRackLetter: null,      // uppercase letter selected in rack (null = none)

  // Feedback
  lastMoveResult: null,          // { wordsFormed, moveScore, bySocketId, byName }
  invalidMoveMsg: null,          // string | null

  // Hint
  hintPlacements: null,          // [{ row, col, letter }] | null

  // End game
  finalScores: null,
  gameOverReason: null,

  error: null,
};

function reducer(state, action) {
  switch (action.type) {

    // ── Identity & Lobby ─────────────────────────────────────────────────────
    case 'SET_IDENTITY':
      return { ...state, myName: action.name, myAge: action.age, isHost: action.isHost };

    case 'ROOM_CREATED':
      return {
        ...state,
        roomCode: action.roomCode,
        mySocketId: socket.id,
        players: action.players,
        isHost: true,
        gamePhase: 'lobby',
        error: null,
      };

    case 'ROOM_JOINED':
      return {
        ...state,
        roomCode: action.roomCode,
        mySocketId: socket.id,
        players: action.players,
        isHost: action.isHost ?? state.isHost,
        gamePhase: 'lobby',
        error: null,
      };

    case 'PLAYER_JOINED':
      return {
        ...state,
        players: [...state.players.filter(p => p.socketId !== action.player.socketId), action.player],
      };

    case 'PLAYER_LEFT':
      return {
        ...state,
        players: state.players.map(p =>
          p.socketId === action.socketId ? { ...p, status: 'disconnected' } : p
        ),
      };

    case 'PLAYER_REJOINED':
      return {
        ...state,
        players: state.players.map(p =>
          p.socketId === action.socketId ? { ...p, status: 'active' } : p
        ),
      };

    // ── Game Start ───────────────────────────────────────────────────────────
    case 'GAME_STARTED':
      return {
        ...state,
        gamePhase: 'playing',
        board: action.board || {},
        players: action.players || state.players,
        bagCount: action.bagCount ?? 98,
        currentTurnSocketId: action.currentTurnSocketId,
        myRack: [],
        pendingPlacements: [],
        selectedRackLetter: null,
        lastMoveResult: null,
        invalidMoveMsg: null,
        hintPlacements: null,
      };

    case 'RACK_DEALT':
      return { ...state, myRack: action.rack };

    // ── Move Accepted (broadcast) ────────────────────────────────────────────
    case 'MOVE_ACCEPTED': {
      const byName = state.players.find(p => p.socketId === action.bySocketId)?.name || 'Someone';
      return {
        ...state,
        board: action.board,
        players: state.players.map(p => {
          const s = action.scores.find(sc => sc.socketId === p.socketId);
          return s ? { ...p, score: s.score } : p;
        }),
        bagCount: action.bagCount,
        currentTurnSocketId: action.currentTurnSocketId,
        pendingPlacements: [],
        selectedRackLetter: null,
        hintPlacements: null,
        invalidMoveMsg: null,
        lastMoveResult: {
          wordsFormed: action.wordsFormed,
          moveScore: action.moveScore,
          bySocketId: action.bySocketId,
          byName,
        },
      };
    }

    // ── My rack after my move ────────────────────────────────────────────────
    case 'RACK_UPDATED':
      return { ...state, myRack: action.rack };

    // ── Invalid move ─────────────────────────────────────────────────────────
    case 'INVALID_MOVE':
      return {
        ...state,
        invalidMoveMsg: action.reason,
        pendingPlacements: [],
        selectedRackLetter: null,
      };

    // ── Pass / Exchange ──────────────────────────────────────────────────────
    case 'TURN_PASSED':
    case 'TILES_EXCHANGED':
      return {
        ...state,
        currentTurnSocketId: action.currentTurnSocketId,
        pendingPlacements: [],
        selectedRackLetter: null,
        invalidMoveMsg: null,
        lastMoveResult: null,
        hintPlacements: null,
      };

    // ── Hint ─────────────────────────────────────────────────────────────────
    case 'HINT_RESULT':
      return { ...state, hintPlacements: action.placements?.length ? action.placements : null };

    // ── Game Over ────────────────────────────────────────────────────────────
    case 'GAME_OVER':
      return {
        ...state,
        gamePhase: 'gameover',
        finalScores: action.finalScores,
        gameOverReason: action.reason,
      };

    // ── Rejoin ───────────────────────────────────────────────────────────────
    case 'GAME_REJOINED':
      return {
        ...state,
        roomCode: action.roomCode,
        mySocketId: socket.id,
        isHost: action.isHost,
        players: action.players,
        board: action.board || {},
        myRack: action.rack || [],
        bagCount: action.bagCount ?? 98,
        currentTurnSocketId: action.currentTurnSocketId,
        gamePhase: action.currentTurnSocketId ? 'playing' : 'lobby',
        pendingPlacements: [],
        selectedRackLetter: null,
        hintPlacements: null,
        invalidMoveMsg: null,
        lastMoveResult: null,
      };

    // ── Client-side tile interaction ─────────────────────────────────────────
    case 'SELECT_RACK_LETTER':
      return {
        ...state,
        selectedRackLetter: action.letter,
        invalidMoveMsg: null,
      };

    case 'PLACE_TILE':
      return {
        ...state,
        pendingPlacements: [...state.pendingPlacements, { row: action.row, col: action.col, letter: action.letter }],
        selectedRackLetter: null,
      };

    case 'RECALL_TILE': {
      // Remove the pending tile at this position (tap on a placed-pending tile)
      const updated = state.pendingPlacements.filter(
        p => !(p.row === action.row && p.col === action.col)
      );
      return { ...state, pendingPlacements: updated };
    }

    case 'RECALL_ALL':
      return { ...state, pendingPlacements: [], selectedRackLetter: null };

    case 'CLEAR_FEEDBACK':
      return { ...state, lastMoveResult: null, invalidMoveMsg: null };

    case 'CLEAR_HINT':
      return { ...state, hintPlacements: null };

    // ── Errors ───────────────────────────────────────────────────────────────
    case 'ERROR':
      return { ...state, error: action.message };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    default:
      return state;
  }
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const setupListeners = useCallback(() => {
    socket.on('room_created',  (data) => dispatch({ type: 'ROOM_CREATED', ...data }));
    socket.on('room_joined',   (data) => dispatch({ type: 'ROOM_JOINED',  ...data }));
    socket.on('player_joined', ({ player }) => dispatch({ type: 'PLAYER_JOINED', player }));
    socket.on('player_left',   ({ socketId }) => dispatch({ type: 'PLAYER_LEFT', socketId }));
    socket.on('player_rejoined', (d) => dispatch({ type: 'PLAYER_REJOINED', ...d }));

    socket.on('game_started',  (data) => dispatch({ type: 'GAME_STARTED',  ...data }));
    socket.on('rack_dealt',    ({ rack }) => dispatch({ type: 'RACK_DEALT', rack }));

    socket.on('move_accepted', (data) => dispatch({ type: 'MOVE_ACCEPTED', ...data }));
    socket.on('rack_updated',  ({ rack }) => dispatch({ type: 'RACK_UPDATED', rack }));
    socket.on('invalid_move',  (data) => dispatch({ type: 'INVALID_MOVE', ...data }));

    socket.on('turn_passed',   (data) => dispatch({ type: 'TURN_PASSED',    ...data }));
    socket.on('tiles_exchanged', (data) => dispatch({ type: 'TILES_EXCHANGED', ...data }));

    socket.on('hint_result',   (data) => dispatch({ type: 'HINT_RESULT', ...data }));
    socket.on('game_over',     (data) => dispatch({ type: 'GAME_OVER',   ...data }));
    socket.on('game_rejoined', (data) => dispatch({ type: 'GAME_REJOINED', ...data }));

    socket.on('error', ({ message }) => dispatch({ type: 'ERROR', message }));
  }, []);

  return (
    <GameContext.Provider value={{ state, dispatch, setupListeners }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
