import styled from 'styled-components';

const WaitingMessage = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 30px 50px;
  border-radius: 10px;
  text-align: center;
  z-index: 1000;
  max-width: 80%;
  font-size: 1.5rem;
  border: 2px solid #FFD700;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);

  div {
    margin-top: 15px;
    font-size: 1.2rem;
    color: #FFD700;
  }
`;

const renderWaitingMessage = () => {
  if (!gameState || gameState.gameStatus === 'waiting' || gameState.status === 'waiting') {
    return (
      <WaitingMessage>
        Aguardando jogadores...
        {playersReady > 0 && (
          <div>
            {playersReady} de {totalPlayers} jogadores prontos
          </div>
        )}
      </WaitingMessage>
    );
  }
  return null;
}; 