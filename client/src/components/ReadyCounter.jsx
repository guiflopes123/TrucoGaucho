import React from 'react';
import styled from 'styled-components';

const ReadyCounterContainer = styled.div`
  position: fixed;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  background-color: rgba(0, 0, 0, 0.7);
  padding: 20px;
  border-radius: 10px;
  border: 2px solid #FFD700;
  color: white;
  min-width: 200px;
`;

const CounterTitle = styled.h3`
  color: #FFD700;
  margin: 0 0 10px 0;
  text-align: center;
`;

const PlayerList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const PlayerItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 10px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 5px;
`;

const PlayerName = styled.span`
  color: ${props => props.isReady ? '#4CAF50' : '#FFD700'};
`;

const ReadyStatus = styled.span`
  color: ${props => props.isReady ? '#4CAF50' : '#FFD700'};
  font-weight: bold;
`;

const WaitingMessage = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(0, 0, 0, 0.8);
  padding: 20px 40px;
  border-radius: 10px;
  border: 2px solid #FFD700;
  color: #FFD700;
  font-size: 1.5rem;
  text-align: center;
  animation: pulse 2s infinite;

  @keyframes pulse {
    0% { transform: translate(-50%, -50%) scale(1); }
    50% { transform: translate(-50%, -50%) scale(1.05); }
    100% { transform: translate(-50%, -50%) scale(1); }
  }
`;

const ReadyCounter = ({ players, isReady }) => {
  return (
    <>
      <ReadyCounterContainer>
        <CounterTitle>Jogadores Prontos</CounterTitle>
        <PlayerList>
          {players.map((player) => (
            <PlayerItem key={player.id}>
              <PlayerName isReady={player.isReady}>{player.name}</PlayerName>
              <ReadyStatus isReady={player.isReady}>
                {player.isReady ? '✓ Pronto' : 'Aguardando...'}
              </ReadyStatus>
            </PlayerItem>
          ))}
        </PlayerList>
      </ReadyCounterContainer>
    </>
  );
};

export default ReadyCounter; 