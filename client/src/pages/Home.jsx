import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { useSocket } from '../context/SocketContext';

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

const HomeContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  padding: 20px;
  text-align: center;
  background: linear-gradient(to bottom, #006400, #003300);
  animation: ${fadeIn} 1s ease;
`;

const Logo = styled.div`
  margin-bottom: 30px;
  animation: ${slideUp} 1s ease;
`;

const Title = styled.h1`
  font-size: 3.5rem;
  margin-bottom: 10px;
  color: #FFD700;
  text-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
  animation: ${slideUp} 1s ease;
`;

const Subtitle = styled.h2`
  font-size: 1.5rem;
  margin-bottom: 40px;
  color: #F5F5F5;
  animation: ${slideUp} 1.2s ease;
`;

const FormContainer = styled.div`
  background-color: rgba(0, 0, 0, 0.5);
  padding: 30px;
  border-radius: 15px;
  width: 100%;
  max-width: 500px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 215, 0, 0.3);
  animation: ${slideUp} 1.4s ease;
`;

const Input = styled.input`
  width: 100%;
  padding: 15px;
  margin-bottom: 20px;
  border-radius: 8px;
  border: 2px solid #004d00;
  font-size: 1.1rem;
  background-color: rgba(255, 255, 255, 0.9);
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: #FFD700;
    box-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
  }
`;

const Button = styled.button`
  background: linear-gradient(to bottom, #B22222, #8B0000);
  color: white;
  font-size: 1.2rem;
  font-weight: bold;
  padding: 15px 30px;
  border-radius: 8px;
  border: none;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
  cursor: pointer;
  width: 100%;
  
  &:hover {
    background: linear-gradient(to bottom, #8B0000, #800000);
    transform: translateY(-3px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.4);
  }
  
  &:active {
    transform: translateY(1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }
  
  &:disabled {
    background: #666;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  background-color: rgba(220, 53, 69, 0.8);
  color: white;
  padding: 10px;
  border-radius: 5px;
  margin-bottom: 20px;
  text-align: left;
`;

const Footer = styled.footer`
  margin-top: 40px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  animation: ${fadeIn} 2s ease;
`;

const CardImage = styled.div`
  width: 100px;
  height: 150px;
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 2rem;
  margin: 0 -20px;
  transform: ${props => `rotate(${props.rotation}deg)`};
`;

const CardDisplay = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 30px;
`;

const Home = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [isValid, setIsValid] = useState(false);
  const { connected, error, clearError } = useSocket();
  
  useEffect(() => {
    // Verificar se já existe um nome de usuário armazenado
    const storedUsername = localStorage.getItem('username');
    if (storedUsername) {
      setUsername(storedUsername);
      setIsValid(true);
    }
  }, []);
  
  // Validar nome de usuário
  useEffect(() => {
    setIsValid(username.trim().length >= 3);
  }, [username]);
  
  const handleJoinLobby = (e) => {
    e.preventDefault();
    
    if (isValid) {
      // Armazenar nome do usuário no localStorage
      localStorage.setItem('username', username);
      navigate('/lobby');
    }
  };
  
  return (
    <HomeContainer>
      <Logo>
        <CardDisplay>
          <CardImage rotation="-15" style={{ color: 'black' }}>♠</CardImage>
          <CardImage rotation="-5" style={{ color: 'red' }}>♥</CardImage>
          <CardImage rotation="5" style={{ color: 'black' }}>♣</CardImage>
          <CardImage rotation="15" style={{ color: 'red' }}>♦</CardImage>
        </CardDisplay>
      </Logo>
      
      <Title>Truco Gaúcho Online</Title>
      <Subtitle>Jogue o tradicional Truco Gaúcho com amigos online!</Subtitle>
      
      <FormContainer>
        {error && (
          <ErrorMessage>
            {error}
            <button onClick={clearError} style={{ float: 'right', background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
              &times;
            </button>
          </ErrorMessage>
        )}
        
        <form onSubmit={handleJoinLobby}>
          <Input 
            type="text" 
            placeholder="Digite seu nome (mínimo 3 caracteres)" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            minLength={3}
            required
          />
          
          <Button 
            type="submit" 
            disabled={!isValid || !connected}
          >
            {connected ? 'Entrar no Lobby' : 'Conectando...'}
          </Button>
        </form>
      </FormContainer>
      
      <Footer>
        © 2025 Truco Gaúcho Online - Desenvolvido com ♥
      </Footer>
    </HomeContainer>
  );
};

export default Home;
