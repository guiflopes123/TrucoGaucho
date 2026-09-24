import React from 'react';
import styled, { css } from 'styled-components';
import { CardBack } from './PlayingCard';

const seatPositions = {
  bottom: css`
    bottom: 8px;
    left: 50%;
    transform: translateX(-50%);
  `,
  top: css`
    top: 8px;
    left: 50%;
    transform: translateX(-50%);
  `,
  left: css`
    left: 8px;
    top: 50%;
    transform: translateY(-50%);
  `,
  right: css`
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
  `
};

const Seat = styled.div`
  position: absolute;
  ${props => seatPositions[props.$seat]}
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
`;

const Info = styled.div`
  min-width: 120px;
  padding: 6px 12px;
  border-radius: 10px;
  text-align: center;
  color: ${props => (props.$turn ? '#1b1b1b' : '#fff')};
  background: ${props => (props.$turn
    ? 'linear-gradient(to bottom, rgba(255, 215, 0, 0.95), rgba(184, 134, 11, 0.95))'
    : 'linear-gradient(to bottom, rgba(0, 0, 0, 0.75), rgba(40, 40, 40, 0.75))')};
  border: 1px solid ${props => (props.$turn ? '#ffd700' : 'rgba(255, 255, 255, 0.2)')};
  box-shadow: ${props => (props.$turn ? '0 0 14px rgba(255, 215, 0, 0.7)' : '0 3px 6px rgba(0, 0, 0, 0.3)')};
  opacity: ${props => (props.$offline ? 0.55 : 1)};

  @media (max-width: 520px) {
    min-width: 72px;
    padding: 4px 8px;
  }
`;

const Name = styled.div`
  font-weight: bold;
  font-size: 1rem;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  @media (max-width: 520px) {
    font-size: 0.85rem;
    max-width: 84px;
  }
`;

const TeamDot = styled.span`
  display: inline-block;
  width: 10px;
  height: 10px;
  margin-right: 6px;
  border-radius: 50%;
  background: ${props => (props.$mine ? '#4169e1' : '#b22222')};
  border: 1px solid rgba(255, 255, 255, 0.6);
`;

const Tags = styled.div`
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-top: 2px;
  font-size: 0.75rem;
  min-height: 1em;
`;

const Tag = styled.span`
  padding: 1px 6px;
  border-radius: 8px;
  background: ${props => props.$bg || 'rgba(255, 255, 255, 0.2)'};
  color: ${props => props.$color || 'inherit'};
`;

const MiniHand = styled.div`
  display: flex;
  gap: 3px;
`;

const PlayerPosition = ({ player, seat, isMe, myTeam, isStarter, isTurn }) => {
  const mine = player.team === myTeam;

  return (
    <Seat $seat={seat} aria-label={`Jogador ${player.name}`}>
      <Info $turn={isTurn} $offline={!player.connected}>
        <Name title={player.name}>
          <TeamDot $mine={mine} />
          {player.name}{isMe ? ' (você)' : ''}
        </Name>
        <Tags>
          {isTurn && <Tag $bg="rgba(0,0,0,0.25)">{isMe ? 'Sua vez!' : 'Vez dele'}</Tag>}
          {isStarter && <Tag>Mão</Tag>}
          {player.isBot && <Tag $bg="#4682b4" $color="#fff">bot</Tag>}
          {!player.connected && <Tag $bg="#b22222" $color="#fff">offline</Tag>}
        </Tags>
      </Info>
      {!isMe && player.handCount > 0 && (
        <MiniHand aria-label={`${player.handCount} cartas na mão`}>
          {Array.from({ length: player.handCount }, (_, i) => <CardBack key={i} />)}
        </MiniHand>
      )}
    </Seat>
  );
};

export default PlayerPosition;
