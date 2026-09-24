import React, { useEffect, useId, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { ENVIDO_LABELS, FLOR_LABELS } from '../utils/gameLogic';
import PlayingCard from './PlayingCard';

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideUp = keyframes`
  from { transform: translateY(40px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

const DialogOverlay = styled.div`
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
  padding: 16px;
  animation: ${fadeIn} 0.3s ease;
`;

const DialogContainer = styled.div`
  background: linear-gradient(to bottom, #004d00, #003300);
  border-radius: 15px;
  padding: 24px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  border: 2px solid #ffd700;
  animation: ${slideUp} 0.4s ease;
`;

const DialogTitle = styled.h2`
  color: #ffd700;
  text-align: center;
  margin: 0 0 16px;
  font-size: 1.6rem;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
`;

const DialogContent = styled.div`
  color: white;
  margin-bottom: 20px;
  text-align: center;
  font-size: 1.05rem;
  line-height: 1.4;
`;

const ButtonsContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
`;

const variantBackground = {
  confirm: 'linear-gradient(to bottom, #b22222, #8b0000)',
  secondary: 'linear-gradient(to bottom, #006400, #004d00)',
  default: 'linear-gradient(to bottom, #4682b4, #36648b)'
};

const DialogButton = styled.button`
  background: ${props => variantBackground[props.$variant] || variantBackground.default};
  color: white;
  font-size: 1.05rem;
  font-weight: bold;
  padding: 10px 18px;
  border-radius: 8px;
  border: none;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  min-width: 120px;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.4);
  }

  &:focus-visible {
    outline: 3px solid #ffd700;
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

// Diálogo base: foco no primeiro botão, Esc fecha (quando há onClose) e semântica de modal.
const GameDialog = ({ title, content, onClose, buttons = [], showCancel = true }) => {
  const titleId = useId();
  const containerRef = useRef(null);

  useEffect(() => {
    const firstButton = containerRef.current && containerRef.current.querySelector('button:not(:disabled)');
    if (firstButton) firstButton.focus();
  }, []);

  useEffect(() => {
    if (!onClose) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <DialogOverlay>
      <DialogContainer ref={containerRef} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <DialogTitle id={titleId}>{title}</DialogTitle>
        {content && <DialogContent>{content}</DialogContent>}
        <ButtonsContainer>
          {buttons.map((button) => (
            <DialogButton
              key={button.label}
              type="button"
              $variant={button.variant}
              disabled={button.disabled}
              onClick={button.onClick}
            >
              {button.label}
            </DialogButton>
          ))}
          {showCancel && onClose && (
            <DialogButton type="button" onClick={onClose}>Cancelar</DialogButton>
          )}
        </ButtonsContainer>
      </DialogContainer>
    </DialogOverlay>
  );
};

export const TrucoDialog = ({ onConfirm, onCancel }) => (
  <GameDialog
    title="Pedir Truco?"
    content="Isso aumentará o valor da mão para 2 pontos."
    onClose={onCancel}
    buttons={[{ label: 'Confirmar', variant: 'confirm', onClick: onConfirm }]}
  />
);

export const EnvidoDialog = ({ myEnvido, onEnvido, onRealEnvido, onFaltaEnvido, onCancel }) => (
  <GameDialog
    title="Escolha o tipo de Envido"
    content={<>Seu Envido: <strong>{myEnvido}</strong></>}
    onClose={onCancel}
    buttons={[
      { label: 'Envido', variant: 'confirm', onClick: onEnvido },
      { label: 'Real Envido', variant: 'secondary', onClick: onRealEnvido },
      { label: 'Falta Envido', variant: 'secondary', onClick: onFaltaEnvido }
    ]}
  />
);

export const FlorDialog = ({ myFlor, onFlor, onCancel }) => (
  <GameDialog
    title="Cantar Flor?"
    content={<>Sua Flor: <strong>{myFlor}</strong>. Vale 3 pontos.</>}
    onClose={onCancel}
    buttons={[{ label: 'Cantar Flor', variant: 'confirm', onClick: onFlor }]}
  />
);

export const TrucoResponseDialog = ({ requesterName, onAccept, onRetruco, onDecline }) => (
  <GameDialog
    title="TRUCO!"
    content={`${requesterName} pediu Truco. Como você responde?`}
    buttons={[
      { label: 'Aceitar', variant: 'confirm', onClick: onAccept },
      { label: 'Retruco', variant: 'secondary', onClick: onRetruco },
      { label: 'Recusar', onClick: onDecline }
    ]}
  />
);

export const RetrucoResponseDialog = ({ requesterName, onAccept, onVale4, onDecline }) => (
  <GameDialog
    title="RETRUCO!"
    content={`${requesterName} pediu Retruco. Como você responde?`}
    buttons={[
      { label: 'Aceitar', variant: 'confirm', onClick: onAccept },
      { label: 'Vale 4', variant: 'secondary', onClick: onVale4 },
      { label: 'Recusar', onClick: onDecline }
    ]}
  />
);

export const Vale4ResponseDialog = ({ requesterName, onAccept, onDecline }) => (
  <GameDialog
    title="VALE 4!"
    content={`${requesterName} pediu Vale 4. Como você responde?`}
    buttons={[
      { label: 'Aceitar', variant: 'confirm', onClick: onAccept },
      { label: 'Recusar', onClick: onDecline }
    ]}
  />
);

export const EnvidoResponseDialog = ({ level, requesterName, myEnvido, onAccept, onReal, onFalta, onDecline }) => {
  const buttons = [{ label: 'Aceitar', variant: 'confirm', onClick: onAccept }];
  if (level === 'envido') buttons.push({ label: 'Real Envido', variant: 'secondary', onClick: onReal });
  if (level === 'envido' || level === 'real_envido') {
    buttons.push({ label: 'Falta Envido', variant: 'secondary', onClick: onFalta });
  }
  buttons.push({ label: 'Recusar', onClick: onDecline });

  return (
    <GameDialog
      title={`${ENVIDO_LABELS[level] || 'Envido'}!`.toUpperCase()}
      content={<>{requesterName} pediu {ENVIDO_LABELS[level] || 'Envido'}. Seu Envido: <strong>{myEnvido}</strong></>}
      buttons={buttons}
    />
  );
};

export const FlorResponseDialog = ({ level, requesterName, hasFlor, myFlor, onAccept, onContra, onContraResto, onDecline }) => {
  const buttons = [{ label: 'Aceitar', variant: 'confirm', onClick: onAccept }];
  if (hasFlor && level === 'flor') buttons.push({ label: 'Contra-Flor', variant: 'secondary', onClick: onContra });
  if (hasFlor && (level === 'flor' || level === 'contra_flor')) {
    buttons.push({ label: 'Contra-Flor e o Resto', variant: 'secondary', onClick: onContraResto });
  }
  buttons.push({ label: 'Recusar', onClick: onDecline });

  return (
    <GameDialog
      title={`${FLOR_LABELS[level] || 'Flor'}!`.toUpperCase()}
      content={(
        <>
          {requesterName} pediu {FLOR_LABELS[level] || 'Flor'}.
          {hasFlor ? <> Sua Flor: <strong>{myFlor}</strong></> : ' Você não tem Flor.'}
        </>
      )}
      buttons={buttons}
    />
  );
};

const PartnerCards = styled.div`
  display: flex;
  justify-content: center;
  gap: 8px;
  margin: 12px 0 4px;
`;

const PasswordField = styled.input`
  width: 100%;
  margin-top: 10px;
  padding: 10px;
  border-radius: 6px;
  border: 2px solid #ffd700;
  font-size: 1rem;
`;

export const OnzeDialog = ({ partnerHands, onPlay, onRun }) => (
  <GameDialog
    title="MÃO DE ONZE!"
    content={(
      <>
        <p>
          Seu time está com 11 pontos. <strong>Jogar</strong> vale 3 pontos para quem vencer a mão;
          {' '}<strong>correr</strong> dá 1 ponto ao adversário. Não há apostas nesta mão.
        </p>
        {partnerHands.map(partner => (
          <div key={partner.id}>
            <p>Cartas de {partner.name}:</p>
            <PartnerCards>
              {partner.hand.map(card => <PlayingCard key={`${card.value}-${card.suit}`} card={card} size="sm" />)}
            </PartnerCards>
          </div>
        ))}
      </>
    )}
    buttons={[
      { label: 'Jogar', variant: 'confirm', onClick: onPlay },
      { label: 'Correr', onClick: onRun }
    ]}
  />
);

export const PasswordDialog = ({ roomName, error, onSubmit, onCancel }) => {
  const inputRef = useRef(null);

  const submit = (event) => {
    event.preventDefault();
    onSubmit(inputRef.current.value);
  };

  return (
    <GameDialog
      title="Sala com senha"
      onClose={onCancel}
      showCancel
      content={(
        <form id="password-form" onSubmit={submit}>
          <label htmlFor="room-password">
            {roomName ? `Digite a senha da sala "${roomName}"` : 'Digite a senha da sala'}
          </label>
          <PasswordField id="room-password" ref={inputRef} type="password" autoComplete="off" maxLength={30} />
          {error && <p role="alert">{error}</p>}
        </form>
      )}
      buttons={[
        {
          label: 'Entrar',
          variant: 'confirm',
          onClick: () => onSubmit(inputRef.current ? inputRef.current.value : '')
        }
      ]}
    />
  );
};

export const GameOverDialog = ({ won, votes, total, hasVoted, onRematch, onLeave }) => (
  <GameDialog
    title="Fim de Jogo!"
    content={(
      <>
        <p>{won ? 'Vocês venceram a partida! 🎉' : 'Seus adversários venceram a partida.'}</p>
        {hasVoted && <p>Aguardando os outros jogadores ({votes}/{total})...</p>}
      </>
    )}
    showCancel={false}
    buttons={[
      { label: 'Jogar novamente', variant: 'confirm', onClick: onRematch, disabled: hasVoted },
      { label: 'Voltar ao Lobby', onClick: onLeave }
    ]}
  />
);

export default GameDialog;
