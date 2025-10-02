import React from 'react';
import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const slideIn = keyframes`
  from {
    transform: translateY(-50px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 15px;
  padding: 15px;
  background-color: rgba(0, 0, 0, 0.5);
  border-top: 2px solid rgba(255, 215, 0, 0.3);
  animation: ${slideIn} 0.5s ease;
`;

const ActionButton = styled.button`
  background: ${props => {
    if (props.disabled) return 'linear-gradient(to bottom, #666, #444)';
    if (props.color === 'green') return 'linear-gradient(to bottom, #006400, #004d00)';
    if (props.color === 'blue') return 'linear-gradient(to bottom, #4682B4, #36648B)';
    return 'linear-gradient(to bottom, #B22222, #8B0000)';
  }};
  color: white;
  font-size: 1.1rem;
  font-weight: bold;
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
  
  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.2),
      transparent
    );
    transition: all 0.5s ease;
  }
  
  &:hover:not(:disabled) {
    transform: translateY(-3px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.4);
    
    &:before {
      left: 100%;
    }
  }
  
  &:active:not(:disabled) {
    transform: translateY(1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }
  
  &:disabled {
    cursor: not-allowed;
    opacity: 0.7;
  }
`;

const GameActions = ({ 
  onTruco, 
  onRetruco,
  onVale4,
  onEnvido, 
  onFlor, 
  onLeaveRoom,
  onReady,
  isReady,
  showReadyButton,
  disableTruco = false,
  disableRetruco = false,
  disableVale4 = false,
  disableEnvido = false,
  disableFlor = false
}) => {
  return (
    <ButtonContainer>
      {showReadyButton && (
        <ActionButton 
          onClick={onReady}
          disabled={isReady}
          color={isReady ? "green" : "blue"}
        >
          {isReady ? "Pronto!" : "Pronto"}
        </ActionButton>
      )}
      
      <ActionButton 
        onClick={onTruco}
        disabled={disableTruco}
      >
        Truco
      </ActionButton>

      <ActionButton 
        onClick={onRetruco}
        disabled={disableRetruco}
      >
        Retruco
      </ActionButton>

      <ActionButton 
        onClick={onVale4}
        disabled={disableVale4}
      >
        Vale 4
      </ActionButton>
      
      <ActionButton 
        onClick={onEnvido}
        disabled={disableEnvido}
        color="green"
      >
        Envido
      </ActionButton>
      
      <ActionButton 
        onClick={onFlor}
        disabled={disableFlor}
        color="green"
      >
        Flor
      </ActionButton>
      
      <ActionButton 
        onClick={onLeaveRoom}
        color="blue"
      >
        Sair da Sala
      </ActionButton>
    </ButtonContainer>
  );
};

export default GameActions;
