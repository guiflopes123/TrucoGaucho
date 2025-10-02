import React from 'react';
import styled, { keyframes, css } from 'styled-components';

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const slideUp = keyframes`
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`;

const pulse = keyframes`
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.3);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
`;

const glow = keyframes`
  0% {
    box-shadow: 0 0 5px #B22222;
  }
  50% {
    box-shadow: 0 0 20px #B22222;
  }
  100% {
    box-shadow: 0 0 5px #B22222;
  }
`;

const PlayerContainer = styled.div`
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: ${fadeIn} 0.5s ease;
  left: 20px;
  
  &.player-0 {
    bottom: 20px;
  }
  
  &.player-1 {
    top: 20px;
  }
  
  &.player-2 {
    top: 50%;
    transform: translateY(-50%);
  }
  
  &.player-3 {
    bottom: 50%;
    transform: translateY(50%);
  }
`;

const PlayerInfo = styled.div`
  background: ${props => props.isCurrentPlayer 
    ? 'linear-gradient(to bottom, rgba(255, 215, 0, 0.8), rgba(184, 134, 11, 0.8))'
    : 'linear-gradient(to bottom, rgba(0, 0, 0, 0.7), rgba(40, 40, 40, 0.7))'};
  padding: 8px 15px;
  border-radius: 10px;
  margin-bottom: 15px;
  min-width: 140px;
  text-align: center;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  border: 1px solid ${props => props.isCurrentPlayer ? '#FFD700' : 'rgba(255, 255, 255, 0.2)'};
  animation: ${slideUp} 0.5s ease;
`;

const PlayerScore = styled.div`
  font-size: 1.2rem;
  font-weight: bold;
  color: #FFD700;
  margin-bottom: 5px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
`;

const PlayerName = styled.div`
  font-weight: bold;
  font-size: 1.1rem;
  color: ${props => props.isCurrentPlayer ? '#000' : '#fff'};
  margin-bottom: 5px;
  text-shadow: ${props => props.isCurrentPlayer ? '0 1px 2px rgba(0, 0, 0, 0.3)' : 'none'};
`;

const PlayerStatus = styled.div`
  font-size: 0.9rem;
  color: ${props => props.isCurrentPlayer ? '#000' : 'rgba(255, 255, 255, 0.8)'};
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 5px;
`;

const TeamIndicator = styled.div`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: ${props => props.team === 1 ? '#4169E1' : '#B22222'};
  display: inline-block;
  margin-right: 5px;
`;

const TurnIndicator = styled.div`
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-top: 10px solid #FFD700;
  animation: ${fadeIn} 0.3s ease;
`;

const RoundWinMarker = styled.div`
  width: 15px;
  height: 15px;
  border-radius: 50%;
  background-color: ${props => props.won ? '#B22222' : 'rgba(255, 255, 255, 0.3)'};
  margin: 0 5px;
  display: inline-block;
  box-shadow: ${props => props.won ? '0 0 10px #B22222' : 'none'};
  ${props => props.won && css`
    animation: ${pulse} 1s infinite, ${glow} 1.5s infinite;
  `}
  border: 2px solid ${props => props.won ? '#B22222' : 'rgba(255, 255, 255, 0.5)'};
  transition: all 0.3s ease;
  position: relative;

  &::after {
    content: '${props => props.roundNumber}';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: ${props => props.won ? '#fff' : 'rgba(255, 255, 255, 0.5)'};
    font-size: 10px;
    font-weight: bold;
  }
`;

const RoundWinIndicators = styled.div`
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 5px;
  padding: 5px;
  background-color: rgba(0, 0, 0, 0.7);
  border-radius: 15px;
  border: 1px solid rgba(255, 255, 255, 0.2);
`;

const PlayerPosition = ({ 
  player, 
  position, 
  children,
  teams 
}) => {
  if (!player) return null;
  
  const team = player.team;
  const teamData = teams?.find(t => t.id === team);
  
  console.log('PlayerPosition render:', {
    playerName: player.name,
    team,
    teamData,
    roundsWon: teamData?.roundsWon,
    score: teamData?.score,
    allTeams: teams,
    markers: {
      first: teamData?.roundsWon === 1,
      second: teamData?.roundsWon === 2
    }
  });
  
  return (
    <PlayerContainer className={`player-${position}`}>
      <PlayerInfo isCurrentPlayer={player.isCurrentPlayer}>
        {player.isCurrentPlayer && <TurnIndicator />}
        <PlayerScore>{teamData?.score || 0} pontos</PlayerScore>
        <PlayerName isCurrentPlayer={player.isCurrentPlayer}>
          <TeamIndicator team={team} />
          {player.name}
        </PlayerName>
        <RoundWinIndicators>
          <RoundWinMarker 
            won={teamData?.roundsWon >= 1} 
            roundNumber={1}
          />
          <RoundWinMarker 
            won={teamData?.roundsWon >= 2} 
            roundNumber={2}
          />
        </RoundWinIndicators>
        <PlayerStatus isCurrentPlayer={player.isCurrentPlayer}>
          {player.isCurrentPlayer ? 'Sua vez!' : ''}
        </PlayerStatus>
      </PlayerInfo>
      {children}
    </PlayerContainer>
  );
};

export default PlayerPosition;
