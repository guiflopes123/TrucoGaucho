import React, { useState } from 'react';
import styled from 'styled-components';

const ReadyButtonContainer = styled.div`
  margin-top: 20px;
  display: flex;
  justify-content: center;
`;

const Button = styled.button`
  background: ${props => props.isReady ? '#4CAF50' : '#B22222'};
  color: white;
  font-size: 1.2rem;
  font-weight: bold;
  padding: 12px 25px;
  border-radius: 8px;
  border: none;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
  cursor: ${props => props.isReady ? 'default' : 'pointer'};
  opacity: ${props => props.isReady ? 0.8 : 1};
  
  &:hover {
    background: ${props => props.isReady ? '#4CAF50' : '#8B0000'};
    transform: ${props => props.isReady ? 'none' : 'translateY(-3px)'};
  }
  
  &:active {
    transform: ${props => props.isReady ? 'none' : 'translateY(1px)'};
  }
  
  &:disabled {
    background: #666;
    cursor: not-allowed;
    opacity: 0.7;
  }
`;

const ReadyStatus = styled.div`
  margin-top: 10px;
  text-align: center;
  color: #FFD700;
  font-size: 1rem;
`;

const PlayerReadyButton = ({ isReady, onReady, playersReady, totalPlayers, disabled }) => {
  return (
    <>
      <ReadyButtonContainer>
        <Button 
          onClick={onReady} 
          isReady={isReady}
          disabled={isReady || disabled}
        >
          {isReady ? 'Pronto!' : 'Estou Pronto'}
        </Button>
      </ReadyButtonContainer>
      
      <ReadyStatus>
        {playersReady} de {totalPlayers} jogadores prontos
      </ReadyStatus>
    </>
  );
};

export default PlayerReadyButton;
