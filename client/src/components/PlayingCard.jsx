import React, { useState, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';

const flipAnimation = keyframes`
  0% {
    transform: rotateY(0deg);
  }
  100% {
    transform: rotateY(180deg);
  }
`;

const dealAnimation = keyframes`
  0% {
    transform: translateY(-100px) rotate(5deg);
    opacity: 0;
  }
  100% {
    transform: translateY(0) rotate(0deg);
    opacity: 1;
  }
`;

const hoverAnimation = keyframes`
  0% {
    transform: translateY(0);
  }
  100% {
    transform: translateY(-15px);
  }
`;

const CardContainer = styled.div`
  width: 90px;
  height: 130px;
  perspective: 1000px;
  margin: 0 -10px;
  transition: transform 0.3s ease;
  animation: ${props => props.isPlayable ? dealAnimation : 'none'} 0.5s ease forwards;
  animation-delay: ${props => props.isPlayable ? props.index * 0.1 : 0}s;
  opacity: ${props => props.isPlayable ? 1 : 1};
  transform: ${props => props.isSelected ? 'translateY(-15px)' : 'translateY(0)'};
  
  &:hover {
    z-index: 10;
    ${props => props.isPlayable && css`
      transform: translateY(-15px);
    `}
  }
`;

const CardInner = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  text-align: center;
  transition: transform 0.6s;
  transform-style: preserve-3d;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  cursor: ${props => props.isPlayable ? 'pointer' : 'default'};
  
  ${props => props.flipped && `
    animation: ${flipAnimation} 0.6s forwards;
  `}
`;

const CardFace = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 3px;
  box-sizing: border-box;
`;

const CardFront = styled(CardFace)`
  background-color: white;
  color: ${props => props.isRed ? '#D40000' : '#000000'};
  border: 1px solid #ccc;
`;

const CardBack = styled(CardFace)`
  background-color: #006400;
  background-image: repeating-linear-gradient(
    45deg,
    #004d00,
    #004d00 10px,
    #006400 10px,
    #006400 20px
  );
  transform: rotateY(180deg);
  border: 1px solid #004d00;
  
  &:after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 60px;
    height: 60px;
    background-color: rgba(255, 215, 0, 0.7);
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    font-weight: bold;
    font-size: 1.5rem;
    color: #006400;
  }
`;

const CardCorner = styled.div`
  display: flex;
  flex-direction: column;
  align-items: ${props => props.position === 'top' ? 'flex-start' : 'flex-end'};
  font-weight: bold;
  font-size: 1.2rem;
  padding: 2px;
  width: 100%;
  box-sizing: border-box;
`;

const CardCenter = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 2rem;
  flex-grow: 1;
  width: 100%;
  box-sizing: border-box;
`;

const CardValue = styled.span`
  font-size: ${props => props.value === '10' ? '0.9rem' : '1rem'};
  line-height: 1;
`;

const CardSuit = styled.span`
  font-size: 1rem;
  line-height: 1;
`;

const ManilhaIndicator = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 10px;
  border: 3px solid gold;
  box-shadow: 0 0 10px gold;
  pointer-events: none;
`;

const PlayingCard = ({ card, isPlayable, onClick, faceDown, index = 0, isManilha = false }) => {
  const [isSelected, setIsSelected] = useState(false);

  // Resetar o estado quando a carta muda
  useEffect(() => {
    setIsSelected(false);
  }, [card]);

  const handleClick = () => {
    if (!isPlayable) return;

    // Jogar a carta com um único clique
      onClick(card, index);
  };

  // Mapear valores numéricos para representações de cartas
  const getDisplayValue = (value) => {
    switch (value) {
      case '1': return 'A';
      case '10': return '10';
      case '11': return 'J';
      case '12': return 'Q';
      default: return value;
    }
  };
  
  // Mapear naipes para símbolos
  const getSuitSymbol = (suit) => {
    switch (suit) {
      case 'copas': return '♥';
      case 'ouros': return '♦';
      case 'paus': return '♣';
      case 'espadas': return '♠';
      default: return '';
    }
  };
  
  if (!card) return null;
  
  const isRed = card.suit === 'copas' || card.suit === 'ouros';
  const displayValue = getDisplayValue(card.value);
  const suitSymbol = getSuitSymbol(card.suit);
  
  return (
    <CardContainer 
      onClick={handleClick} 
      isPlayable={isPlayable}
      isSelected={isSelected}
      index={index}
    >
      <CardInner flipped={faceDown}>
        <CardFront isRed={isRed}>
          <CardCorner position="top">
            <CardValue value={displayValue}>{displayValue}</CardValue>
            <CardSuit>{suitSymbol}</CardSuit>
          </CardCorner>
          <CardCenter>
            {suitSymbol}
          </CardCenter>
          <CardCorner position="bottom">
            <CardValue value={displayValue}>{displayValue}</CardValue>
            <CardSuit>{suitSymbol}</CardSuit>
          </CardCorner>
          {isManilha && <ManilhaIndicator />}
        </CardFront>
        <CardBack />
      </CardInner>
    </CardContainer>
  );
};

export default PlayingCard;