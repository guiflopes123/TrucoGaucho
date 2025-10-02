import React from 'react';
import styled, { keyframes } from 'styled-components';

const pulse = keyframes`
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
`;

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
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`;

const TableContainer = styled.div`
  flex: 1;
  background: radial-gradient(ellipse at center, #006400 0%, #004d00 100%);
  border-radius: 50%;
  margin: 20px;
  position: relative;
  box-shadow: 0 0 30px rgba(0, 0, 0, 0.5), inset 0 0 50px rgba(0, 0, 0, 0.3);
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: visible;
  min-height: 500px;
  
  &:before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 80%;
    height: 80%;
    border-radius: 50%;
    border: 2px solid rgba(255, 215, 0, 0.3);
    pointer-events: none;
  }
`;

const CenterArea = styled.div`
  position: absolute;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  width: 300px;
  height: 300px;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.1);
`;

const ScoreDisplay = styled.div`
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.7);
  color: #FFD700;
  padding: 5px 15px;
  border-radius: 20px;
  font-size: 1.2rem;
  font-weight: bold;
  z-index: 5;
  animation: ${fadeIn} 0.5s ease;
`;

const HandValueDisplay = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(0, 0, 0, 0.7);
  color: #FFD700;
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 1.5rem;
  font-weight: bold;
  z-index: 5;
  animation: ${pulse} 1s infinite;
`;

const TrucoIndicator = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(178, 34, 34, 0.8);
  color: white;
  padding: 15px 30px;
  border-radius: 10px;
  font-size: 2rem;
  font-weight: bold;
  z-index: 10;
  animation: ${slideIn} 0.5s ease, ${pulse} 1s infinite;
`;

const EnvidoIndicator = styled(TrucoIndicator)`
  background-color: rgba(0, 100, 0, 0.8);
`;

const GameTable = ({
  team1Score = 0,
  team2Score = 0,
  currentRound = 1,
  team1RoundsWon = 0,
  team2RoundsWon = 0,
  handValue = 0,
  showTruco = false,
  showEnvido = false,
  envidoType = 'Envido',
  children
}) => {
  console.log('GameTable props:', { team1Score, team2Score, currentRound, team1RoundsWon, team2RoundsWon, handValue, showTruco, showEnvido, envidoType });
  
  return (
    <TableContainer>
      <ScoreDisplay>
        {team1Score} - {team2Score}
      </ScoreDisplay>
      
  
      
      {showEnvido && (
        <EnvidoIndicator>
          {envidoType.toUpperCase()}!
        </EnvidoIndicator>
      )}
      
      <CenterArea>
        {children}
      </CenterArea>
    </TableContainer>
  );
};

export default GameTable;
