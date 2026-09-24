import React from 'react';
import styled, { keyframes } from 'styled-components';

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.06); }
  100% { transform: scale(1); }
`;

const Wrapper = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const StatusBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 10px 16px;
  padding: 10px 12px 0;
`;

const TableContainer = styled.div`
  flex: 1;
  position: relative;
  margin: 10px 12px 12px;
  min-height: 460px;
  background: radial-gradient(ellipse at center, #006400 0%, #004d00 100%);
  border-radius: 48px;
  box-shadow: 0 0 30px rgba(0, 0, 0, 0.5), inset 0 0 50px rgba(0, 0, 0, 0.3);
  border: 3px solid rgba(255, 215, 0, 0.25);

  @media (max-width: 520px) {
    min-height: 400px;
    border-radius: 32px;
  }
`;

const Scoreboard = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 14px;
  border-radius: 20px;
  background: rgba(0, 0, 0, 0.75);
  color: #ffd700;
  font-weight: bold;
  white-space: nowrap;
`;

const Score = styled.span`
  font-size: 1.3rem;
  color: ${props => (props.$mine ? '#8fd19e' : '#ff9d9d')};
`;

const HandValue = styled.div`
  padding: 4px 12px;
  border-radius: 14px;
  background: rgba(178, 34, 34, 0.9);
  color: white;
  font-weight: bold;
  font-size: 0.9rem;
  animation: ${props => (props.$highlight ? pulse : 'none')} 1.4s infinite;
`;

const RoundPips = styled.div`
  display: flex;
  gap: 6px;
`;

const Pip = styled.span`
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.5);
  background: ${props => props.$color};
`;

const pipColor = (result, myTeam) => {
  if (!result) return 'transparent';
  if (!result.winnerTeam) return '#bbb';
  return result.winnerTeam === myTeam ? '#4caf50' : '#e53935';
};

const GameTable = ({ teams, myTeam, handValue, roundResults, showHand, children }) => {
  const mine = teams.find(t => t.id === myTeam) || teams[0];
  const theirs = teams.find(t => t.id !== mine.id) || teams[1];

  return (
    <Wrapper>
      <StatusBar>
        <Scoreboard aria-label={`Placar: nós ${mine.score}, eles ${theirs.score}`}>
          <span>Nós</span>
          <Score $mine>{mine.score}</Score>
          <span>×</span>
          <Score>{theirs.score}</Score>
          <span>Eles</span>
        </Scoreboard>

        {showHand && (
          <>
            <HandValue $highlight={handValue > 1}>Mão valendo {handValue}</HandValue>
            <RoundPips aria-label="Resultado das rodadas (verde: nós, vermelho: eles, cinza: empate)">
              {[0, 1, 2].map(i => <Pip key={i} $color={pipColor(roundResults[i], myTeam)} />)}
            </RoundPips>
          </>
        )}
      </StatusBar>

      <TableContainer aria-label="Mesa de jogo">{children}</TableContainer>
    </Wrapper>
  );
};

export default GameTable;
