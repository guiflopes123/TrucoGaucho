import React from 'react';
import styled, { keyframes } from 'styled-components';

const pulse = keyframes`
  0% {
    transform: scale(1);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.05);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 0.8;
  }
`;

const TurnIndicatorContainer = styled.div`
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.8);
  color: #FFD700;
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 1.5rem;
  font-weight: bold;
  text-align: center;
  z-index: 1000;
  border: 2px solid #FFD700;
  box-shadow: 0 0 15px rgba(255, 215, 0, 0.5);
  animation: ${pulse} 2s infinite;
  min-width: 300px;
`;

const TurnIndicator = ({ currentPlayerName, isCurrentPlayer }) => {
  if (!currentPlayerName) return null;
  
  return (
    <TurnIndicatorContainer>
      {isCurrentPlayer 
        ? 'É a sua vez de jogar!' 
        : `Vez de ${currentPlayerName} jogar`}
    </TurnIndicatorContainer>
  );
};

export default TurnIndicator; 