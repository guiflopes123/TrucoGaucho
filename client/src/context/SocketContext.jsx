import React, { createContext, useContext, useState, useEffect } from 'react';
import API_URL from '../config/api';
import { io } from 'socket.io-client';

// Criar o contexto do Socket
const SocketContext = createContext();

// Provedor do Socket
export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [cards, setCards] = useState([]);
  const [error, setError] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const maxReconnectAttempts = 20;
  const reconnectDelay = 2000;

  // Inicializar o socket
  useEffect(() => {
    const newSocket = io(API_URL, {
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: reconnectDelay,
      timeout: 60000,
      transports: ['websocket', 'polling']
    });
    
    newSocket.on('connect', () => {
      console.log('Conectado ao servidor');
      setConnected(true);
      setError(null);
      setReconnectAttempts(0);
      setIsReconnecting(false);
      
      // Tentar reconectar à sala se houver uma sala atual
      if (currentRoom) {
        console.log('Tentando reconectar à sala:', currentRoom);
        // Adicionar um pequeno delay antes de tentar reconectar à sala
        setTimeout(() => {
          newSocket.emit('reconnect_to_room', {
            roomId: currentRoom,
            timestamp: Date.now()
          });
        }, 1000);
      }
    });
    
    newSocket.on('disconnect', (reason) => {
      console.log('Desconectado do servidor:', reason);
      setConnected(false);
      setIsReconnecting(true);
      
      if (reason === 'io server disconnect') {
        // O servidor desconectou intencionalmente
        console.log('Tentando reconectar após desconexão do servidor...');
        newSocket.connect();
      } else if (reason === 'transport close') {
        // A conexão foi fechada, tentar reconectar
        console.log('Conexão fechada, tentando reconectar...');
        setTimeout(() => {
          newSocket.connect();
        }, reconnectDelay);
      } else if (reason === 'ping timeout') {
        // Timeout do ping, tentar reconectar
        console.log('Timeout do ping, tentando reconectar...');
        setTimeout(() => {
          newSocket.connect();
        }, reconnectDelay);
      }
    });
    
    newSocket.on('connect_error', (err) => {
      console.error('Erro de conexão:', err);
      setError('Erro ao conectar ao servidor. Tentando reconectar...');
    });
    
    newSocket.on('reconnect_failed', () => {
      console.log('Falha na reconexão após várias tentativas');
      setReconnectAttempts(prev => prev + 1);
      
      if (reconnectAttempts >= maxReconnectAttempts) {
        setIsReconnecting(false);
        // Notificar o usuário sobre a falha na reconexão
        alert('Não foi possível reconectar ao servidor. Por favor, atualize a página.');
      }
    });
    
    newSocket.on('reconnect_to_room_response', (response) => {
      if (response.success) {
        console.log('Reconectado à sala com sucesso');
        setGameState(response.gameState);
      } else {
        console.log('Falha ao reconectar à sala:', response.message);
        // Notificar o usuário sobre a falha na reconexão à sala
        alert('Não foi possível reconectar à sala do jogo. Por favor, tente entrar novamente.');
      }
    });
    
    // Eventos de sala
    newSocket.on('rooms_list', (data) => {
      setRooms(data.rooms);
    });
    
    newSocket.on('rooms_updated', (data) => {
      setRooms(data.rooms);
    });
    
    newSocket.on('room_created', (data) => {
      console.log('Sala criada:', data);
      setCurrentRoom(data.room);
      
      // Atualizar o estado do jogo
      if (data.gameState) {
        console.log('Estado do jogo recebido do servidor (criação de sala):', data.gameState);
        setGameState(data.gameState);
      } else {
        console.log('Criando estado inicial do jogo (criação de sala)');
        setGameState({
          status: 'waiting',
          gameStatus: 'waiting',
          players: data.room.players,
          teams: [
            { id: 1, name: 'Time 1', score: 0, roundsWon: 0 },
            { id: 2, name: 'Time 2', score: 0, roundsWon: 0 }
          ]
        });
      }
    });
    
    newSocket.on('room_joined', (data) => {
      console.log('Entrou na sala:', data);
      setCurrentRoom(data.room);
      
      // Inicializar o estado do jogo
      if (data.gameState) {
        console.log('Estado do jogo recebido do servidor:', data.gameState);
        setGameState(data.gameState);
      } else {
        console.log('Criando estado inicial do jogo');
        setGameState({
          status: 'waiting',
          gameStatus: 'waiting',
          players: data.room.players,
          teams: [
            { id: 1, name: 'Time 1', score: 0, roundsWon: 0 },
            { id: 2, name: 'Time 2', score: 0, roundsWon: 0 }
          ]
        });
      }
    });
    
    newSocket.on('room_left', () => {
      setCurrentRoom(null);
      setGameState(null);
      setCards([]);
    });
    
    // Eventos de jogo
    newSocket.on('game_state_updated', (data) => {
      console.log('Estado do jogo atualizado:', data);
      if (data.gameState) {
        setGameState(data.gameState);
        
        // Atualizar as cartas do jogador se disponíveis
        if (data.gameState.players) {
          const currentPlayer = data.gameState.players.find(p => p.id === newSocket.id);
          if (currentPlayer) {
            if (currentPlayer.hand) {
              setCards(currentPlayer.hand);
            }
            // Atualizar o estado do jogador (pronto/não pronto)
            if (currentPlayer.isReady !== undefined) {
              setPlayerReady(currentPlayer.isReady);
            }
          }
        }
      }
    });
    
    newSocket.on('cards_dealt', (data) => {
      if (data.success) {
        setCards(data.cards);
      }
    });
    
    newSocket.on('cards_updated', (data) => {
      if (data.success) {
        setCards(data.cards);
      }
    });
    
    // Eventos de Truco
    newSocket.on('truco_requested', (data) => {
      // Atualizar o estado do jogo para mostrar o pedido de Truco
      console.log('Truco pedido por:', data.playerId);
    });
    
    newSocket.on('truco_response_received', (data) => {
      // Atualizar o estado do jogo com a resposta ao Truco
      console.log('Resposta ao Truco de:', data.playerId, 'Aceito:', data.accepted);
    });
    
    newSocket.on('retruco_response_received', (data) => {
      // Atualizar o estado do jogo com a resposta ao Retruco
      console.log('Resposta ao Retruco de:', data.playerId, 'Aceito:', data.accepted);
    });
    
    newSocket.on('vale4_response_received', (data) => {
      // Atualizar o estado do jogo com a resposta ao Vale 4
      console.log('Resposta ao Vale 4 de:', data.playerId, 'Aceito:', data.accepted);
    });
    
    // Eventos de Envido
    newSocket.on('envido_requested', (data) => {
      // Atualizar o estado do jogo para mostrar o pedido de Envido
      console.log('Envido pedido por:', data.playerId);
    });
    
    newSocket.on('real_envido_requested', (data) => {
      // Atualizar o estado do jogo para mostrar o pedido de Real Envido
      console.log('Real Envido pedido por:', data.playerId);
    });
    
    newSocket.on('falta_envido_requested', (data) => {
      // Atualizar o estado do jogo para mostrar o pedido de Falta Envido
      console.log('Falta Envido pedido por:', data.playerId);
    });
    
    newSocket.on('envido_response_received', (data) => {
      // Atualizar o estado do jogo com a resposta ao Envido
      console.log('Resposta ao Envido de:', data.playerId, 'Aceito:', data.accepted);
      if (data.accepted) {
        console.log('Time 1 Envido:', data.team1Envido, 'Time 2 Envido:', data.team2Envido);
        console.log('Time vencedor:', data.winningTeam);
      }
    });
    
    // Eventos de Flor
    newSocket.on('flor_declared', (data) => {
      // Atualizar o estado do jogo para mostrar a declaração de Flor
      console.log('Flor cantada por:', data.playerId);
    });
    
    newSocket.on('contra_flor_requested', (data) => {
      // Atualizar o estado do jogo para mostrar o pedido de Contra-Flor
      console.log('Contra-Flor pedida por:', data.playerId);
    });
    
    newSocket.on('contra_flor_resto_requested', (data) => {
      // Atualizar o estado do jogo para mostrar o pedido de Contra-Flor e o Resto
      console.log('Contra-Flor e o Resto pedida por:', data.playerId);
    });
    
    newSocket.on('flor_response_received', (data) => {
      // Atualizar o estado do jogo com a resposta à Flor
      console.log('Resposta à Flor de:', data.playerId, 'Aceito:', data.accepted);
      if (data.accepted) {
        console.log('Time 1 Flor:', data.team1Flor, 'Time 2 Flor:', data.team2Flor);
        console.log('Time vencedor:', data.winningTeam);
      }
    });
    
    // Eventos de erro
    newSocket.on('error', (data) => {
      console.error('Erro do servidor:', data.message);
      setError(data.message);
    });
    
    setSocket(newSocket);
    
    // Limpar o socket ao desmontar o componente
    return () => {
      newSocket.close();
    };
  }, []);
  
  // Obter lista de salas
  const getRooms = () => {
    if (socket) {
      socket.emit('get_rooms');
    }
  };
  
  // Criar uma sala
  const createRoom = (roomName, maxPlayers, playerName) => {
    if (socket) {
      socket.emit('create_room', { roomName, maxPlayers, playerName });
    }
  };
  
  // Entrar em uma sala
  const joinRoom = (roomId, playerName) => {
    if (socket) {
      socket.emit('join_room', { roomId, playerName });
    }
  };
  
  // Sair de uma sala
  const leaveRoom = (roomId) => {
    if (socket && currentRoom) {
      socket.emit('leave_room', { roomId });
    }
  };
  
  // Jogar uma carta
  const playCard = (roomId, card) => {
    if (socket && currentRoom) {
      socket.emit('play_card', { roomId, card });
    }
  };
  
  // Pedir Truco
  const requestTruco = (roomId) => {
    if (socket && currentRoom) {
      socket.emit('truco', { roomId });
    }
  };
  
  // Responder ao Truco
  const respondToTruco = (roomId, accept) => {
    if (socket && currentRoom) {
      socket.emit('truco_response', { roomId, accept });
    }
  };

  // Pedir Retruco
  const requestRetruco = (roomId) => {
    if (socket && currentRoom) {
      socket.emit('retruco', { roomId });
    }
  };

  // Responder ao Retruco
  const respondToRetruco = (roomId, accept) => {
    if (socket && currentRoom) {
      socket.emit('retruco_response', { roomId, accept });
    }
  };

  // Pedir Vale 4
  const requestVale4 = (roomId) => {
    if (socket && currentRoom) {
      socket.emit('vale4', { roomId });
    }
  };

  // Responder ao Vale 4
  const respondToVale4 = (roomId, accept) => {
    if (socket && currentRoom) {
      socket.emit('vale4_response', { roomId, accept });
    }
  };
    
  // Pedir Envido
  const requestEnvido = (roomId) => {
    if (socket && currentRoom) {
      socket.emit('envido', { roomId });
    }
  };
  
  // Pedir Real Envido
  const requestRealEnvido = (roomId) => {
    if (socket && currentRoom) {
      socket.emit('real_envido', { roomId });
    }
  };
  
  // Pedir Falta Envido
  const requestFaltaEnvido = (roomId) => {
    if (socket && currentRoom) {
      socket.emit('falta_envido', { roomId });
    }
  };
  
  // Responder ao Envido
  const respondToEnvido = (roomId, accept) => {
    if (socket && currentRoom) {
      socket.emit('envido_response', { roomId, accept });
    }
  };
  
  // Cantar Flor
  const declareFlor = (roomId) => {
    if (socket && currentRoom) {
      socket.emit('flor', { roomId });
    }
  };
  
  // Pedir Contra-Flor
  const requestContraFlor = (roomId) => {
    if (socket && currentRoom) {
      socket.emit('contra_flor', { roomId });
    }
  };
  
  // Pedir Contra-Flor e o Resto
  const requestContraFlorResto = (roomId) => {
    if (socket && currentRoom) {
      socket.emit('contra_flor_resto', { roomId });
    }
  };
  
  // Responder à Flor
  const respondToFlor = (roomId, accept) => {
    if (socket && currentRoom) {
      socket.emit('flor_response', { roomId, accept });
    }
  };
  
  // Marcar jogador como pronto
  const setPlayerReady = (roomId) => {
    if (socket && currentRoom) {
      socket.emit('player_ready', { roomId });
    }
  };
  
  // Limpar erro
  const clearError = () => {
    setError(null);
  };
  
  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
        rooms,
        currentRoom,
        gameState,
        cards,
        error,
        getRooms,
        createRoom,
        joinRoom,
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
        setPlayerReady,
        clearError
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

// Hook para usar o contexto do Socket
export const useSocket = () => useContext(SocketContext);
