import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';

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
    transform: translateY(50px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`;

const DialogOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
  animation: ${fadeIn} 0.3s ease;
`;

const DialogContainer = styled.div`
  background: linear-gradient(to bottom, #004d00, #003300);
  border-radius: 15px;
  padding: 25px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  border: 2px solid #FFD700;
  animation: ${slideUp} 0.4s ease;
`;

const DialogTitle = styled.h2`
  color: #FFD700;
  text-align: center;
  margin-top: 0;
  margin-bottom: 20px;
  font-size: 1.8rem;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
`;

const DialogContent = styled.div`
  color: white;
  margin-bottom: 25px;
  text-align: center;
  font-size: 1.1rem;
`;

const ButtonsContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 15px;
  flex-wrap: wrap;
`;

const DialogButton = styled.button`
  background: ${props => {
    if (props.variant === 'confirm') return 'linear-gradient(to bottom, #B22222, #8B0000)';
    if (props.variant === 'secondary') return 'linear-gradient(to bottom, #006400, #004d00)';
    return 'linear-gradient(to bottom, #4682B4, #36648B)';
  }};
  color: white;
  font-size: 1.1rem;
  font-weight: bold;
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
  min-width: 120px;
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.4);
  }
  
  &:active {
    transform: translateY(1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }
`;

const GameDialog = ({ 
  title, 
  content, 
  onClose, 
  buttons = [],
  showCancel = true
}) => {
  return (
    <DialogOverlay onClick={e => e.stopPropagation()}>
      <DialogContainer>
        <DialogTitle>{title}</DialogTitle>
        
        {content && <DialogContent>{content}</DialogContent>}
        
        <ButtonsContainer>
          {buttons.map((button, index) => (
            <DialogButton
              key={index}
              variant={button.variant || 'default'}
              onClick={button.onClick}
            >
              {button.label}
            </DialogButton>
          ))}
          
          {showCancel && (
            <DialogButton variant="cancel" onClick={onClose}>
              Cancelar
            </DialogButton>
          )}
        </ButtonsContainer>
      </DialogContainer>
    </DialogOverlay>
  );
};

// Componentes específicos para diferentes tipos de diálogos
export const TrucoDialog = ({ onConfirm, onCancel }) => (
  <GameDialog
    title="Pedir Truco?"
    content="Isso aumentará o valor da mão para 2 pontos."
    onClose={onCancel}
    buttons={[
      { label: 'Confirmar', variant: 'confirm', onClick: onConfirm }
    ]}
  />
);

export const EnvidoDialog = ({ onEnvido, onRealEnvido, onFaltaEnvido, onCancel }) => (
  <GameDialog
    title="Escolha o tipo de Envido"
    onClose={onCancel}
    buttons={[
      { label: 'Envido', variant: 'confirm', onClick: onEnvido },
      { label: 'Real Envido', variant: 'secondary', onClick: onRealEnvido },
      { label: 'Falta Envido', variant: 'secondary', onClick: onFaltaEnvido }
    ]}
  />
);

export const FlorDialog = ({ onFlor, onContraFlor, onContraFlorResto, onCancel }) => (
  <GameDialog
    title="Escolha o tipo de Flor"
    onClose={onCancel}
    buttons={[
      { label: 'Flor', variant: 'confirm', onClick: onFlor },
      { label: 'Contra-Flor', variant: 'secondary', onClick: onContraFlor },
      { label: 'Contra-Flor e o Resto', variant: 'secondary', onClick: onContraFlorResto }
    ]}
  />
);

export const TrucoResponseDialog = ({ onAccept, onRetruco, onDecline }) => (
  <GameDialog
    title="TRUCO!"
    content="Como você deseja responder?"
    onClose={() => {}}
    showCancel={false}
    buttons={[
      { label: 'Aceitar', variant: 'confirm', onClick: onAccept },
      { label: 'Retruco', variant: 'secondary', onClick: onRetruco },
      { label: 'Recusar', variant: 'cancel', onClick: onDecline }
    ]}
  />
);

export const RetrucoResponseDialog = ({ onAccept, onVale4, onDecline }) => (
  <GameDialog
    title="RETRUCO!"
    content="Como você deseja responder?"
    onClose={() => {}}
    showCancel={false}
    buttons={[
      { label: 'Aceitar', variant: 'confirm', onClick: onAccept },
      { label: 'Vale 4', variant: 'secondary', onClick: onVale4 },
      { label: 'Recusar', variant: 'cancel', onClick: onDecline }
    ]}
  />
);

export const Vale4ResponseDialog = ({ onAccept, onDecline }) => (
  <GameDialog
    title="VALE 4!"
    content="Como você deseja responder?"
    onClose={() => {}}
    showCancel={false}
    buttons={[
      { label: 'Aceitar', variant: 'confirm', onClick: onAccept },
      { label: 'Recusar', variant: 'cancel', onClick: onDecline }
    ]}
  />
);

export const GameOverDialog = ({ winner, onReturn }) => (
  <GameDialog
    title="Fim de Jogo!"
    content={`O time "${winner}" venceu a partida!`}
    onClose={onReturn}
    showCancel={false}
    buttons={[
      { label: 'Voltar ao Lobby', variant: 'confirm', onClick: onReturn }
    ]}
  />
);

export default GameDialog;
