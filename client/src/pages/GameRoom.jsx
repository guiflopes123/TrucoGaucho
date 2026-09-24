import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styled, { css } from 'styled-components';
import { useSocket } from '../context/SocketContext';
import { useGameSounds } from '../hooks/useGameSounds';
import { isSoundEnabled, setSoundEnabled } from '../utils/sound';
import PlayingCard from '../components/PlayingCard';
import GameTable from '../components/GameTable';
import PlayerPosition from '../components/PlayerPosition';
import GameActions from '../components/GameActions';
import CardGuide from '../components/CardGuide';
import ReadyCounter from '../components/ReadyCounter';
import TurnIndicator from '../components/TurnIndicator';
import NoticeToasts from '../components/NoticeToasts';
import ChatPanel from '../components/ChatPanel';
import {
  TrucoDialog,
  EnvidoDialog,
  FlorDialog,
  TrucoResponseDialog,
  RetrucoResponseDialog,
  Vale4ResponseDialog,
  EnvidoResponseDialog,
  FlorResponseDialog,
  OnzeDialog,
  PasswordDialog,
  GameOverDialog
} from '../components/GameDialog';
import {
  getAvailableActions,
  getMatchResult,
  getMe,
  getPartnerHands,
  getPendingResponse,
  getSeats,
  getWaitingOnOthers
} from '../utils/gameLogic';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #003300;
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;
  padding: 10px 16px;
  background-color: rgba(0, 0, 0, 0.5);
  border-bottom: 2px solid #ffd700;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 1.5rem;
  color: #ffd700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
`;

const HeaderTools = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;

  button {
    padding: 5px 12px;
    background: #4682b4;
    color: white;
    font-size: 0.85rem;
  }
`;

const RoomName = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ErrorBanner = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin: 10px 16px 0;
  padding: 10px 14px;
  border-radius: 6px;
  background-color: rgba(220, 53, 69, 0.85);
  color: white;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: white;
  font-size: 1.3rem;
  padding: 0 6px;
`;

const Area = styled.main`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const CenterOfTable = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  z-index: 2;
`;

const playedOffsets = {
  bottom: css`transform: translate(-50%, -5%);`,
  top: css`transform: translate(-50%, -105%);`,
  left: css`transform: translate(-160%, -50%);`,
  right: css`transform: translate(60%, -50%);`
};

const PlayedSlot = styled.div`
  position: absolute;
  ${props => playedOffsets[props.$seat]}
`;

const HandArea = styled.div`
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 10px;
  min-height: calc(var(--card-h, 120px) + 24px);
  padding: 10px;
`;

const Loading = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.2rem;
`;

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const field = document.createElement('textarea');
    field.value = text;
    document.body.appendChild(field);
    field.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(field);
    return ok;
  }
};

const GameRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const {
    connected,
    sessionReady,
    playerId,
    currentRoom,
    gameState,
    notices,
    chat,
    error,
    clearError,
    joinRoom,
    leaveRoom,
    setPlayerReady,
    playAgain,
    addBot,
    removeBot,
    sendChat,
    sendAction
  } = useSocket();

  const [showTrucoConfirm, setShowTrucoConfirm] = useState(false);
  const [showEnvidoMenu, setShowEnvidoMenu] = useState(false);
  const [showFlorConfirm, setShowFlorConfirm] = useState(false);
  const [passwordPrompt, setPasswordPrompt] = useState(null);
  const [copied, setCopied] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundEnabled);
  const joinAttempted = useRef(false);
  const leaving = useRef(false);

  // Sem sala no contexto (link direto, ou F5 já restaurado pelo servidor): entra pela URL.
  useEffect(() => {
    if (!connected || !sessionReady || leaving.current) return;

    if (currentRoom) {
      if (currentRoom.id !== roomId) navigate(`/room/${currentRoom.id}`, { replace: true });
      return;
    }

    const username = localStorage.getItem('username');
    if (!username) {
      navigate('/', { replace: true });
      return;
    }
    if (joinAttempted.current) return;
    joinAttempted.current = true;
    joinRoom(roomId, username).then((response) => {
      if (response.success) return;
      if (response.needsPassword) setPasswordPrompt({ error: null });
      else navigate('/lobby', { replace: true });
    });
  }, [connected, sessionReady, currentRoom, roomId, joinRoom, navigate]);

  const submitPassword = async (password) => {
    const response = await joinRoom(roomId, localStorage.getItem('username'), password);
    if (response.success) setPasswordPrompt(null);
    else if (response.needsPassword) setPasswordPrompt({ error: response.message });
    else navigate('/lobby', { replace: true });
  };

  const me = getMe(gameState, playerId);
  const myTeam = me ? me.team : null;
  const actions = useMemo(() => getAvailableActions(gameState, playerId), [gameState, playerId]);
  const pending = getPendingResponse(gameState, myTeam);
  const waitingOn = getWaitingOnOthers(gameState, myTeam);
  const result = getMatchResult(gameState, myTeam);
  const seats = useMemo(
    () => (gameState ? getSeats(gameState.players, playerId) : []),
    [gameState, playerId]
  );

  useGameSounds({ gameState, playerId, hasPendingResponse: Boolean(pending), result });

  const send = (event, payload) => sendAction(event, payload);

  const handleLeave = async () => {
    leaving.current = true;
    await leaveRoom();
    navigate('/lobby');
  };

  const handleCopyLink = async () => {
    const ok = await copyToClipboard(`${window.location.origin}/room/${roomId}`);
    setCopied(ok);
    if (ok) setTimeout(() => setCopied(false), 2000);
  };

  const toggleSound = () => {
    setSoundEnabled(!soundOn);
    setSoundOn(!soundOn);
  };

  const nameOf = (id) => {
    const player = gameState && gameState.players.find(p => p.id === id);
    return player ? player.name : 'O adversário';
  };

  const respond = (event, accept) => () => send(event, { accept });

  const renderResponseDialog = () => {
    if (!pending) return null;
    const requesterName = nameOf(pending.requestedBy);

    switch (pending.type) {
      case 'onze':
        return (
          <OnzeDialog
            partnerHands={getPartnerHands(gameState, playerId)}
            onPlay={() => send('onze_response', { play: true })}
            onRun={() => send('onze_response', { play: false })}
          />
        );
      case 'truco':
        return (
          <TrucoResponseDialog
            requesterName={requesterName}
            onAccept={respond('truco_response', true)}
            onRetruco={() => send('retruco')}
            onDecline={respond('truco_response', false)}
          />
        );
      case 'retruco':
        return (
          <RetrucoResponseDialog
            requesterName={requesterName}
            onAccept={respond('retruco_response', true)}
            onVale4={() => send('vale4')}
            onDecline={respond('retruco_response', false)}
          />
        );
      case 'vale4':
        return (
          <Vale4ResponseDialog
            requesterName={requesterName}
            onAccept={respond('vale4_response', true)}
            onDecline={respond('vale4_response', false)}
          />
        );
      case 'envido':
        return (
          <EnvidoResponseDialog
            level={pending.level}
            requesterName={requesterName}
            myEnvido={gameState.me ? gameState.me.envido : 0}
            onAccept={respond('envido_response', true)}
            onReal={() => send('real_envido')}
            onFalta={() => send('falta_envido')}
            onDecline={respond('envido_response', false)}
          />
        );
      case 'flor':
        return (
          <FlorResponseDialog
            level={pending.level}
            requesterName={requesterName}
            hasFlor={Boolean(gameState.me && gameState.me.hasFlor)}
            myFlor={gameState.me ? gameState.me.flor : 0}
            onAccept={respond('flor_response', true)}
            onContra={() => send('contra_flor')}
            onContraResto={() => send('contra_flor_resto')}
            onDecline={respond('flor_response', false)}
          />
        );
      default:
        return null;
    }
  };

  if (!gameState || !me) {
    return (
      <Container>
        <Header><Title>Truco Gaúcho</Title></Header>
        {error && (
          <ErrorBanner role="alert">
            {error}
            <CloseButton type="button" onClick={clearError} aria-label="Fechar aviso">&times;</CloseButton>
          </ErrorBanner>
        )}
        <Loading role="status">{connected ? 'Entrando na sala...' : 'Conectando ao servidor...'}</Loading>
        {passwordPrompt && (
          <PasswordDialog
            error={passwordPrompt.error}
            onSubmit={submitPassword}
            onCancel={() => navigate('/lobby', { replace: true })}
          />
        )}
      </Container>
    );
  }

  const phase = gameState.gameStatus;
  const roomFull = gameState.players.length >= gameState.maxPlayers;
  const currentPlayer = gameState.players.find(p => p.isCurrentPlayer);

  let statusText = '';
  if (phase === 'waiting') statusText = roomFull ? 'Todos na sala. Marquem "Pronto"!' : 'Aguardando jogadores...';
  else if (phase === 'finished') statusText = 'Partida encerrada';
  else if (waitingOn === 'Mão de onze') statusText = 'O adversário decide a mão de onze...';
  else if (waitingOn) statusText = `Aguardando a resposta ao ${waitingOn}...`;
  else if (pending) statusText = pending.type === 'onze' ? 'Decida a mão de onze' : 'Responda ao pedido';
  else if (gameState.locked) statusText = 'Fim da rodada...';
  else if (currentPlayer) statusText = currentPlayer.id === playerId ? 'É a sua vez de jogar!' : `Vez de ${currentPlayer.name}`;
  if (phase === 'playing' && gameState.handMode === 'ferro') statusText = `Mão de ferro! ${statusText}`;

  return (
    <Container>
      <Header>
        <Title>Truco Gaúcho</Title>
        <HeaderTools>
          <RoomName>Sala: {currentRoom ? currentRoom.name : roomId}</RoomName>
          <button type="button" onClick={handleCopyLink}>{copied ? 'Link copiado!' : 'Copiar link'}</button>
          <button type="button" onClick={toggleSound} aria-pressed={soundOn}>{soundOn ? 'Som: ligado' : 'Som: mudo'}</button>
        </HeaderTools>
      </Header>

      {!connected && (
        <ErrorBanner role="alert">Conexão perdida. Tentando reconectar...</ErrorBanner>
      )}
      {error && (
        <ErrorBanner role="alert">
          {error}
          <CloseButton type="button" onClick={clearError} aria-label="Fechar aviso">&times;</CloseButton>
        </ErrorBanner>
      )}

      <NoticeToasts notices={notices} />
      <TurnIndicator
        text={statusText}
        remainingMs={phase === 'playing' ? gameState.turnRemainingMs : null}
        totalMs={gameState.turnTimeoutMs}
      />

      <Area>
        <GameTable
          teams={gameState.teams}
          myTeam={myTeam}
          handValue={gameState.handValue}
          roundResults={gameState.roundResults}
          showHand={phase === 'playing'}
        >
          {seats.map(({ player, seat }) => (
            <PlayerPosition
              key={player.id}
              player={player}
              seat={seat}
              isMe={player.id === playerId}
              myTeam={myTeam}
              isStarter={phase === 'playing' && gameState.handStarter === player.id}
              isTurn={phase === 'playing' && player.isCurrentPlayer}
            />
          ))}

          <CenterOfTable>
            {gameState.playedCards.map((play) => {
              const seat = seats.find(s => s.player.id === play.playerId);
              return (
                <PlayedSlot key={play.playerId} $seat={seat ? seat.seat : 'top'}>
                  <PlayingCard
                    card={play.card}
                    highlight={Boolean(gameState.lastRound && gameState.lastRound.winnerPlayerId === play.playerId)}
                  />
                </PlayedSlot>
              );
            })}
          </CenterOfTable>

          {phase === 'waiting' && (
            <ReadyCounter
              players={gameState.players}
              maxPlayers={gameState.maxPlayers}
              isReady={me.isReady}
              onAddBot={addBot}
              onRemoveBot={removeBot}
              onCopyLink={handleCopyLink}
              copied={copied}
            />
          )}
        </GameTable>

        <HandArea aria-label="Suas cartas">
          {me.hand.map((card, index) => (
            <PlayingCard
              key={`${card.value}-${card.suit}`}
              card={card}
              index={index}
              isPlayable={actions.canPlay}
              onClick={(played) => send('play_card', { card: played })}
            />
          ))}
        </HandArea>

        <GameActions
          phase={phase}
          actions={actions}
          isReady={me.isReady}
          showReadyButton={phase === 'waiting' && roomFull}
          onReady={setPlayerReady}
          onTruco={() => setShowTrucoConfirm(true)}
          onRetruco={() => send('retruco')}
          onVale4={() => send('vale4')}
          onEnvido={() => setShowEnvidoMenu(true)}
          onFlor={() => setShowFlorConfirm(true)}
          onLeave={handleLeave}
        />
      </Area>

      <CardGuide />
      <ChatPanel messages={chat} playerId={playerId} myTeam={myTeam} onSend={sendChat} />

      {showTrucoConfirm && actions.canTruco && (
        <TrucoDialog
          onConfirm={() => { send('truco'); setShowTrucoConfirm(false); }}
          onCancel={() => setShowTrucoConfirm(false)}
        />
      )}
      {showEnvidoMenu && actions.canEnvido && (
        <EnvidoDialog
          myEnvido={gameState.me.envido}
          onEnvido={() => { send('envido'); setShowEnvidoMenu(false); }}
          onRealEnvido={() => { send('real_envido'); setShowEnvidoMenu(false); }}
          onFaltaEnvido={() => { send('falta_envido'); setShowEnvidoMenu(false); }}
          onCancel={() => setShowEnvidoMenu(false)}
        />
      )}
      {showFlorConfirm && actions.canFlor && (
        <FlorDialog
          myFlor={gameState.me.flor}
          onFlor={() => { send('flor'); setShowFlorConfirm(false); }}
          onCancel={() => setShowFlorConfirm(false)}
        />
      )}

      {phase === 'playing' && renderResponseDialog()}

      {phase === 'finished' && result && (
        <GameOverDialog
          won={result.won}
          votes={gameState.rematchVotes.length}
          total={gameState.players.filter(p => p.connected && !p.isBot).length}
          hasVoted={gameState.rematchVotes.includes(playerId)}
          onRematch={playAgain}
          onLeave={handleLeave}
        />
      )}
    </Container>
  );
};

export default GameRoom;
