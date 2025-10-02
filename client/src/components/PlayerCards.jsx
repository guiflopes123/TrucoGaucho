const handleCardClick = (card) => {
  if (isCurrentPlayer && !isCardPlayed(card)) {
    onCardClick(card);
  }
}; 