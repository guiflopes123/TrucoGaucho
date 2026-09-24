import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useSocket } from '../context/SocketContext';
import { PasswordDialog } from '../components/GameDialog';

const ROOMS_REFRESH_MS = 10000;

const LobbyContainer = styled.div`
  display: flex;
  flex-direction: column;
  padding: 20px;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 24px;
  padding: 10px 0;
  border-bottom: 2px solid #ffd700;
`;

const Title = styled.h1`
  font-size: 2.2rem;
  color: #ffd700;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.1rem;
`;

const Content = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: flex-start;
`;

const Panel = styled.section`
  background-color: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
  padding: 20px;
`;

const RoomsList = styled(Panel)`
  flex: 2 1 380px;
  min-height: 240px;
`;

const CreateRoomSection = styled(Panel)`
  flex: 1 1 280px;
`;

const RoomsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const RoomItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  background-color: rgba(255, 255, 255, 0.1);
  padding: 14px;
  margin-bottom: 10px;
  border-radius: 5px;
  transition: background-color 0.3s ease;

  &:hover {
    background-color: rgba(255, 255, 255, 0.2);
  }
`;

const Button = styled.button`
  background-color: ${props => (props.$secondary ? '#4682b4' : '#b22222')};
  color: white;
  font-size: 1rem;
  padding: 10px 20px;
  border-radius: 5px;
  border: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);

  &:hover:not(:disabled) {
    background-color: ${props => (props.$secondary ? '#36648b' : '#8b0000')};
  }

  &:disabled {
    background-color: #666;
    cursor: not-allowed;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 20px;

  input,
  select {
    width: 100%;
  }
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
`;

const Select = styled.select`
  padding: 10px;
  border-radius: 5px;
  border: 1px solid #ccc;
  background-color: white;
  color: #333;
  font-size: 1rem;
`;

const ErrorMessage = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  background-color: rgba(220, 53, 69, 0.85);
  color: white;
  padding: 10px 14px;
  border-radius: 5px;
  margin-bottom: 20px;
`;

const Lobby = () => {
  const navigate = useNavigate();
  const [roomName, setRoomName] = useState('');
  const [playerCount, setPlayerCount] = useState('2');
  const [roomPassword, setRoomPassword] = useState('');
  const [passwordFor, setPasswordFor] = useState(null);
  const [busy, setBusy] = useState(false);
  const [username] = useState(() => localStorage.getItem('username') || '');

  const {
    connected,
    sessionReady,
    rooms,
    currentRoom,
    error,
    getRooms,
    createRoom,
    joinRoom,
    clearError
  } = useSocket();

  useEffect(() => {
    if (!username) navigate('/', { replace: true });
  }, [username, navigate]);

  useEffect(() => {
    if (!connected) return undefined;
    getRooms();
    const interval = setInterval(getRooms, ROOMS_REFRESH_MS);
    return () => clearInterval(interval);
  }, [connected, getRooms]);

  useEffect(() => {
    if (currentRoom) navigate(`/room/${currentRoom.id}`);
  }, [currentRoom, navigate]);

  const handleCreateRoom = async (event) => {
    event.preventDefault();
    if (!roomName.trim() || busy) return;

    setBusy(true);
    await createRoom(roomName, Number(playerCount), username, roomPassword);
    setBusy(false);
  };

  const handleJoinRoom = async (room, password) => {
    if (busy) return;
    if (room.hasPassword && password === undefined) {
      setPasswordFor({ room, error: null });
      return;
    }

    setBusy(true);
    const response = await joinRoom(room.id, username, password);
    setBusy(false);

    if (response.success) setPasswordFor(null);
    else if (response.needsPassword) setPasswordFor({ room, error: response.message });
  };

  const handleLogout = () => {
    localStorage.removeItem('username');
    navigate('/');
  };

  const ready = connected && sessionReady;

  return (
    <LobbyContainer>
      <Header>
        <Title>Lobby - Truco Gaúcho</Title>
        <UserInfo>
          Bem-vindo, {username}!
          <Button type="button" $secondary onClick={handleLogout}>Sair</Button>
        </UserInfo>
      </Header>

      {error && (
        <ErrorMessage role="alert">
          <span>{error}</span>
          <Button type="button" $secondary onClick={clearError}>Fechar</Button>
        </ErrorMessage>
      )}

      <Content>
        <RoomsList aria-label="Salas disponíveis">
          <RoomsHeader>
            <h2>Salas Disponíveis</h2>
            <Button type="button" $secondary onClick={getRooms} disabled={!ready}>Atualizar</Button>
          </RoomsHeader>

          {!ready ? (
            <p>Conectando ao servidor...</p>
          ) : rooms.length === 0 ? (
            <p>Nenhuma sala disponível. Crie uma nova sala!</p>
          ) : (
            rooms.map(room => (
              <RoomItem key={room.id}>
                <div>
                  <h3>{room.hasPassword ? '🔒 ' : ''}{room.name}</h3>
                  <p>
                    Jogadores: {room.players}/{room.maxPlayers}
                    {room.bots > 0 ? ` (${room.bots} bot${room.bots > 1 ? 's' : ''})` : ''}
                    {' '}• Status: {room.status === 'waiting' ? 'Aguardando' : 'Em jogo'}
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => handleJoinRoom(room)}
                  disabled={busy || room.players >= room.maxPlayers || room.status !== 'waiting'}
                >
                  Entrar
                </Button>
              </RoomItem>
            ))
          )}
        </RoomsList>

        <CreateRoomSection aria-label="Criar nova sala">
          <h2>Criar Nova Sala</h2>
          <form onSubmit={handleCreateRoom}>
            <FormGroup>
              <Label htmlFor="roomName">Nome da Sala:</Label>
              <input
                id="roomName"
                type="text"
                value={roomName}
                maxLength={30}
                onChange={(e) => setRoomName(e.target.value)}
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="playerCount">Número de Jogadores:</Label>
              <Select id="playerCount" value={playerCount} onChange={(e) => setPlayerCount(e.target.value)}>
                <option value="2">2 Jogadores</option>
                <option value="4">4 Jogadores</option>
              </Select>
            </FormGroup>

            <FormGroup>
              <Label htmlFor="roomPassword">Senha (opcional):</Label>
              <input
                id="roomPassword"
                type="password"
                autoComplete="off"
                value={roomPassword}
                maxLength={30}
                placeholder="Deixe em branco para sala pública"
                onChange={(e) => setRoomPassword(e.target.value)}
              />
            </FormGroup>

            <Button type="submit" disabled={!ready || busy || !roomName.trim()}>Criar Sala</Button>
          </form>
        </CreateRoomSection>
      </Content>

      {passwordFor && (
        <PasswordDialog
          roomName={passwordFor.room.name}
          error={passwordFor.error}
          onSubmit={(password) => handleJoinRoom(passwordFor.room, password)}
          onCancel={() => setPasswordFor(null)}
        />
      )}
    </LobbyContainer>
  );
};

export default Lobby;
