import React from 'react';
import styled, { css, keyframes } from 'styled-components';

const dealAnimation = keyframes`
  from { transform: translateY(-60px) rotate(5deg); opacity: 0; }
  to { transform: translateY(0) rotate(0deg); opacity: 1; }
`;

const FACE_LABELS = { 1: 'A', 10: 'Q', 11: 'J', 12: 'K' };
const SUIT_SYMBOLS = { copas: '♥', ouros: '♦', paus: '♣', espadas: '♠' };
const SUIT_NAMES = { copas: 'copas', ouros: 'ouros', paus: 'paus', espadas: 'espadas' };

const sizeStyles = {
  md: css`
    width: var(--card-w, 84px);
    height: var(--card-h, 120px);
  `,
  sm: css`
    width: calc(var(--card-w, 84px) * 0.5);
    height: calc(var(--card-h, 120px) * 0.5);
  `
};

const CardBase = styled.div`
  ${props => sizeStyles[props.$size] || sizeStyles.md}
  position: relative;
  flex-shrink: 0;
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  box-sizing: border-box;
`;

const CardFront = styled(CardBase).attrs(props => ({
  as: props.$playable ? 'button' : 'div'
}))`
  background-color: white;
  color: ${props => (props.$red ? '#d40000' : '#000')};
  border: 1px solid #ccc;
  padding: 3px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  font-family: inherit;
  cursor: ${props => (props.$playable ? 'pointer' : 'default')};
  transition: transform 0.2s ease;
  ${props => props.$animate && css`
    animation: ${dealAnimation} 0.5s ease both;
    animation-delay: ${props.$index * 0.1}s;
  `}
  ${props => props.$manilha && css`
    border: 3px solid gold;
    box-shadow: 0 0 10px gold;
  `}
  ${props => props.$highlight && css`
    border: 3px solid #4caf50;
    box-shadow: 0 0 18px 4px rgba(76, 175, 80, 0.85);
  `}
  ${props => props.$playable && css`
    &:hover, &:focus-visible {
      transform: translateY(-14px);
      z-index: 10;
    }
    &:focus-visible {
      outline: 3px solid #ffd700;
      outline-offset: 2px;
    }
  `}
`;

const Corner = styled.div`
  display: flex;
  flex-direction: column;
  align-items: ${props => (props.$bottom ? 'flex-end' : 'flex-start')};
  font-weight: bold;
  line-height: 1;
  font-size: calc(var(--card-w, 84px) * 0.2);
  ${props => props.$bottom && 'transform: rotate(180deg);'}
`;

const Center = styled.div`
  text-align: center;
  font-size: calc(var(--card-w, 84px) * 0.42);
  line-height: 1;
`;

const Back = styled(CardBase)`
  background-color: #006400;
  background-image: repeating-linear-gradient(45deg, #004d00, #004d00 10px, #006400 10px, #006400 20px);
  border: 2px solid #ffd700;
`;

export const CardBack = ({ size = 'sm' }) => <Back $size={size} aria-hidden="true" />;

const PlayingCard = ({ card, isPlayable = false, onClick, index = 0, size = 'md', highlight = false }) => {
  if (!card) return null;

  const label = FACE_LABELS[card.value] || card.value;
  const symbol = SUIT_SYMBOLS[card.suit] || '';
  const description = `${label} de ${SUIT_NAMES[card.suit] || card.suit}${card.isManilha ? ' (manilha)' : ''}${highlight ? ' — venceu a rodada' : ''}`;

  const handleClick = () => {
    if (isPlayable && onClick) onClick(card);
  };

  return (
    <CardFront
      $size={size}
      $red={card.suit === 'copas' || card.suit === 'ouros'}
      $playable={isPlayable}
      $manilha={card.isManilha}
      $highlight={highlight}
      $animate={isPlayable}
      $index={index}
      type={isPlayable ? 'button' : undefined}
      onClick={isPlayable ? handleClick : undefined}
      aria-label={isPlayable ? `Jogar ${description}` : description}
    >
      <Corner><span>{label}</span><span>{symbol}</span></Corner>
      <Center>{symbol}</Center>
      <Corner $bottom><span>{label}</span><span>{symbol}</span></Corner>
    </CardFront>
  );
};

export default PlayingCard;
