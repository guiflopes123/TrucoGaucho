import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { useSocket } from '../context/SocketContext';
import PlayingCard from '../components/PlayingCard';
import GameTable from '../components/GameTable';
import PlayerPosition from '../components/PlayerPosition';
import GameActions from '../components/GameActions';
import CardGuide from '../components/CardGuide';
import PlayerReadyButton from '../components/PlayerReadyButton';
import ReadyCounter from '../components/ReadyCounter';
import TurnIndicator from '../components/TurnIndicator';
import { 
  TrucoDialog, 
  EnvidoDialog, 
  FlorDialog, 
  TrucoResponseDialog,
  RetrucoResponseDialog,
  Vale4ResponseDialog,
  GameOverDialog 
} from '../components/GameDialog';

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
`;

const TrucoIndicator = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(178, 34, 34, 0.9);
  color: white;
  padding: 20px 40px;
  border-radius: 10px;
  font-size: 2.5rem;
  font-weight: bold;
  z-index: 1000;
  animation: ${pulse} 1s infinite;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
`;

const EnvidoIndicator = styled(TrucoIndicator)`
  background-color: rgba(0, 100, 0, 0.9);
`;

const FlorIndicator = styled(TrucoIndicator)`
  background-color: rgba(75, 0, 130, 0.9);
`;

const TrucoIndicatorText = styled.span`
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
`;

const EnvidoIndicatorText = styled(TrucoIndicatorText)``;

const GameRoomContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #003300;
`;

const GameHeader = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  background-color: rgba(0, 0, 0, 0.5);
  border-bottom: 2px solid #FFD700;
`;

const RoomInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
`;

const GameTitle = styled.h1`
  font-size: 1.8rem;
  color: #FFD700;
  margin: 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
`;

const GameArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
`;

const CardArea = styled.div`
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 10px;
  padding: 10px;
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 10px;
`;

const PlayerCardsContainer = styled.div`
  display: flex;
  gap: 10px;
  justify-content: center;
  align-items: center;
  padding: 10px;
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 10px;
  margin-top: 20px;
`;

const PlayedCardArea = styled.div`
  position: absolute;
  
  &.player-0 {
    bottom: 50%;
    left: 50%;
    transform: translate(-50%, 100px);
  }
  
  &.player-1 {
    top: 50%;
    left: 50%;
    transform: translate(-50%, -100px);
  }
  
  &.player-2 {
    left: 50%;
    top: 50%;
    transform: translate(-100px, -50%);
  }
  
  &.player-3 {
    right: 50%;
    top: 50%;
    transform: translate(100px, -50%);
  }
`;

const ErrorMessage = styled.div`
  background-color: rgba(220, 53, 69, 0.8);
  color: white;
  padding: 10px;
  border-radius: 5px;
  margin: 10px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: white;
  font-size: 1.2rem;
  cursor: pointer;
`;

const WaitingMessage = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 30px 50px;
  border-radius: 10px;
  text-align: center;
  z-index: 1000;
  max-width: 80%;
  font-size: 1.5rem;
  border: 2px solid #FFD700;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
  animation: fadeIn 0.5s ease-in;

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translate(-50%, -40%);
    }
    to {
      opacity: 1;
      transform: translate(-50%, -50%);
    }
  }

  div {
    margin-top: 15px;
    font-size: 1.2rem;
    color: #FFD700;
  }
`;


// Posições dos jogadores na mesa
const positions = [0, 1, 2, 3];

const GameRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [showTrucoDialog, setShowTrucoDialog] = useState(false);
  const [showEnvidoDialog, setShowEnvidoDialog] = useState(false);
  const [showFlorDialog, setShowFlorDialog] = useState(false);
  const [showResponseDialog, setShowResponseDialog] = useState(false);
  const [showRetrucoResponseDialog, setShowRetrucoResponseDialog] = useState(false);
  const [showRetrucoDialog, setShowRetrucoDialog] = useState(false);
  const [showVale4Dialog, setShowVale4Dialog] = useState(false);
  const [showVale4ResponseDialog, setShowVale4ResponseDialog] = useState(false);
  const [responseType, setResponseType] = useState(null);
  const [showGameOverDialog, setShowGameOverDialog] = useState(false);
  const [winner, setWinner] = useState(null);
  const [showTrucoIndicator, setShowTrucoIndicator] = useState(false);
  const [showEnvidoIndicator, setShowEnvidoIndicator] = useState(false);
  const [showFlorIndicator, setShowFlorIndicator] = useState(false);
  const [envidoType, setEnvidoType] = useState('Envido');
  const [isReady, setIsReady] = useState(false);
  const [playersReady, setPlayersReady] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [gameState, setGameState] = useState(null);
  const [showTrucoResponseDialog, setShowTrucoResponseDialog] = useState(false);
  const [trucoRequester, setTrucoRequester] = useState(null);
  const [waitingForTrucoResponse, setWaitingForTrucoResponse] = useState(false);
  const [showRetrucoIndicator, setShowRetrucoIndicator] = useState(false);
  const [showVale4Indicator, setShowVale4Indicator] = useState(false);
  const [canRequestTruco, setCanRequestTruco] = useState(true);
  const [canRequestRetruco, setCanRequestRetruco] = useState(false);
  const [canRequestVale4, setCanRequestVale4] = useState(false);
  const [trucoAcceptedRound, setTrucoAcceptedRound] = useState(null);
  const [retrucoAcceptedRound, setRetrucoAcceptedRound] = useState(null);
  const [isHandlingTrucoResponse, setIsHandlingTrucoResponse] = useState(false);
  const [isHandlingRetrucoResponse, setIsHandlingRetrucoResponse] = useState(false);
  const [isHandlingVale4Response, setIsHandlingVale4Response] = useState(false);
  
  
  const { 
    connected,
    currentRoom,
    gameState: socketGameState,
    cards,
    error,
    leaveRoom,
    playCard,
    requestTruco,
    respondToTruco,
    requestRetruco,
    respondToRetruco,
    requestVale4,
    respondToVale4,
    requestEnvido,
    requestRealEnvido,
    requestFaltaEnvido,
    respondToEnvido,
    declareFlor,
    requestContraFlor,
    requestContraFlorResto,
    respondToFlor,
    clearError,
    socket
  } = useSocket();
  
  useEffect(() => {
    // Verificar se o usuário está logado
    const storedUsername = localStorage.getItem('username');
    if (!storedUsername) {
      navigate('/');
      return;
    }
    setUsername(storedUsername);
    
    // Se não estiver conectado ou não estiver em uma sala, voltar para o lobby
    if (connected && !currentRoom) {
      navigate('/lobby');
    }
    
    // Adicionar evento para o botão "Pronto"
    if (socket) {
      socket.on('player_ready_confirmed', (data) => {
        console.log('Jogador marcado como pronto:', data);
        if (data.success) {
          // Atualizar o estado local do jogador
          setIsReady(true);
          // Forçar atualização do estado do jogo
          if (gameState) {
            const updatedGameState = {
              ...gameState,
              players: gameState.players.map(player => 
                player.id === socket.id ? { ...player, isReady: true } : player
              )
            };
            setGameState(updatedGameState);
          }
        }
      });
      
      socket.on('game_state_updated', (data) => {
        console.log('Estado do jogo atualizado na sala:', data);
        if (data.gameState) {
          setGameState(data.gameState);
          // Atualizar o estado do jogador com base no novo estado do jogo
          const currentPlayer = data.gameState.players.find(p => p.id === socket.id);
          if (currentPlayer) {
            setIsReady(currentPlayer.isReady);
          }
        }
      });
      
      return () => {
        socket.off('player_ready_confirmed');
      };
    }
  }, [connected, currentRoom, navigate, socket, gameState]);
  
  // Adicionar log para depurar o estado do jogo
  useEffect(() => {
    console.log('GameRoom gameState:', socketGameState);
  }, [socketGameState]);
  
  // Atualizar o estado de jogadores prontos quando o gameState mudar
  useEffect(() => {
    console.log('Atualizando estado do jogo:', socketGameState);
    
    if (socketGameState) {
      setGameState(socketGameState);
    } else if (currentRoom) {
      // Se não houver gameState mas houver uma sala, criar estado inicial
      setGameState({
        status: 'waiting',
        gameStatus: 'waiting',
        started: false,
        players: currentRoom.players || [],
        teams: [
          { id: 1, name: 'Time 1', score: 0, roundsWon: 0 },
          { id: 2, name: 'Time 2', score: 0, roundsWon: 0 }
        ]
      });
    }

    if (gameState && gameState.players) {
      const readyPlayers = gameState.players.filter(player => player.isReady).length;
      setPlayersReady(readyPlayers);
      setTotalPlayers(gameState.players.length);
      
      // Verificar se o jogador atual está pronto
      const currentPlayer = gameState.players.find(player => player.id === socket?.id);
      if (currentPlayer) {
        setIsReady(currentPlayer.isReady);
      }
    }
  }, [socketGameState, currentRoom, socket]);
  
  // Verificar se o jogo terminou
  useEffect(() => {
    if (gameState && gameState.gameStatus === 'finished') {
      const winnerTeam = gameState.gameWinner === 1 ? 'Nós' : 'Eles';
      setWinner(winnerTeam);
      setShowGameOverDialog(true);
    }
  }, [gameState]);
  
  // Efeitos para indicadores visuais
  useEffect(() => {
    if (showTrucoIndicator) {
      const timer = setTimeout(() => {
        setShowTrucoIndicator(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [showTrucoIndicator]);
  
  useEffect(() => {
    if (showRetrucoIndicator) {
      const timer = setTimeout(() => {
        setShowRetrucoIndicator(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [showRetrucoIndicator]);
  
  useEffect(() => {
    if (showVale4Indicator) {
      const timer = setTimeout(() => {
        setShowVale4Indicator(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [showVale4Indicator]);
  
  useEffect(() => {
    if (showEnvidoIndicator) {
      const timer = setTimeout(() => {
        setShowEnvidoIndicator(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showEnvidoIndicator]);
  
  // Efeito para resetar os estados dos botões quando uma nova rodada começa
  useEffect(() => {
    if (gameState?.currentRound === 1) {
      setCanRequestTruco(true);
      setCanRequestRetruco(false);
      setCanRequestVale4(false);
      setTrucoAcceptedRound(null);
      setRetrucoAcceptedRound(null);
    }
  }, [gameState?.currentRound]);
  
  // Efeito para controlar o estado do Retruco quando o Truco é aceito
  useEffect(() => {
    if (gameState?.trucoState?.accepted) {
      console.log('Truco aceito, verificando times:', {
        trucoTeam: gameState.trucoState.team,
        respondingPlayer: gameState.trucoState.respondingPlayer,
        socketId: socket?.id,
        currentPlayer: gameState.players.find(p => p.id === socket?.id)
      });

      // Encontrar o time do jogador que recebeu o Truco
      const respondingPlayer = gameState.players.find(p => p.id === gameState.trucoState.respondingPlayer);
      const respondingTeam = respondingPlayer?.team;

      // Encontrar o time do jogador atual
      const currentPlayer = gameState.players.find(p => p.id === socket?.id);
      const currentTeam = currentPlayer?.team;

      // Habilitar Retruco apenas para jogadores do mesmo time que recebeu o Truco
      if (respondingTeam === currentTeam) {
        console.log('Truco aceito, armazenando rodada:', gameState.currentRound);
        setTrucoAcceptedRound(gameState.currentRound);
        setCanRequestRetruco(true);
      }
    }
  }, [gameState?.trucoState, socket?.id, gameState?.players, gameState?.currentRound]);

  // Efeito para habilitar o Retruco na próxima rodada
  useEffect(() => {
    console.log('Verificando habilitação do Retruco:', {
      trucoAcceptedRound,
      currentRound: gameState?.currentRound,
      trucoState: gameState?.trucoState,
      canRequestRetruco,
      respondingPlayer: gameState?.trucoState?.respondingPlayer,
      socketId: socket?.id,
      currentPlayer: gameState?.players.find(p => p.id === socket?.id)
    });
    
    if (trucoAcceptedRound !== null && 
        gameState?.currentRound === trucoAcceptedRound + 1 &&
        gameState?.trucoState?.accepted) {
      
      // Encontrar o time do jogador que recebeu o Truco
      const respondingPlayer = gameState.players.find(p => p.id === gameState.trucoState.respondingPlayer);
      const respondingTeam = respondingPlayer?.team;

      // Encontrar o time do jogador atual
      const currentPlayer = gameState.players.find(p => p.id === socket?.id);
      const currentTeam = currentPlayer?.team;

      // Habilitar Retruco apenas para jogadores do mesmo time que recebeu o Truco
      if (respondingTeam === currentTeam) {
        console.log('Habilitando botão de Retruco para jogador do mesmo time');
        setCanRequestRetruco(true);
      }
    }
  }, [gameState?.currentRound, trucoAcceptedRound, gameState?.trucoState, socket?.id, gameState?.players]);

  // Efeito para controlar o estado do Vale 4 quando o Retruco é aceito
  useEffect(() => {
    if (gameState?.retrucoState?.accepted && 
        gameState?.retrucoState?.respondingPlayer === socket?.id) {
      setRetrucoAcceptedRound(gameState.currentRound);
    }
  }, [gameState?.retrucoState, socket?.id, gameState?.currentRound]);
  
  // Efeito para habilitar o Vale 4 na próxima rodada
  useEffect(() => {
    if (retrucoAcceptedRound !== null && 
        gameState?.currentRound === retrucoAcceptedRound + 1) {
      setCanRequestVale4(true);
    }
  }, [gameState?.currentRound, retrucoAcceptedRound]);
  
  // Manipuladores de eventos
  const handlePlayCard = (card) => {
    console.log('Tentando jogar carta:', {
      gameStatus: gameState?.gameStatus,
      currentPlayer: gameState?.currentPlayer,
      socketId: socket?.id,
      card,
      isCurrentPlayer: gameState?.players?.find(p => p.id === socket?.id)?.isCurrentPlayer,
      serverCurrentPlayer: gameState?.currentPlayer
    });
    
    // Verificar se é a vez do jogador atual usando o currentPlayer do servidor
    if (gameState?.gameStatus === 'playing' && 
        gameState?.currentPlayer === socket?.id) {
      console.log('Jogando carta:', card);
      playCard(roomId, card);
    } else {
      console.log('Não pode jogar carta:', {
        gameStatus: gameState?.gameStatus,
        isCurrentPlayer: gameState?.currentPlayer === socket?.id,
        serverCurrentPlayer: gameState?.currentPlayer,
        socketId: socket?.id
      });
    }
  };
  
  const handleTruco = () => {
    if (gameState && gameState.gameStatus === 'playing') {
      setShowTrucoDialog(true);
    }
  };
  
  const handleEnvido = () => {
    if (gameState && gameState.gameStatus === 'playing') {
      setShowEnvidoDialog(true);
    }
  };
  
  const handleFlor = () => {
    if (gameState && gameState.gameStatus === 'playing') {
      setShowFlorDialog(true);
    }
  };
  
  const handleLeaveRoom = () => {
    leaveRoom(roomId);
    navigate('/lobby');
  };
  
  // Manipulador para o botão "Pronto"
  const handleReady = () => {
    if (socket && !isReady) {
      socket.emit('player_ready', { roomId });
    }
  };
  
  // Manipuladores de diálogo de Truco
  const confirmTruco = () => {
    console.log('Confirmando pedido de Truco');
    requestTruco(roomId);
    setShowTrucoDialog(false);
    setShowTrucoIndicator(true);
    setTrucoRequester(socket.id);
    setWaitingForTrucoResponse(true);
  };
  
  const handleRetruco = () => {
    console.log('Pedindo Retruco');
    if (currentRoom) {
      requestRetruco(currentRoom.id);
      setShowTrucoResponseDialog(false);
      setShowRetrucoIndicator(true);
      setTrucoRequester(socket.id);
      setWaitingForTrucoResponse(true);
    }
  };
  
  const handleVale4 = () => {
    console.log('Pedindo Vale 4');
    if (currentRoom) {
      requestVale4(currentRoom.id);
      setShowRetrucoResponseDialog(false);
      setShowVale4Indicator(true);
      setTrucoRequester(socket.id);
      setWaitingForTrucoResponse(true);
    }
  };
  
  const acceptTruco = () => {
    console.log('Aceitando Truco');
    respondToTruco(roomId, true);
    setShowTrucoResponseDialog(false);
    setShowRetrucoResponseDialog(false);
    setShowTrucoIndicator(false);
    setCanRequestTruco(false);
    setCanRequestRetruco(false);
    setCanRequestVale4(false);
  };
  
  const declineTruco = () => {
    console.log('Recusando Truco');
    respondToTruco(roomId, false);
    setShowTrucoResponseDialog(false);
    setShowRetrucoResponseDialog(false);
    setShowTrucoIndicator(false);
  };
  
  // Manipuladores de diálogo de Envido
  const confirmEnvido = () => {
    requestEnvido(roomId);
    setShowEnvidoDialog(false);
    setEnvidoType('Envido');
    setShowEnvidoIndicator(true);
  };
  
  const confirmRealEnvido = () => {
    requestRealEnvido(roomId);
    setShowEnvidoDialog(false);
    setEnvidoType('Real Envido');
    setShowEnvidoIndicator(true);
  };
  
  const confirmFaltaEnvido = () => {
    requestFaltaEnvido(roomId);
    setShowEnvidoDialog(false);
    setEnvidoType('Falta Envido');
    setShowEnvidoIndicator(true);
  };
  
  // Manipuladores de diálogo de Flor
  const confirmFlor = () => {
    declareFlor(roomId);
    setShowFlorDialog(false);
    setShowFlorIndicator(true);
    setTimeout(() => setShowFlorIndicator(false), 2000);
  };
  
  const confirmContraFlor = () => {
    requestContraFlor(roomId);
    setShowFlorDialog(false);
  };
  
  const confirmContraFlorResto = () => {
    requestContraFlorResto(roomId);
    setShowFlorDialog(false);
  };
  
  // Manipuladores de resposta a Truco/Envido/Flor
  const acceptChallenge = () => {
    if (responseType === 'truco') {
      respondToTruco(roomId, true);
    } else if (responseType === 'envido') {
      respondToEnvido(roomId, true);
    } else if (responseType === 'flor') {
      respondToFlor(roomId, true);
    }
    
    setShowResponseDialog(false);
    setResponseType(null);
  };
  
  const declineChallenge = () => {
    if (responseType === 'truco') {
      respondToTruco(roomId, false);
    } else if (responseType === 'envido') {
      respondToEnvido(roomId, false);
    } else if (responseType === 'flor') {
      respondToFlor(roomId, false);
    }
    
    setShowResponseDialog(false);
    setResponseType(null);
  };
  
  // Renderizar jogadores
  const renderPlayers = () => {
    if (!gameState || !gameState.players) return null;
    
    console.log('Renderizando jogadores:', {
      players: gameState.players.map(p => ({
        name: p.name,
        team: p.team,
        isCurrentPlayer: p.isCurrentPlayer
      })),
      teams: gameState.teams
    });
    
    return gameState.players.map((player, index) => {
      // Encontrar o time do jogador
      const playerTeam = gameState.teams?.find(t => t.id === player.team);
      console.log(`Jogador ${player.name}:`, {
        team: player.team,
        teamData: playerTeam,
        roundsWon: playerTeam?.roundsWon,
        score: playerTeam?.score
      });
      
      // Criar uma cópia do jogador com o time atualizado
      const updatedPlayer = {
        ...player,
        team: player.team || (index % 2 === 0 ? 1 : 2) // Atribuir time alternadamente se não estiver definido
      };
      
      return (
        <PlayerPosition 
          key={player.id} 
          player={updatedPlayer}
          position={index}
          teams={gameState.teams}
        />
      );
    });
  };
  
  // Renderizar cartas jogadas
  const renderPlayedCards = () => {
    if (!gameState || !gameState.playedCards) return null;
    
    return gameState.playedCards.map((play) => {
      const playerIndex = gameState.players.findIndex(p => p.id === play.playerId);
      return (
        <PlayedCardArea key={play.playerId} className={`player-${playerIndex}`}>
          <PlayingCard 
            card={play.card}
            isPlayable={false}
            faceDown={false}
          />
        </PlayedCardArea>
      );
    });
  };
  
  // Renderizar cartas do jogador
  const renderPlayerCards = () => {
    console.log('Renderizando cartas do jogador. gameState:', gameState);
    console.log('Socket ID:', socket?.id);
    
    if (!gameState) {
      console.log('gameState não definido');
      return null;
    }
    
    if (!gameState.players) {
      console.log('gameState.players não definido');
      return null;
    }
    
    const currentPlayer = gameState.players.find(p => p.id === socket?.id);
    console.log('Jogador atual:', currentPlayer);
    
    if (!currentPlayer) {
      console.log('Jogador atual não encontrado');
      return null;
    }
    
    if (!currentPlayer.hand) {
      console.log('Mão do jogador não definida');
      return null;
    }
    
    if (!Array.isArray(currentPlayer.hand)) {
      console.log('Mão do jogador não é um array:', currentPlayer.hand);
      return null;
    }

    console.log('Cartas do jogador:', currentPlayer.hand);

    return (
      <PlayerCardsContainer>
        {currentPlayer.hand.map((card, index) => {
          console.log('Renderizando carta:', card, 'índice:', index);
          return (
            <PlayingCard
              key={`${card.value}-${card.suit}-${index}`}
              card={card}
              isPlayable={gameState.gameStatus === 'playing' && currentPlayer.isCurrentPlayer}
              onClick={() => handlePlayCard(card)}
              index={index}
              isManilha={card.isManilha}
            />
          );
        })}
      </PlayerCardsContainer>
    );
  };
  
  // Renderizar mensagem de espera
  const renderWaitingMessage = () => {
    console.log('Renderizando mensagem de espera. gameState:', gameState);
    console.log('Status do jogo:', gameState?.gameStatus, gameState?.status);
    console.log('Jogadores prontos:', playersReady, 'de', totalPlayers);
    
    // Mostrar a mensagem se não houver gameState ou se o jogo estiver em estado de espera
    if (!gameState || gameState.gameStatus === 'waiting' || gameState.status === 'waiting' || !gameState.started) {
      const isRoomFull = gameState?.maxPlayers === 2 ? 
        gameState?.players?.length >= 2 : 
        gameState?.players?.length >= 4;

      // Não mostrar a mensagem "Clique em Pronto para iniciar" se o jogador atual já estiver pronto
      if (isRoomFull && !isReady) {
      return (
        <WaitingMessage>
            Clique em Pronto para iniciar
          {playersReady > 0 && (
            <div>
              {playersReady} de {totalPlayers} jogadores prontos
            </div>
          )}
        </WaitingMessage>
      );
      } else if (!isRoomFull) {
      return (
          <WaitingMessage>
            Aguardando jogadores...
          {playersReady > 0 && (
            <div>
              {playersReady} de {totalPlayers} jogadores prontos
            </div>
          )}
        </WaitingMessage>
      );
      }
    }
    return null;
  };
  
  
  const renderGameTable = () => {
    if (!gameState) return null;
    
    const team1Score = gameState.teams && gameState.teams[0] ? gameState.teams[0].score : 0;
    const team2Score = gameState.teams && gameState.teams[1] ? gameState.teams[1].score : 0;
    const team1RoundsWon = gameState.teams && gameState.teams[0] ? gameState.teams[0].roundsWon : 0;
    const team2RoundsWon = gameState.teams && gameState.teams[1] ? gameState.teams[1].roundsWon : 0;
    
    return (
      <GameTable
        team1Score={team1Score}
        team2Score={team2Score}
        currentRound={gameState.currentRound || 1}
        team1RoundsWon={team1RoundsWon}
        team2RoundsWon={team2RoundsWon}
        handValue={gameState.handValue || 1}
        showTruco={gameState.showTrucoIndicator || false}
        showEnvido={gameState.envidoState !== null}
        envidoType={gameState.envidoState?.type || 'Envido'}
      >
        {renderPlayedCards()}
        {renderWaitingMessage()}
      </GameTable>
    );
  };
  
  const renderGameArea = () => {
    console.log('Renderizando área do jogo. gameState:', gameState);
    
    if (!gameState) {
      console.log('gameState é null, não renderizando a área do jogo');
      return (
        <GameArea>
          <GameTable>
            {renderWaitingMessage()}
          </GameTable>
        </GameArea>
      );
    }
    
    console.log('Renderizando a área do jogo com gameState:', gameState);
    
    // Encontrar o jogador atual
    const currentPlayer = gameState.players.find(p => p.isCurrentPlayer);
    const isCurrentPlayer = currentPlayer && currentPlayer.id === socket?.id;
    
    return (
      <GameArea>
        {renderGameTable()}
        {/* Não renderizar os jogadores no centro da mesa quando o jogo estiver em estado de espera */}
        {gameState.gameStatus !== 'waiting' && renderPlayers()}
        {renderPlayerCards()}
        {renderGameActions()}
        {renderCardGuide()}
        {renderIndicators()}
        {renderDialogs()}
        {gameState && gameState.gameStatus === 'waiting' && (
          <ReadyCounter 
            players={gameState.players} 
            isReady={isReady} 
          />
        )}
        {gameState && gameState.gameStatus === 'playing' && currentPlayer && (
          <TurnIndicator 
            currentPlayerName={currentPlayer.name} 
            isCurrentPlayer={isCurrentPlayer} 
          />
        )}
      </GameArea>
    );
  };
  
  const renderGameActions = () => {
    const isRoomFull = gameState?.maxPlayers === 2 ? 
      gameState?.players?.length >= 2 : 
      gameState?.players?.length >= 4;
    const showReadyButton = gameState?.gameStatus === 'waiting' && isRoomFull;
    const isCurrentPlayer = gameState?.currentPlayer === socket?.id;
    
    // Encontrar o time do jogador atual
    const currentPlayer = gameState?.players?.find(p => p.id === socket?.id);
    const currentTeam = currentPlayer?.team;

    // Encontrar o time que solicitou o Truco
    const trucoRequester = gameState?.players?.find(p => p.id === gameState?.trucoState?.requestedBy);
    const trucoRequesterTeam = trucoRequester?.team;

    // Encontrar o time que solicitou o Retruco
    const retrucoRequester = gameState?.players?.find(p => p.id === gameState?.retrucoState?.requestedBy);
    const retrucoRequesterTeam = retrucoRequester?.team;

    // Encontrar o time do jogador que recebeu o Truco
    const trucoResponder = gameState?.players?.find(p => p.id === gameState?.trucoState?.respondingPlayer);
    const trucoResponderTeam = trucoResponder?.team;

    // Verificar se é uma nova rodada após o Truco/Retruco
    const isNewRoundAfterTruco = gameState?.currentRound > (gameState?.trucoState?.round || 0);
    const isNewRoundAfterRetruco = gameState?.currentRound > (gameState?.retrucoState?.round || 0);
    
    const canPlayTruco = gameState?.gameStatus === 'playing' && 
      !gameState?.trucoState && 
      !gameState?.retrucoState && 
      !gameState?.vale4State &&
      isCurrentPlayer;
    
    const canPlayRetruco = gameState?.gameStatus === 'playing' &&
      gameState?.trucoState?.accepted &&
      !gameState?.retrucoState &&
      !gameState?.vale4State &&
      currentTeam !== trucoRequesterTeam;

    console.log('=== CONDIÇÕES DO BOTÃO RETRUCO ===');
    console.log('1. Jogo em andamento:', gameState?.gameStatus === 'playing');
    console.log('2. Truco aceito:', gameState?.trucoState?.accepted);
    console.log('3. Sem Retruco ativo:', !gameState?.retrucoState);
    console.log('4. Sem Vale 4 ativo:', !gameState?.vale4State);
    console.log('5. Time diferente do solicitante:', currentTeam !== trucoRequesterTeam);
    console.log('6. É a vez do jogador:', isCurrentPlayer);
    console.log('7. Nova rodada após Truco:', isNewRoundAfterTruco);
    console.log('8. Rodada atual:', gameState?.currentRound);
    console.log('9. Rodada do Truco:', gameState?.trucoState?.round);
    console.log('10. Time do jogador atual:', currentTeam);
    console.log('11. Time do solicitante:', trucoRequesterTeam);
    console.log('12. Botão habilitado:', canPlayRetruco);
    console.log('=== FIM DAS CONDIÇÕES ===');

    const canPlayVale4 = gameState?.gameStatus === 'playing' &&
      gameState?.retrucoState?.accepted &&
      !gameState?.vale4State &&
      currentTeam !== retrucoRequesterTeam;

    console.log('=== CONDIÇÕES DO BOTÃO VALE4 ===');
    console.log('1. Jogo em andamento:', gameState?.gameStatus === 'playing');
    console.log('2. Retruco aceito:', gameState?.retrucoState?.accepted);
    console.log('3. Sem Vale 4 ativo:', !gameState?.vale4State);
    console.log('4. Time diferente do solicitante:', currentTeam !== retrucoRequesterTeam);
    console.log('5. É a vez do jogador:', isCurrentPlayer);
    console.log('6. Nova rodada após Retruco:', isNewRoundAfterRetruco);
    console.log('7. Botão habilitado:', canPlayVale4);
    console.log('=== FIM DAS CONDIÇÕES ===');

    console.log('Estado dos botões:', {
      canPlayTruco,
      canPlayRetruco,
      canPlayVale4,
      gameStatus: gameState?.gameStatus,
      trucoState: gameState?.trucoState,
      retrucoState: gameState?.retrucoState,
      vale4State: gameState?.vale4State,
      currentPlayer: gameState?.currentPlayer,
      socketId: socket?.id,
      isCurrentPlayer,
      currentTeam,
      trucoRequesterTeam,
      trucoResponderTeam,
      retrucoRequesterTeam,
      currentRound: gameState?.currentRound,
      isNewRoundAfterTruco,
      isNewRoundAfterRetruco
    });

    return (
      <GameActions
        onTruco={handleTruco}
        onRetruco={handleRetruco}
        onVale4={handleVale4}
        onEnvido={handleEnvido}
        onFlor={handleFlor}
        onLeaveRoom={handleLeaveRoom}
        onReady={handleReady}
        isReady={isReady}
        showReadyButton={showReadyButton}
        disableTruco={!canPlayTruco}
        disableRetruco={!canPlayRetruco}
        disableVale4={!canPlayVale4}
        disableEnvido={!isCurrentPlayer}
        disableFlor={!isCurrentPlayer}
      />
    );
  };
  
  const renderCardGuide = () => {
    return <CardGuide />;
  };
  
  const renderIndicators = () => {
    return (
      <>
        {showTrucoIndicator && (
          <TrucoIndicator>
            <TrucoIndicatorText>TRUCO!</TrucoIndicatorText>
          </TrucoIndicator>
        )}
        {showRetrucoIndicator && (
          <TrucoIndicator>
            <TrucoIndicatorText>RETRUCO!</TrucoIndicatorText>
          </TrucoIndicator>
        )}
        {showVale4Indicator && (
          <TrucoIndicator>
            <TrucoIndicatorText>VALE 4!</TrucoIndicatorText>
          </TrucoIndicator>
        )}
        {showEnvidoIndicator && (
          <EnvidoIndicator>
            <EnvidoIndicatorText>ENVIDO!</EnvidoIndicatorText>
          </EnvidoIndicator>
        )}
        {showFlorIndicator && (
          <FlorIndicator>
            <EnvidoIndicatorText>FLOR!</EnvidoIndicatorText>
          </FlorIndicator>
        )}
      </>
    );
  };
  
  const renderDialogs = () => {
    return (
      <>
        {showTrucoDialog && (
          <TrucoDialog
            onConfirm={confirmTruco}
            onCancel={() => setShowTrucoDialog(false)}
          />
        )}
        {showTrucoResponseDialog && (
          <TrucoResponseDialog
            onAccept={acceptTruco}
            onRetruco={handleRetruco}
            onDecline={declineTruco}
          />
        )}
        {showRetrucoResponseDialog && (
          <RetrucoResponseDialog
            onAccept={acceptRetruco}
            onVale4={handleVale4}
            onDecline={declineRetruco}
          />
        )}
        {showVale4ResponseDialog && (
          <Vale4ResponseDialog
            onAccept={acceptVale4}
            onDecline={declineVale4}
          />
        )}
        {showEnvidoDialog && (
          <EnvidoDialog
            onEnvido={confirmEnvido}
            onRealEnvido={confirmRealEnvido}
            onFaltaEnvido={confirmFaltaEnvido}
            onCancel={() => setShowEnvidoDialog(false)}
          />
        )}
        {showFlorDialog && (
          <FlorDialog
            onFlor={confirmFlor}
            onContraFlor={confirmContraFlor}
            onContraFlorResto={confirmContraFlorResto}
            onCancel={() => setShowFlorDialog(false)}
          />
        )}
        {showGameOverDialog && (
          <GameOverDialog
            winner={winner}
            onReturn={handleLeaveRoom}
          />
        )}
      </>
    );
  };
  
  useEffect(() => {
    if (socket) {
      socket.on('truco_requested', (data) => {
        const currentPlayer = gameState?.players.find(p => p.id === socket.id);
        if (currentPlayer && currentPlayer.team === data.trucoState.respondingTeam) {
          setShowTrucoResponseDialog(true);
        }
      });

      socket.on('retruco_requested', (data) => {
        const currentPlayer = gameState?.players.find(p => p.id === socket.id);
        if (currentPlayer && currentPlayer.team === data.retrucoState.respondingTeam) {
          setShowRetrucoResponseDialog(true);
        }
      });

      socket.on('vale4_requested', (data) => {
        const currentPlayer = gameState?.players.find(p => p.id === socket.id);
        if (currentPlayer && currentPlayer.team === data.vale4State.respondingTeam) {
          setShowVale4ResponseDialog(true);
        }
      });

      let isHandlingTrucoResponse = false;
      let isHandlingRetrucoResponse = false;
      let isHandlingVale4Response = false;

      socket.on('truco_response_received', (data) => {
        if (isHandlingTrucoResponse) return;
        setIsHandlingTrucoResponse(true);

        console.log('=== EVENTO TRUCO_RESPONSE_RECEIVED ===');
        console.log('Dados recebidos:', data);
        console.log('Estado atual do jogo:', gameState);

        if (data.accepted) {
          setGameState(prevState => {
            console.log('Atualizando estado após Truco aceito:', {
              prevState,
              data
            });
            
            const newState = {
              ...prevState,
              trucoState: {
                ...prevState.trucoState,
                accepted: true,
                value: 2,
                respondingPlayer: data.currentPlayer
              },
              handValue: 2,
              // Usar o currentPlayer do servidor
              currentPlayer: data.currentPlayer,
              gameStatus: 'playing',
              players: prevState.players.map(player => ({
                ...player,
                isCurrentPlayer: player.id === data.currentPlayer
              }))
            };
            
            console.log('Novo estado após Truco aceito:', newState);
            return newState;
          });
        } else {
          setGameState(prevState => {
            const newState = {
              ...prevState,
              trucoState: null,
              handValue: 1,
              // Usar o currentPlayer do servidor
              currentPlayer: data.currentPlayer,
              gameStatus: 'playing',
              players: prevState.players.map(player => ({
                ...player,
                isCurrentPlayer: player.id === data.currentPlayer
              }))
            };
            return newState;
          });
        }

        // Limpar estados visuais
        setShowTrucoDialog(false);
        setShowTrucoIndicator(false);
        setShowTrucoResponseDialog(false);
        setShowRetrucoDialog(false);
        setShowRetrucoIndicator(false);
        setShowRetrucoResponseDialog(false);
        setShowVale4Dialog(false);
        setShowVale4Indicator(false);
        setShowVale4ResponseDialog(false);

        // Resetar flag após um pequeno delay
        setTimeout(() => {
          setIsHandlingTrucoResponse(false);
        }, 100);
      });

      socket.on('retruco_response_received', (data) => {
        if (isHandlingRetrucoResponse) return;
        setIsHandlingRetrucoResponse(true);

        console.log('=== EVENTO RETRUCO_RESPONSE_RECEIVED ===');
        console.log('Dados recebidos:', data);
        console.log('Estado atual do jogo:', gameState);

        // Limpar todos os estados visuais relacionados ao truco
        setShowTrucoIndicator(false);
        setShowRetrucoIndicator(false);
        setShowVale4Indicator(false);
        setWaitingForTrucoResponse(false);
        setShowTrucoResponseDialog(false);
        setShowRetrucoResponseDialog(false);
        setShowVale4ResponseDialog(false);
        setTrucoRequester(null);
        setShowTrucoDialog(false);
        setShowRetrucoDialog(false);
        setShowVale4Dialog(false);

        // Atualizar o estado do jogo com base na resposta
        if (gameState) {
          setGameState(prev => {
            const updatedPlayers = prev.players.map(player => ({
              ...player,
              isCurrentPlayer: player.id === prev.currentPlayer
            }));

            let newHandValue = prev.handValue;
            if (data.accepted) {
              newHandValue = 3; // Valor do Retruco
            }

            return {
              ...prev,
              players: updatedPlayers,
              currentPlayer: prev.currentPlayer,
              handValue: newHandValue,
              trucoState: null,
              retrucoState: data.accepted ? {
                level: 'retruco',
                value: 3,
                accepted: true,
                respondingPlayer: data.currentPlayer
              } : null,
              showTruco: false,
              showTrucoIndicator: false
            };
          });
        }

        // Resetar o flag após um pequeno delay
        setTimeout(() => {
          setIsHandlingRetrucoResponse(false);
        }, 1000);
      });

      socket.on('vale4_response_received', (data) => {
        if (isHandlingVale4Response) return;
        setIsHandlingVale4Response(true);

        console.log('=== EVENTO VALE4_RESPONSE_RECEIVED ===');
        console.log('Dados recebidos:', data);
        console.log('Estado atual do jogo:', gameState);

        // Limpar todos os estados visuais relacionados ao vale 4
        setShowTrucoIndicator(false);
        setShowRetrucoIndicator(false);
        setShowVale4Indicator(false);
        setWaitingForTrucoResponse(false);
        setShowTrucoResponseDialog(false);
        setShowRetrucoResponseDialog(false);
        setShowVale4ResponseDialog(false);
        setTrucoRequester(null);
        setShowTrucoDialog(false);
        setShowRetrucoDialog(false);
        setShowVale4Dialog(false);

        // Atualizar o estado do jogo com base na resposta
        if (gameState) {
          setGameState(prev => {
            const updatedPlayers = prev.players.map(player => ({
              ...player,
              isCurrentPlayer: player.id === prev.currentPlayer
            }));

            let newHandValue = prev.handValue;
            if (data.accepted) {
              newHandValue = 4; // Valor do Vale 4
            } else {
              newHandValue = 3; // Volta para o valor do Retruco
            }

            return {
              ...prev,
              players: updatedPlayers,
              currentPlayer: prev.currentPlayer,
              handValue: newHandValue,
              vale4State: data.vale4State,
              showTruco: data.vale4State !== null,
              showTrucoIndicator: data.vale4State !== null
            };
          });
        }

        // Resetar o flag após um pequeno delay
        setTimeout(() => {
          setIsHandlingVale4Response(false);
        }, 1000);
      });

      socket.on('game_state_updated', (data) => {
        console.log('=== EVENTO GAME_STATE_UPDATED ===');
        console.log('Dados recebidos:', data);
        
        if (data.gameState) {
          setGameState(prevState => {
            // Se estivermos lidando com uma resposta de truco/retruco/vale4, não atualize o estado
            if (isHandlingTrucoResponse || isHandlingRetrucoResponse || isHandlingVale4Response) {
              return prevState;
            }

            const newState = {
              ...data.gameState,
              maxPlayers: prevState?.maxPlayers || data.gameState.maxPlayers,
              teams: data.gameState.teams.map(team => ({
                id: team.id,
                name: team.name,
                score: team.score || 0,
                roundsWon: team.roundsWon || 0
              })),
              showTruco: data.gameState.trucoState !== null || data.gameState.retrucoState !== null || data.gameState.vale4State !== null,
              showTrucoIndicator: data.gameState.trucoState !== null || data.gameState.retrucoState !== null || data.gameState.vale4State !== null,
              handValue: data.gameState.handValue || prevState?.handValue || 1,
            };

            // Preservar o estado do Retruco se ele estiver ativo
            if (prevState?.retrucoState && !data.gameState.retrucoState) {
              newState.retrucoState = prevState.retrucoState;
              newState.handValue = 3; // Manter o valor da mão em 3 quando Retruco está ativo
            }

            // Preservar o estado do Vale 4 se ele estiver ativo
            if (prevState?.vale4State && !data.gameState.vale4State) {
              newState.vale4State = prevState.vale4State;
              newState.handValue = 4; // Manter o valor da mão em 4 quando Vale 4 está ativo
            }

            // Não atualize o estado se não houver mudança real
            if (newState.trucoState === prevState?.trucoState && 
                newState.retrucoState === prevState?.retrucoState && 
                newState.vale4State === prevState?.vale4State &&
                newState.handValue === prevState?.handValue) {
              return prevState;
            }

            return newState;
          });
        }
      });

      socket.on('card_played', (data) => {
        console.log('=== EVENTO CARD_PLAYED ===');
        console.log('Dados recebidos:', data);
        
        // Atualizar o estado do jogo apenas com a carta jogada
        if (gameState) {
          setGameState(prevState => {
            const newState = {
              ...prevState,
              playedCards: [...(prevState.playedCards || []), {
                playerId: data.playerId,
                card: data.card
              }],
              // Atualizar o currentPlayer apenas se não for o último jogador da rodada
              currentPlayer: data.nextPlayer,
              players: prevState.players.map(player => ({
                ...player,
                isCurrentPlayer: player.id === data.nextPlayer,
                hand: player.id === data.playerId ? 
                  player.hand.filter(card => 
                    card.value !== data.card.value || card.suit !== data.card.suit
                  ) : player.hand
              }))
            };
            
            console.log('Novo estado após carta jogada:', {
              playedCards: newState.playedCards,
              currentPlayer: newState.currentPlayer,
              nextPlayer: data.nextPlayer,
              cardsPlayed: newState.playedCards.length,
              totalPlayers: gameState.players.length
            });
            return newState;
          });
        }
      });

      socket.on('round_winner', (data) => {
        console.log('=== EVENTO ROUND_WINNER ===');
        console.log('Dados recebidos:', data);
        
        // Atualizar o estado do jogo com o vencedor e o próximo jogador
        if (gameState) {
          setGameState(prevState => {
            const newState = {
              ...prevState,
              roundWinner: data.winner,
              currentPlayer: data.nextPlayer,
              players: prevState.players.map(player => ({
                ...player,
                isCurrentPlayer: player.id === data.nextPlayer
              })),
              // Limpar as cartas jogadas após o fim da rodada
              playedCards: []
            };
            
            console.log('Novo estado após vencedor da rodada:', {
              roundWinner: newState.roundWinner,
              currentPlayer: newState.currentPlayer,
              nextPlayer: data.nextPlayer,
              cardsPlayed: prevState.playedCards.length,
              totalPlayers: gameState.players.length
            });
            return newState;
          });
        }
      });

      return () => {
        socket.off('truco_requested');
        socket.off('retruco_requested');
        socket.off('vale4_requested');
        socket.off('truco_response_received');
        socket.off('retruco_response_received');
        socket.off('vale4_response_received');
        socket.off('game_state_updated');
        socket.off('card_played');
        socket.off('round_winner');
      };
    }
  }, [socket, gameState]);
  
  useEffect(() => {
    if (socket) {
      socket.on('room_created', (data) => {
        console.log('Sala criada:', data);
        if (data.gameState) {
          console.log('Estado do jogo recebido do servidor (criação de sala):', data.gameState);
          setGameState(data.gameState);
          
          // Atualizar contadores de jogadores prontos
          if (data.gameState.players) {
            const readyPlayers = data.gameState.players.filter(player => player.isReady).length;
            setPlayersReady(readyPlayers);
            setTotalPlayers(data.gameState.players.length);
          }
        }
      });

      return () => {
        socket.off('room_created');
      };
    }
  }, [socket]);
  
  useEffect(() => {
    if (socket) {
      socket.on('room_joined', (data) => {
        console.log('Entrou na sala:', data);
        if (data.room) {
          console.log('Dados da sala recebidos:', data.room);
          setGameState({
            status: data.room.status,
            gameStatus: 'waiting',
            started: false,
            players: data.room.players || [],
            maxPlayers: data.room.maxPlayers,
            teams: [
              { id: 1, name: 'Time 1', score: 0, roundsWon: 0 },
              { id: 2, name: 'Time 2', score: 0, roundsWon: 0 }
            ]
          });
          
          // Atualizar contadores de jogadores prontos
          if (data.room.players) {
            const readyPlayers = data.room.players.filter(player => player.isReady).length;
            setPlayersReady(readyPlayers);
            setTotalPlayers(data.room.players.length);
            
            // Verificar se o jogador atual está pronto
            const currentPlayer = data.room.players.find(player => player.id === socket.id);
            if (currentPlayer) {
              setIsReady(currentPlayer.isReady);
            }
          }
        }
      });

      return () => {
        socket.off('room_joined');
      };
    }
  }, [socket]);
  
  // Adicionar efeito para monitorar mudanças no estado do jogo
  useEffect(() => {
    console.log('=== ESTADO DO JOGO ATUALIZADO ===');
    console.log('Estado atual:', gameState);
    if (gameState && gameState.players) {
      console.log('Jogadores e seus estados:');
      gameState.players.forEach(player => {
        console.log(`- ${player.name}: isCurrentPlayer = ${player.isCurrentPlayer}`);
      });
    }

    // Log do estado do Truco/Retruco/Vale 4
    if (gameState) {
      let estadoAtual = 'NORMAL';
      if (gameState.trucoState) {
        estadoAtual = 'TRUCO';
        if (gameState.trucoState.accepted) {
          estadoAtual += ' (ACEITO)';
        } else {
          estadoAtual += ' (PENDENTE)';
        }
      }
      if (gameState.retrucoState) {
        estadoAtual = 'RETRUCO';
        if (gameState.retrucoState.accepted) {
          estadoAtual += ' (ACEITO)';
        } else {
          estadoAtual += ' (PENDENTE)';
        }
      }
      if (gameState.vale4State) {
        estadoAtual = 'VALE 4';
        if (gameState.vale4State.accepted) {
          estadoAtual += ' (ACEITO)';
        } else {
          estadoAtual += ' (PENDENTE)';
        }
      }
      console.log('=== ESTADO DO TRUCO ===');
      console.log(`Estado atual: ${estadoAtual}`);
      console.log('Valor da mão:', gameState.handValue);
      console.log('Truco State:', gameState.trucoState);
      console.log('Retruco State:', gameState.retrucoState);
      console.log('Vale 4 State:', gameState.vale4State);
    }
  }, [gameState]);
  
  const acceptRetruco = () => {
    console.log('Aceitando Retruco');
    if (currentRoom) {
      respondToRetruco(currentRoom.id, true);
      setShowRetrucoResponseDialog(false);
      setShowRetrucoIndicator(false);
      setCanRequestTruco(false);
      setCanRequestRetruco(false);
      setCanRequestVale4(false);
    }
  };

  const declineRetruco = () => {
    console.log('Recusando Retruco');
    if (currentRoom) {
      respondToRetruco(currentRoom.id, false);
      setShowRetrucoResponseDialog(false);
      setShowRetrucoIndicator(false);
      setCanRequestTruco(false);
      setCanRequestRetruco(false);
      setCanRequestVale4(false);
    }
  };

  const acceptVale4 = () => {
    console.log('Aceitando Vale 4');
    if (currentRoom) {
      respondToVale4(currentRoom.id, true);
      setShowVale4ResponseDialog(false);
      setShowVale4Indicator(false);
      setCanRequestTruco(false);
      setCanRequestRetruco(false);
      setCanRequestVale4(false);
    }
  };

  const declineVale4 = () => {
    console.log('Recusando Vale 4');
    if (currentRoom) {
      respondToVale4(currentRoom.id, false);
      setShowVale4ResponseDialog(false);
      setShowVale4Indicator(false);
      setCanRequestTruco(false);
      setCanRequestRetruco(false);
      setCanRequestVale4(false);
    }
  };
  
  return (
    <GameRoomContainer>
      <GameHeader>
        <RoomInfo>
          <GameTitle>Truco Gaúcho</GameTitle>
          <div>Sala: {currentRoom?.name || roomId}</div>
        </RoomInfo>
      </GameHeader>
      
      {error && (
        <ErrorMessage>
          {error}
          <CloseButton onClick={clearError}>&times;</CloseButton>
        </ErrorMessage>
      )}
      
      {renderGameArea()}
    </GameRoomContainer>
  );
};

const fadeInOut = keyframes`
  0% { opacity: 0; }
  50% { opacity: 1; }
  100% { opacity: 0; }
`;

// Adicionar os componentes estilizados para a mensagem de carregamento
const LoadingMessage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: white;
`;

const LoadingText = styled.div`
  font-size: 1.5rem;
  margin-bottom: 20px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
`;

const LoadingSpinner = styled.div`
  width: 50px;
  height: 50px;
  border: 5px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #FFD700;
  animation: spin 1s ease-in-out infinite;
  
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

export default GameRoom;
