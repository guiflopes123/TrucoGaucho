import React, { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import styled from 'styled-components';
import Home from './pages/Home';

// Lobby e sala de jogo só são baixados quando o jogador chega nelas.
const Lobby = lazy(() => import('./pages/Lobby'));
const GameRoom = lazy(() => import('./pages/GameRoom'));

const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #006400;
  color: #fff;
`;

const Loading = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
`;

function App() {
  return (
    <AppContainer>
      <Suspense fallback={<Loading role="status">Carregando...</Loading>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/lobby" element={<Lobby />} />
          <Route path="/room/:roomId" element={<GameRoom />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppContainer>
  );
}

export default App;
