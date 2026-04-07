import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GameProvider, useGame } from './context/GameContext';
import LandingPage from './pages/LandingPage';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';
import FinalPuzzlePage from './pages/FinalPuzzlePage';
import ResultsPage from './pages/ResultsPage';

function AppRoutes() {
  const { setupListeners } = useGame();

  useEffect(() => {
    setupListeners();
  }, [setupListeners]);

  return (
    <Routes>
      <Route path="/"            element={<LandingPage />} />
      <Route path="/lobby"       element={<LobbyPage />} />
      <Route path="/game"        element={<GamePage />} />
      <Route path="/final"       element={<FinalPuzzlePage />} />
      <Route path="/results"     element={<ResultsPage />} />
      <Route path="*"            element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <GameProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </GameProvider>
  );
}
