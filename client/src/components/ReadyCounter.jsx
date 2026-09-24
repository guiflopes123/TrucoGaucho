import React from 'react';
import styled from 'styled-components';

const Panel = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 4;
  min-width: 240px;
  max-width: 90%;
  padding: 16px 20px;
  border-radius: 10px;
  border: 2px solid #ffd700;
  background: rgba(0, 0, 0, 0.8);
  color: white;
`;

const Title = styled.h3`
  margin: 0 0 10px;
  text-align: center;
  color: #ffd700;
`;

const Item = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 5px 10px;
  margin-top: 6px;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.1);
  color: ${props => (props.$ready ? '#4caf50' : '#ffd700')};
`;

const Hint = styled.p`
  margin: 12px 0 0;
  text-align: center;
  font-size: 0.95rem;
`;

const Tools = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;

  button {
    padding: 6px 12px;
    font-size: 0.85rem;
    background: #4682b4;
    color: white;
  }
`;

const ReadyCounter = ({ players, maxPlayers, isReady, onAddBot, onRemoveBot, onCopyLink, copied }) => {
  const missing = maxPlayers - players.length;
  const hasBots = players.some(p => p.isBot);
  const hint = missing > 0
    ? `Aguardando ${missing} jogador${missing > 1 ? 'es' : ''}...`
    : (isReady ? 'Aguardando os outros ficarem prontos...' : 'Clique em "Pronto" para iniciar');

  return (
    <Panel role="status">
      <Title>Jogadores ({players.length}/{maxPlayers})</Title>
      {players.map(player => (
        <Item key={player.id} $ready={player.isReady}>
          <span>{player.isBot ? '🤖 ' : ''}{player.name}{player.connected ? '' : ' (offline)'}</span>
          <strong>{player.isReady ? '✓ Pronto' : 'Aguardando...'}</strong>
        </Item>
      ))}
      <Hint>{hint}</Hint>
      <Tools>
        {missing > 0 && <button type="button" onClick={onAddBot}>Adicionar bot</button>}
        {hasBots && <button type="button" onClick={onRemoveBot}>Remover bot</button>}
        <button type="button" onClick={onCopyLink}>{copied ? 'Link copiado!' : 'Copiar link da sala'}</button>
      </Tools>
    </Panel>
  );
};

export default ReadyCounter;
