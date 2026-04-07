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

  // Room
  players: [],      // [{ socketId, name, age, tier, role, status, score }]
  totalRounds: 4,

  // Game progress
  gamePhase: 'landing',   // landing | lobby | puzzle | final | results | complete
  roundIndex: 0,
  theme: null,

  // Puzzle (my own)
  myPuzzle: null,
  myFragment: null,  // revealed after solving
  solvedCount: 0,

  // Final puzzle
  finalPrompt: null,
  finalAnswer: '',   // live-synced typing
  finalResult: null, // true | false | null

  // Hint
  hint: null,
  hintsRemaining: 3,

  // Scores (end of round)
  scores: [],

  // Error
  error: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'ROOM_CREATED':
    case 'ROOM_JOINED':
      return {
        ...state,
        roomCode: action.roomCode,
        mySocketId: socket.id,
        players: action.players,
        totalRounds: action.totalRounds,
        isHost: action.isHost ?? state.isHost,
        gamePhase: 'lobby',
        error: null,
      };
    case 'SET_IDENTITY':
      return { ...state, myName: action.name, myAge: action.age, isHost: action.isHost };
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
    case 'GAME_STARTED':
      return {
        ...state,
        gamePhase: 'puzzle',
        roundIndex: action.roundIndex,
        theme: action.theme,
        totalRounds: action.totalRounds,
        myPuzzle: null,
        myFragment: null,
        solvedCount: 0,
        finalPrompt: null,
        finalAnswer: '',
        finalResult: null,
        hint: null,
        players: state.players.map(p => ({ ...p, status: 'solving' })),
      };
    case 'PUZZLE_ASSIGNED':
      return { ...state, myPuzzle: action.puzzle };
    case 'ANSWER_CORRECT':
      return { ...state };
    case 'FRAGMENT_REVEALED':
      return { ...state, myFragment: action.fragment };
    case 'PUZZLE_SOLVED':
      return {
        ...state,
        solvedCount: action.solvedCount,
        players: state.players.map(p =>
          p.socketId === action.socketId ? { ...p, status: 'solved' } : p
        ),
      };
    case 'FINAL_PUZZLE_READY':
      return { ...state, gamePhase: 'final', finalPrompt: action.prompt };
    case 'FINAL_ANSWER_UPDATE':
      return { ...state, finalAnswer: action.partialAnswer };
    case 'FINAL_CORRECT':
      return { ...state, finalResult: true };
    case 'FINAL_WRONG':
      return { ...state, finalResult: false };
    case 'ROUND_COMPLETE':
      return {
        ...state,
        gamePhase: 'results',
        scores: action.scores,
      };
    case 'GAME_COMPLETE':
      return { ...state, gamePhase: 'complete', scores: action.scores };
    case 'HINT_RECEIVED':
      return { ...state, hint: action.hint, hintsRemaining: action.hintsRemaining ?? state.hintsRemaining };
    case 'ERROR':
      return { ...state, error: action.message };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'SET_FINAL_ANSWER':
      return { ...state, finalAnswer: action.value };
    default:
      return state;
  }
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const setupListeners = useCallback(() => {
    socket.on('room_created', (data) => dispatch({ type: 'ROOM_CREATED', ...data, isHost: true }));
    socket.on('room_joined',  (data) => dispatch({ type: 'ROOM_JOINED', ...data }));
    socket.on('player_joined', ({ player }) => dispatch({ type: 'PLAYER_JOINED', player }));
    socket.on('player_left',  ({ socketId }) => dispatch({ type: 'PLAYER_LEFT', socketId }));
    socket.on('game_started', (data) => dispatch({ type: 'GAME_STARTED', ...data }));
    socket.on('puzzle_assigned', ({ puzzle }) => dispatch({ type: 'PUZZLE_ASSIGNED', puzzle }));
    socket.on('answer_result', ({ correct }) => { if (correct) dispatch({ type: 'ANSWER_CORRECT' }); });
    socket.on('fragment_revealed', ({ fragment }) => dispatch({ type: 'FRAGMENT_REVEALED', fragment }));
    socket.on('puzzle_solved', (data) => dispatch({ type: 'PUZZLE_SOLVED', ...data }));
    socket.on('final_puzzle_ready', ({ prompt }) => dispatch({ type: 'FINAL_PUZZLE_READY', prompt }));
    socket.on('final_answer_update', ({ partialAnswer }) => dispatch({ type: 'FINAL_ANSWER_UPDATE', partialAnswer }));
    socket.on('final_answer_result', ({ correct }) =>
      dispatch({ type: correct ? 'FINAL_CORRECT' : 'FINAL_WRONG' })
    );
    socket.on('round_complete', ({ scores, gameOver }) =>
      dispatch({ type: gameOver ? 'GAME_COMPLETE' : 'ROUND_COMPLETE', scores })
    );
    socket.on('hint_sent', ({ hint, hintsRemaining }) => dispatch({ type: 'HINT_RECEIVED', hint, hintsRemaining }));
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
