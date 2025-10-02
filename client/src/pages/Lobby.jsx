import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useSocket } from '../context/SocketContext';

const LobbyContainer = styled.div`
  display: flex;
  flex-direction: column;
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding: 10px 0;
  border-bottom: 2px solid #FFD700;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  color: #FFD700;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
`;

const UserInfo = styled.div`
  font-size: 1.2rem;
`;

const Content = styled.div`
  display: flex;
  gap: 20px;
  height: calc(100vh - 150px);
`;

const RoomsList = styled.div`
  flex: 2;
  background-color: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
  padding: 20px;
  overflow-y: auto;
`;

const RoomsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const RoomItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.1);
  padding: 15px;
  margin-bottom: 10px;
  border-radius: 5px;
  transition: all 0.3s ease;
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.2);
  }
`;

const CreateRoomSection = styled.div`
  flex: 1;
  background-color: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
  padding: 20px;
`;

const Button = styled.button`
  background-color: ${props => props.secondary ? '#4682B4' : '#B22222'};
  color: white;
  font-size: 1rem;
  padding: 10px 20px;
  border-radius: 5px;
  border: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  
  &:hover {
    background-color: ${props => props.secondary ? '#36648B' : '#8B0000'};
  }
  
  &:disabled {
    background-color: #666;
    cursor: not-allowed;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-size: 1rem;
`;

const Select = styled.select`
  width: 100%;
  padding: 10px;
  border-radius: 5px;
  border: 1px solid #ccc;
  background-color: white;
  color: #333;
  font-size: 1rem;
`;

const ErrorMessage = styled.div`
  background-color: rgba(220, 53, 69, 0.8);
  color: white;
  padding: 10px;
  border-radius: 5px;
  margin-bottom: 20px;
`;

const Lobby = () => {
  const navigate = useNavigate();
  const [roomName, setRoomName] = useState('');
  const [playerCount, setPlayerCount] = useState('2');
  const [username, setUsername] = useState('');
  
  const { 
    connected, 
    rooms, 
    currentRoom, 
    error, 
    getRooms, 
    createRoom, 
    joinRoom, 
    clearError 
  } = useSocket();
  
  useEffect(() => {
    // Verificar se o usuário está logado
    const storedUsername = localStorage.getItem('username');
    if (!storedUsername) {
      navigate('/');
      return;
    }
    setUsername(storedUsername);
    
    // Obter lista de salas
    if (connected) {
      getRooms();
      
      // Configurar intervalo para atualizar a lista de salas
      const interval = setInterval(() => {
        getRooms();
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [connected, getRooms, navigate]);
  
  // Redirecionar para a sala quando entrar em uma
  useEffect(() => {
    if (currentRoom) {
      navigate(`/room/${currentRoom.id}`);
    }
  }, [currentRoom, navigate]);
  
  const handleCreateRoom = () => {
    if (!roomName.trim()) {
      alert('Por favor, digite um nome para a sala');
      return;
    }
    
    createRoom(roomName, parseInt(playerCount), username);
  };
  
  const handleJoinRoom = (roomId) => {
    joinRoom(roomId, username);
  };
  
  const handleLogout = () => {
    localStorage.removeItem('username');
    navigate('/');
  };
  
  const handleRefreshRooms = () => {
    getRooms();
  };
  
  return (
    <LobbyContainer>
      <Header>
        <Title>Lobby - Truco Gaúcho</Title>
        <UserInfo>
          Bem-vindo, {username}! 
          <Button secondary onClick={handleLogout} style={{ marginLeft: '10px' }}>Sair</Button>
        </UserInfo>
      </Header>
      
      {error && (
        <ErrorMessage>
          {error}
          <Button secondary onClick={clearError} style={{ marginLeft: '10px', padding: '5px 10px' }}>
            Fechar
          </Button>
        </ErrorMessage>
      )}
      
      <Content>
        <RoomsList>
          <RoomsHeader>
            <h2>Salas Disponíveis</h2>
            <Button secondary onClick={handleRefreshRooms}>Atualizar</Button>
          </RoomsHeader>
          
          {!connected ? (
            <p>Conectando ao servidor...</p>
          ) : rooms.length === 0 ? (
            <p>Nenhuma sala disponível. Crie uma nova sala!</p>
          ) : (
            rooms.map(room => (
              <RoomItem key={room.id}>
                <div>
                  <h3>{room.name}</h3>
                  <p>Jogadores: {room.players}/{room.maxPlayers} • Status: {room.status === 'waiting' ? 'Aguardando' : 'Em jogo'}</p>
                </div>
                <Button 
                  onClick={() => handleJoinRoom(room.id)}
                  disabled={room.players >= room.maxPlayers || room.status !== 'waiting'}
                >
                  Entrar
                </Button>
              </RoomItem>
            ))
          )}
        </RoomsList>
        
        <CreateRoomSection>
          <h2>Criar Nova Sala</h2>
          <FormGroup>
            <Label htmlFor="roomName">Nome da Sala:</Label>
            <input
              id="roomName"
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              style={{ width: '100%' }}
            />
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="playerCount">Número de Jogadores:</Label>
            <Select
              id="playerCount"
              value={playerCount}
              onChange={(e) => setPlayerCount(e.target.value)}
            >
              <option value="2">2 Jogadores</option>
              <option value="4">4 Jogadores</option>
            </Select>
          </FormGroup>
          
          <Button onClick={handleCreateRoom} disabled={!connected}>Criar Sala</Button>
        </CreateRoomSection>
      </Content>
    </LobbyContainer>
  );
};

export default Lobby;
