import React from 'react';
import styled from 'styled-components';

const ButtonContainer = styled.div`
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 12px;
  background-color: rgba(0, 0, 0, 0.5);
  border-top: 2px solid rgba(255, 215, 0, 0.3);
`;

const gradients = {
  red: 'linear-gradient(to bottom, #b22222, #8b0000)',
  green: 'linear-gradient(to bottom, #006400, #004d00)',
  blue: 'linear-gradient(to bottom, #4682b4, #36648b)'
};

const ActionButton = styled.button`
  background: ${props => gradients[props.$tone] || gradients.red};
  color: white;
  font-size: 1rem;
  font-weight: bold;
  padding: 10px 18px;
  border-radius: 8px;
  border: none;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.4);
  }

  &:focus-visible {
    outline: 3px solid #ffd700;
    outline-offset: 2px;
  }

  &:disabled {
    background: linear-gradient(to bottom, #666, #444);
    cursor: not-allowed;
    opacity: 0.7;
  }
`;

const GameActions = ({
  phase,
  actions,
  isReady,
  showReadyButton,
  onReady,
  onTruco,
  onRetruco,
  onVale4,
  onEnvido,
  onFlor,
  onLeave
}) => (
  <ButtonContainer role="toolbar" aria-label="Ações do jogo">
    {showReadyButton && (
      <ActionButton type="button" $tone={isReady ? 'green' : 'blue'} onClick={onReady} disabled={isReady}>
        {isReady ? 'Pronto!' : 'Pronto'}
      </ActionButton>
    )}

    {phase === 'playing' && (
      <>
        <ActionButton type="button" onClick={onTruco} disabled={!actions.canTruco}>Truco</ActionButton>
        <ActionButton type="button" onClick={onRetruco} disabled={!actions.canRetruco}>Retruco</ActionButton>
        <ActionButton type="button" onClick={onVale4} disabled={!actions.canVale4}>Vale 4</ActionButton>
        <ActionButton type="button" $tone="green" onClick={onEnvido} disabled={!actions.canEnvido}>Envido</ActionButton>
        <ActionButton type="button" $tone="green" onClick={onFlor} disabled={!actions.canFlor}>Flor</ActionButton>
      </>
    )}

    <ActionButton type="button" $tone="blue" onClick={onLeave}>Sair da Sala</ActionButton>
  </ButtonContainer>
);

export default GameActions;
