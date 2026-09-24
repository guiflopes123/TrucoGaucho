import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import API_URL from '../config/api';
import { getSessionToken } from '../utils/session';
import { playSound } from '../utils/sound';

const SocketContext = createContext(null);

const NOTICE_TTL_MS = 6000;
const MAX_NOTICES = 4;
const MAX_CHAT_MESSAGES = 100;
const ACK_TIMEOUT_MS = 5000;

// Única fonte da verdade do cliente: conexão, sala atual, estado da partida, chat e avisos.
// Os componentes só leem daqui e disparam ações; não registram listeners no socket.
export const SocketProvider = ({ children }) => {
  const socketRef = useRef(null);
  const currentRoomRef = useRef(null);
  const noticeTimers = useRef(new Set());
  const noticeSeq = useRef(0);

  const [connected, setConnected] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [playerId, setPlayerId] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [notices, setNotices] = useState([]);
  const [chat, setChat] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    currentRoomRef.current = currentRoom;
  }, [currentRoom]);

  useEffect(() => {
    const socket = io(API_URL, {
      auth: { token: getSessionToken() },
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;
    let replaced = false;

    const pushNotice = (message) => {
      noticeSeq.current += 1;
      const notice = { id: noticeSeq.current, message };
      setNotices(prev => [...prev, notice].slice(-MAX_NOTICES));

      const timer = setTimeout(() => {
        noticeTimers.current.delete(timer);
        setNotices(prev => prev.filter(n => n.id !== notice.id));
      }, NOTICE_TTL_MS);
      noticeTimers.current.add(timer);
    };

    const clearRoom = () => {
      setCurrentRoom(null);
      setGameState(null);
      setNotices([]);
      setChat([]);
    };

    const enterRoom = ({ room, gameState: state, chat: history }) => {
      setCurrentRoom(room);
      setGameState(state);
      setChat(history || []);
    };

    socket.on('connect', () => {
      setConnected(true);
      setError(null);
    });

    socket.on('disconnect', (reason) => {
      setConnected(false);
      setSessionReady(false);
      // Se o servidor encerrou a conexão por outro motivo que não a substituição da sessão,
      // tentamos voltar; as quedas de rede o próprio socket.io reconecta sozinho.
      if (reason === 'io server disconnect' && !replaced) socket.connect();
    });

    socket.on('connect_error', () => {
      setError('Não foi possível conectar ao servidor. Tentando novamente...');
    });

    socket.on('session', ({ playerId: id, roomId }) => {
      setPlayerId(id);
      setSessionReady(true);
      if (!roomId) {
        if (currentRoomRef.current) {
          setError('Você não está mais na sala: ela foi encerrada, o servidor foi reiniciado ou você ficou tempo demais desconectado.');
        }
        clearRoom();
      }
    });

    socket.on('session_replaced', () => {
      replaced = true;
      setError('Esta sessão foi aberta em outra aba. Feche a outra aba ou recarregue esta página.');
      clearRoom();
    });

    socket.on('rooms_list', ({ rooms: list }) => setRooms(list));
    socket.on('rooms_updated', ({ rooms: list }) => setRooms(list));

    socket.on('room_created', enterRoom);
    socket.on('room_joined', enterRoom);
    socket.on('room_rejoined', enterRoom);
    socket.on('room_left', clearRoom);
    socket.on('room_closed', ({ message }) => {
      clearRoom();
      setError(message || 'A sala foi encerrada.');
    });

    socket.on('game_state_updated', ({ gameState: state }) => setGameState(state));
    socket.on('game_notice', ({ message }) => pushNotice(message));
    socket.on('chat_message', (message) => {
      setChat(prev => (prev.some(m => m.id === message.id) ? prev : [...prev, message].slice(-MAX_CHAT_MESSAGES)));
    });
    socket.on('error', ({ message }) => setError(message));

    const timers = noticeTimers.current;
    return () => {
      timers.forEach(clearTimeout);
      timers.clear();
      socket.removeAllListeners();
      socket.close();
      socketRef.current = null;
    };
  }, []);

  const emitWithAck = useCallback((event, data = {}, timeoutMs = ACK_TIMEOUT_MS) => new Promise((resolve) => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) {
      resolve({ success: false, message: 'Sem conexão com o servidor' });
      return;
    }
    socket.timeout(timeoutMs).emit(event, data, (err, response) => {
      resolve(err ? { success: false, message: 'O servidor não respondeu' } : response);
    });
  }), []);

  const getRooms = useCallback(() => {
    const socket = socketRef.current;
    if (socket && socket.connected) socket.emit('get_rooms');
  }, []);

  const createRoom = useCallback(
    (roomName, maxPlayers, playerName, password = '') =>
      emitWithAck('create_room', { roomName, maxPlayers, playerName, password }),
    [emitWithAck]
  );

  const joinRoom = useCallback(
    (roomId, playerName, password) => emitWithAck('join_room', { roomId, playerName, password }),
    [emitWithAck]
  );

  const leaveRoom = useCallback(async () => {
    const response = await emitWithAck('leave_room', {}, 3000);
    setCurrentRoom(null);
    setGameState(null);
    setNotices([]);
    setChat([]);
    return response;
  }, [emitWithAck]);

  const setPlayerReady = useCallback(() => emitWithAck('player_ready'), [emitWithAck]);
  const playAgain = useCallback(() => emitWithAck('play_again'), [emitWithAck]);
  const addBot = useCallback(() => emitWithAck('add_bot'), [emitWithAck]);
  const removeBot = useCallback(() => emitWithAck('remove_bot'), [emitWithAck]);
  const sendChat = useCallback((text) => emitWithAck('chat', { text }), [emitWithAck]);

  // Ações de jogo (play_card, truco, truco_response, envido, flor...). A sala é a do próprio
  // jogador no servidor; erros chegam pelo evento 'error'.
  const sendAction = useCallback((event, payload = {}) => emitWithAck(event, payload), [emitWithAck]);

  const clearError = useCallback(() => setError(null), []);

  // Som discreto quando chega mensagem de outro jogador.
  const lastChat = chat[chat.length - 1];
  const lastChatId = lastChat ? lastChat.id : null;
  const lastChatFrom = lastChat ? lastChat.playerId : null;
  useEffect(() => {
    if (lastChatId && lastChatFrom !== playerId) playSound('chat');
  }, [lastChatId, lastChatFrom, playerId]);

  const value = useMemo(() => ({
    connected,
    sessionReady,
    playerId,
    rooms,
    currentRoom,
    gameState,
    notices,
    chat,
    error,
    getRooms,
    createRoom,
    joinRoom,
    leaveRoom,
    setPlayerReady,
    playAgain,
    addBot,
    removeBot,
    sendChat,
    sendAction,
    clearError
  }), [
    connected, sessionReady, playerId, rooms, currentRoom, gameState, notices, chat, error,
    getRooms, createRoom, joinRoom, leaveRoom, setPlayerReady, playAgain, addBot, removeBot,
    sendChat, sendAction, clearError
  ]);

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket deve ser usado dentro de um SocketProvider');
  return context;
};
