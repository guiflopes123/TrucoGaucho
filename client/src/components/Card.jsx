import React from 'react';
import styled from 'styled-components';

const CardContainer = styled.div`
  width: 80px;
  height: 120px;
  background-color: white;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 5px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
  cursor: ${props => props.isPlayable ? 'pointer' : 'default'};
  transition: transform 0.2s;
  position: relative;
  
  &:hover {
    transform: ${props => props.isPlayable ? 'translateY(-10px)' : 'none'};
  }
`;

const CardCorner = styled.div`
  display: flex;
  flex-direction: column;
  align-items: ${props => props.position === 'top' ? 'flex-start' : 'flex-end'};
  color: ${props => props.isRed ? '#D40000' : '#000000'};
  font-weight: bold;
  font-size: 1.2rem;
`;

const CardCenter = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 2rem;
  color: ${props => props.isRed ? '#D40000' : '#000000'};
`;

const CardBack = styled.div`
  width: 80px;
  height: 120px;
  background-color: #006400;
  background-image: repeating-linear-gradient(
    45deg,
    #004d00,
    #004d00 10px,
    #006400 10px,
    #006400 20px
  );
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
`;

const Card = ({ card, isPlayable, onClick, faceDown }) => {
  if (faceDown) {
    return <CardBack />;
  }
  
  const isRed = card.suit === 'copas' || card.suit === 'ouros';
  
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
  
  const displayValue = getDisplayValue(card.value);
  const suitSymbol = getSuitSymbol(card.suit);
  
  return (
    <CardContainer 
      isPlayable={isPlayable} 
      onClick={isPlayable ? () => onClick(card) : undefined}
    >
      <CardCorner position="top" isRed={isRed}>
        <span>{displayValue}</span>
        <span>{suitSymbol}</span>
      </CardCorner>
      
      <CardCenter isRed={isRed}>
        {suitSymbol}
      </CardCenter>
      
      <CardCorner position="bottom" isRed={isRed}>
        <span>{suitSymbol}</span>
        <span>{displayValue}</span>
      </CardCorner>
    </CardContainer>
  );
};

export default Card;
