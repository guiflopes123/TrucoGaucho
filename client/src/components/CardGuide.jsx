import React, { useState } from 'react';
import styled from 'styled-components';

const GuideContainer = styled.div`
  position: fixed;
  right: ${props => props.isOpen ? '0' : '-300px'};
  top: 0;
  width: 300px;
  height: 100vh;
  background: rgba(0, 0, 0, 0.9);
  transition: right 0.3s ease;
  z-index: 1000;
  box-shadow: -5px 0 15px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
`;

const GuideButton = styled.button`
  position: fixed;
  right: ${props => props.isOpen ? '310px' : '10px'};
  top: 50%;
  transform: translateY(-50%);
  background: #B22222;
  color: white;
  border: none;
  border-radius: 5px 0 0 5px;
  padding: 15px 10px;
  cursor: pointer;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  font-weight: bold;
  transition: right 0.3s ease;
  z-index: 1001;
  box-shadow: -2px 0 5px rgba(0, 0, 0, 0.3);
  
  &:hover {
    background: #8B0000;
  }
`;

const GuideHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid #333;
  text-align: center;
`;

const GuideTitle = styled.h2`
  color: #FFD700;
  margin: 0;
  font-size: 1.5rem;
`;

const GuideContent = styled.div`
  padding: 20px;
  overflow-y: auto;
  flex: 1;
`;

const CardRankingSection = styled.div`
  margin-bottom: 30px;
`;

const SectionTitle = styled.h3`
  color: #FFD700;
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 1.2rem;
  border-bottom: 1px solid #444;
  padding-bottom: 5px;
`;

const CardList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const CardItem = styled.li`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #333;
  
  &:last-child {
    border-bottom: none;
  }
`;

const CardName = styled.span`
  color: white;
  display: flex;
  align-items: center;
`;

const CardValue = styled.span`
  color: ${props => props.isManilha ? '#FFD700' : '#CCC'};
  font-weight: ${props => props.isManilha ? 'bold' : 'normal'};
`;

const CardSymbol = styled.span`
  color: ${props => props.color};
  margin-right: 8px;
  font-size: 1.2rem;
`;

const RuleSection = styled.div`
  margin-bottom: 30px;
`;

const RuleList = styled.ul`
  padding-left: 20px;
  margin: 0;
  color: #CCC;
`;

const RuleItem = styled.li`
  margin-bottom: 8px;
`;

const CardGuide = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  const toggleGuide = () => {
    setIsOpen(!isOpen);
  };
  
  return (
    <>
      <GuideButton isOpen={isOpen} onClick={toggleGuide}>
        {isOpen ? 'Fechar Guia' : 'Guia do Jogo'}
      </GuideButton>
      
      <GuideContainer isOpen={isOpen}>
        <GuideHeader>
          <GuideTitle>Guia do Truco Gaúcho</GuideTitle>
        </GuideHeader>
        
        <GuideContent>
          <CardRankingSection>
            <SectionTitle>Ranking das Cartas (Maior para Menor)</SectionTitle>
            <CardList>
              <CardItem>
                <CardName>
                  <CardSymbol color="#000">♠</CardSymbol>
                  Ás de Espadas
                </CardName>
                <CardValue isManilha={true}>Manilha</CardValue>
              </CardItem>
              <CardItem>
                <CardName>
                  <CardSymbol color="#000">♣</CardSymbol>
                  Ás de Paus
                </CardName>
                <CardValue isManilha={true}>Manilha</CardValue>
              </CardItem>
              <CardItem>
                <CardName>
                  <CardSymbol color="#000">♠</CardSymbol>
                  Sete de Espadas
                </CardName>
                <CardValue isManilha={true}>Manilha</CardValue>
              </CardItem>
              <CardItem>
                <CardName>
                  <CardSymbol color="red">♦</CardSymbol>
                  Sete de Ouros
                </CardName>
                <CardValue isManilha={true}>Manilha</CardValue>
              </CardItem>
              <CardItem>
                <CardName>
                  <CardSymbol color="#000">♠</CardSymbol>
                  Três
                </CardName>
                <CardValue>10</CardValue>
              </CardItem>
              <CardItem>
                <CardName>
                  <CardSymbol color="#000">♣</CardSymbol>
                  Três
                </CardName>
                <CardValue>10</CardValue>
              </CardItem>
              <CardItem>
                <CardName>
                  <CardSymbol color="red">♥</CardSymbol>
                  Três
                </CardName>
                <CardValue>10</CardValue>
              </CardItem>
              <CardItem>
                <CardName>
                  <CardSymbol color="red">♦</CardSymbol>
                  Três
                </CardName>
                <CardValue>10</CardValue>
              </CardItem>
              <CardItem>
                <CardName>
                  <CardSymbol color="#000">♠</CardSymbol>
                  Dois
                </CardName>
                <CardValue>9</CardValue>
              </CardItem>
              <CardItem>
                <CardName>
                  <CardSymbol color="#000">♣</CardSymbol>
                  Dois
                </CardName>
                <CardValue>9</CardValue>
              </CardItem>
              <CardItem>
                <CardName>
                  <CardSymbol color="red">♥</CardSymbol>
                  Dois
                </CardName>
                <CardValue>9</CardValue>
              </CardItem>
              <CardItem>
                <CardName>
                  <CardSymbol color="red">♦</CardSymbol>
                  Dois
                </CardName>
                <CardValue>9</CardValue>
              </CardItem>
              <CardItem>
                <CardName>
                  <CardSymbol color="#000">♠</CardSymbol>
                  Ás (não manilha)
                </CardName>
                <CardValue>8</CardValue>
              </CardItem>
              <CardItem>
                <CardName>
                  <CardSymbol color="#000">♣</CardSymbol>
                  Ás (não manilha)
                </CardName>
                <CardValue>8</CardValue>
              </CardItem>
              <CardItem>
                <CardName>
                  <CardSymbol color="red">♥</CardSymbol>
                  Ás
                </CardName>
                <CardValue>8</CardValue>
              </CardItem>
              <CardItem>
                <CardName>
                  <CardSymbol color="red">♦</CardSymbol>
                  Ás
                </CardName>
                <CardValue>8</CardValue>
              </CardItem>
              <CardItem>
                <CardName>
                  <CardSymbol color="#000">♠</CardSymbol>
                  Rei (K)
                </CardName>
                <CardValue>7</CardValue>
              </CardItem>
              <CardItem>
                <CardName>
                  <CardSymbol color="#000">♣</CardSymbol>
                  Rei (K)
                </CardName>
                <CardValue>7</CardValue>
              </CardItem>
              <CardItem>
                <CardName>
                  <CardSymbol color="red">♥</CardSymbol>
                  Rei (K)
                </CardName>
                <CardValue>7</CardValue>
              </CardItem>
              <CardItem>
                <CardName>
                  <CardSymbol color="red">♦</CardSymbol>
                  Rei (K)
                </CardName>
                <CardValue>7</CardValue>
              </CardItem>
              <CardItem>
                <CardName>
                  <CardSymbol color="#000">♠</CardSymbol>
                  Valete (J)
                </CardName>
                <CardValue>6</CardValue>
              </CardItem>
              <CardItem>
                <CardName>
                  <CardSymbol color="#000">♣</CardSymbol>
                  Valete (J)
                </CardName>
                <CardValue>6</CardValue>
              </CardItem>
              <CardItem>
                <CardName>
                  <CardSymbol color="red">♥</CardSymbol>
                  Valete (J)
                </CardName>
                <CardValue>6</CardValue>
              </CardItem>
              <CardItem>
                <CardName>
                  <CardSymbol color="red">♦</CardSymbol>
                  Valete (J)
                </CardName>
                <CardValue>6</CardValue>
              </CardItem>
              <CardItem>
                <CardName>
                  <CardSymbol color="#000">♠</CardSymbol>
                  Dama (Q)
                </CardName>
                <CardValue>5</CardValue>
              </CardItem>
              <CardItem>
                <CardName>
                  <CardSymbol color="#000">♣</CardSymbol>
                  Dama (Q)
                </CardName>
                <CardValue>5</CardValue>
              </CardItem>
              <CardItem>
                <CardName>
                  <CardSymbol color="red">♥</CardSymbol>
                  Dama (Q)
                </CardName>
                <CardValue>5</CardValue>
              </CardItem>
              <CardItem>
                <CardName>
                  <CardSymbol color="red">♦</CardSymbol>
                  Dama (Q)
                </CardName>
                <CardValue>5</CardValue>
              </CardItem>
              <CardItem>
                <CardName>
                  <CardSymbol color="#000">♠</CardSymbol>
                  Sete (não manilha)
                </CardName>
                <CardValue>4</CardValue>
              </CardItem>
              <CardItem>
                <CardName>
                  <CardSymbol color="#000">♣</CardSymbol>
                  Sete
                </CardName>
                <CardValue>4</CardValue>
              </CardItem>
              <CardItem>
                <CardName>
                  <CardSymbol color="red">♥</CardSymbol>
                  Sete
                </CardName>
                <CardValue>4</CardValue>
              </CardItem>
              <CardItem>
                <CardName>
                  <CardSymbol color="red">♦</CardSymbol>
                  Sete (não manilha)
                </CardName>
                <CardValue>4</CardValue>
              </CardItem>
              <CardItem>
                <CardName>
                  <CardSymbol color="#000">♠</CardSymbol>
                  Seis
                </CardName>
                <CardValue>3</CardValue>
              </CardItem>
              <CardItem>
                <CardName>
                  <CardSymbol color="#000">♣</CardSymbol>
                  Seis
                </CardName>
                <CardValue>3</CardValue>
              </CardItem>
              <CardItem>
                <CardName>
                  <CardSymbol color="red">♥</CardSymbol>
                  Seis
                </CardName>
                <CardValue>3</CardValue>
              </CardItem>
              <CardItem>
                <CardName>
                  <CardSymbol color="red">♦</CardSymbol>
                  Seis
                </CardName>
                <CardValue>3</CardValue>
              </CardItem>
              <CardItem>
                <CardName>
                  <CardSymbol color="#000">♠</CardSymbol>
                  Cinco
                </CardName>
                <CardValue>2</CardValue>
              </CardItem>
              <CardItem>
                <CardName>
                  <CardSymbol color="#000">♣</CardSymbol>
                  Cinco
                </CardName>
                <CardValue>2</CardValue>
              </CardItem>
              <CardItem>
                <CardName>
                  <CardSymbol color="red">♥</CardSymbol>
                  Cinco
                </CardName>
                <CardValue>2</CardValue>
              </CardItem>
              <CardItem>
                <CardName>
                  <CardSymbol color="red">♦</CardSymbol>
                  Cinco
                </CardName>
                <CardValue>2</CardValue>
              </CardItem>
              <CardItem>
                <CardName>
                  <CardSymbol color="#000">♠</CardSymbol>
                  Quatro
                </CardName>
                <CardValue>1</CardValue>
              </CardItem>
              <CardItem>
                <CardName>
                  <CardSymbol color="#000">♣</CardSymbol>
                  Quatro
                </CardName>
                <CardValue>1</CardValue>
              </CardItem>
              <CardItem>
                <CardName>
                  <CardSymbol color="red">♥</CardSymbol>
                  Quatro
                </CardName>
                <CardValue>1</CardValue>
              </CardItem>
              <CardItem>
                <CardName>
                  <CardSymbol color="red">♦</CardSymbol>
                  Quatro
                </CardName>
                <CardValue>1</CardValue>
              </CardItem>
            </CardList>
          </CardRankingSection>
          
          <RuleSection>
            <SectionTitle>Regras Básicas</SectionTitle>
            <RuleList>
              <RuleItem>O jogo é disputado em equipes de 1 ou 2 jogadores.</RuleItem>
              <RuleItem>Cada jogador recebe 3 cartas por rodada.</RuleItem>
              <RuleItem>Vence a rodada quem jogar a carta de maior valor.</RuleItem>
              <RuleItem>Vence a mão quem ganhar 2 de 3 rodadas.</RuleItem>
              <RuleItem>Vence o jogo quem atingir 12 pontos primeiro.</RuleItem>
            </RuleList>
          </RuleSection>
          
          <RuleSection>
            <SectionTitle>Manilhas</SectionTitle>
            <RuleList>
              <RuleItem>As manilhas são fixas no Truco Gaúcho.</RuleItem>
              <RuleItem>Ás de Espadas (maior manilha)</RuleItem>
              <RuleItem>Ás de Paus</RuleItem>
              <RuleItem>Sete de Espadas</RuleItem>
              <RuleItem>Sete de Ouros (menor manilha)</RuleItem>
            </RuleList>
          </RuleSection>
          
          <RuleSection>
            <SectionTitle>Valores de Truco</SectionTitle>
            <RuleList>
              <RuleItem>Mão normal: 1 ponto</RuleItem>
              <RuleItem>Truco: 2 pontos</RuleItem>
              <RuleItem>Retruco: 3 pontos</RuleItem>
              <RuleItem>Vale Quatro: 4 pontos</RuleItem>
            </RuleList>
          </RuleSection>
          
          <RuleSection>
            <SectionTitle>Envido</SectionTitle>
            <RuleList>
              <RuleItem>Só pode ser pedido na primeira rodada.</RuleItem>
              <RuleItem>Soma-se os valores das duas maiores cartas do mesmo naipe + 20.</RuleItem>
              <RuleItem>Figuras (Q, J, K) valem 0 para Envido.</RuleItem>
              <RuleItem>Se não tiver duas cartas do mesmo naipe, vale o valor da maior carta.</RuleItem>
            </RuleList>
          </RuleSection>
          
          <RuleSection>
            <SectionTitle>Flor</SectionTitle>
            <RuleList>
              <RuleItem>Quando um jogador tem três cartas do mesmo naipe.</RuleItem>
              <RuleItem>Soma-se os valores das três cartas + 20.</RuleItem>
              <RuleItem>Flor vale 3 pontos.</RuleItem>
              <RuleItem>Contra-Flor vale 6 pontos.</RuleItem>
              <RuleItem>Contra-Flor e o Resto vale os pontos restantes para ganhar.</RuleItem>
            </RuleList>
          </RuleSection>
        </GuideContent>
      </GuideContainer>
    </>
  );
};

export default CardGuide;
