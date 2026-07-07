// Modificando o modelo TrucoGame para incluir o estado de "pronto" dos jogadores
// e implementar a exclusão automática de salas vazias

class Card {
  constructor(value, suit) {
    this.value = value;
    this.suit = suit;
    this.isRed = suit === 'copas' || suit === 'ouros';
    
    // Definir o display da carta
    this.display = `${value}${suit === 'copas' ? '♥' : suit === 'ouros' ? '♦' : suit === 'paus' ? '♣' : '♠'}`;
    
    // Definir o rank da carta para comparação
    this.rank = this.getRank();
    
    // Verificar se é manilha
    this.isManilha = this.checkManilha();
    this.manilhaRank = this.isManilha ? this.getManilhaRank() : 0;
  }
  
  getRank() {
    const valueRanks = {
      '4': 1, '5': 2, '6': 3, '7': 4, 
      '10': 5, '11': 6, '12': 7, '1': 8, 
      '2': 9, '3': 10
    };
    
    return valueRanks[this.value] || 0;
  }
  
  checkManilha() {
    // No Truco Gaúcho, as manilhas são fixas
    return (
      (this.value === '7' && this.suit === 'ouros') ||
      (this.value === '7' && this.suit === 'espadas') ||
      (this.value === '1' && this.suit === 'paus') ||
      (this.value === '1' && this.suit === 'espadas')
    );
  }
  
  getManilhaRank() {
    // Ranking das manilhas (do mais baixo para o mais alto)
    const manilhaRanks = {
      '7ouros': 1,
      '7espadas': 2,
      '1paus': 3,
      '1espadas': 4
    };
    
    return manilhaRanks[`${this.value}${this.suit}`] || 0;
  }
  
  compareWith(otherCard) {
    // Se ambas são manilhas, comparar pelo rank de manilha
    if (this.isManilha && otherCard.isManilha) {
      return this.manilhaRank - otherCard.manilhaRank;
    }
    
    // Se apenas esta carta é manilha, ela é maior
    if (this.isManilha) {
      return 1;
    }
    
    // Se apenas a outra carta é manilha, ela é maior
    if (otherCard.isManilha) {
      return -1;
    }
    
    // Se nenhuma é manilha, comparar pelo rank normal
    return this.rank - otherCard.rank;
  }
  
  getEnvidoValue() {
    // Para Envido, figuras (10, 11, 12) valem 0, as demais valem seu valor nominal
    if (['10', '11', '12'].includes(this.value)) {
      return 0;
    }
    
    return parseInt(this.value);
  }
}

class Deck {
  constructor() {
    this.cards = [];
    this.initializeDeck();
    this.shuffle();
  }
  
  initializeDeck() {
    this.cards = []; // Inicializar o array de cartas
    const values = ['1', '2', '3', '4', '5', '6', '7', '10', '11', '12'];
    const suits = ['copas', 'ouros', 'paus', 'espadas'];
    
    for (const suit of suits) {
      for (const value of values) {
        this.cards.push(new Card(value, suit));
      }
    }
  }
  
  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }
  
  deal(numPlayers, numCards) {
    const hands = [];
    
    for (let i = 0; i < numPlayers; i++) {
      const hand = [];
      for (let j = 0; j < numCards; j++) {
        if (this.cards.length > 0) {
          hand.push(this.cards.pop());
        }
      }
      hands.push(hand);
    }
    
    return hands;
  }
}

class Player {
  constructor(id, name, team) {
    this.id = id;
    this.name = name;
    this.team = team;
    this.hand = [];
    this.playedCard = null;
    this.isCurrentPlayer = false;
    this.isReady = false; // Novo campo para indicar se o jogador está pronto
  }
  
  calculateEnvido() {
    // Agrupar cartas por naipe
    const cardsBySuit = {};
    
    for (const card of this.hand) {
      if (!cardsBySuit[card.suit]) {
        cardsBySuit[card.suit] = [];
      }
      cardsBySuit[card.suit].push(card);
    }
    
    let maxEnvido = 0;
    
    // Verificar cada naipe
    for (const suit in cardsBySuit) {
      const cards = cardsBySuit[suit];
      
      if (cards.length >= 2) {
        // Ordenar cartas pelo valor de Envido (decrescente)
        cards.sort((a, b) => b.getEnvidoValue() - a.getEnvidoValue());
        
        // Calcular Envido (soma dos dois maiores valores + 20)
        const envido = cards[0].getEnvidoValue() + cards[1].getEnvidoValue() + 20;
        maxEnvido = Math.max(maxEnvido, envido);
      }
    }
    
    // Se não tiver pelo menos 2 cartas do mesmo naipe, usar o maior valor
    if (maxEnvido === 0) {
      const maxCard = this.hand.reduce((max, card) => 
        card.getEnvidoValue() > max.getEnvidoValue() ? card : max, this.hand[0]);
      maxEnvido = maxCard.getEnvidoValue();
    }
    
    return maxEnvido;
  }
  
  hasFlor() {
    // Verificar se tem 3 cartas do mesmo naipe
    const cardsBySuit = {};
    
    for (const card of this.hand) {
      if (!cardsBySuit[card.suit]) {
        cardsBySuit[card.suit] = [];
      }
      cardsBySuit[card.suit].push(card);
    }
    
    for (const suit in cardsBySuit) {
      if (cardsBySuit[suit].length === 3) {
        return true;
      }
    }
    
    return false;
  }
  
  calculateFlor() {
    // Agrupar cartas por naipe
    const cardsBySuit = {};
    
    for (const card of this.hand) {
      if (!cardsBySuit[card.suit]) {
        cardsBySuit[card.suit] = [];
      }
      cardsBySuit[card.suit].push(card);
    }
    
    // Verificar cada naipe
    for (const suit in cardsBySuit) {
      const cards = cardsBySuit[suit];
      
      if (cards.length === 3) {
        // Calcular Flor (soma dos três valores + 20)
        return cards.reduce((sum, card) => sum + card.getEnvidoValue(), 20);
      }
    }
    
    return 0;
  }
}

class Team {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.players = [];
    this.score = 0;
    this.roundsWon = 0;
  }
  
  addPlayer(player) {
    this.players.push(player);
  }
  
  addPoints(points) {
    this.score += points;
  }
  
  addRoundWin() {
    this.roundsWon += 1;
  }
  
  resetRoundWins() {
    this.roundsWon = 0;
  }
}

class TrucoGame {
  constructor(roomId, maxPlayers) {
    this.roomId = roomId;
    this.maxPlayers = maxPlayers;
    this.players = [];
    this.teams = [new Team(1, 'Time 1'), new Team(2, 'Time 2')];
    this.gameStatus = 'waiting';
    this.status = 'waiting';
    this.currentTurn = 0;
    this.playedCards = [];
    this.deck = new Deck();
    this.trucoState = null;
    this.retrucoState = null;
    this.vale4State = null;
    this.envidoState = null;
    this.florState = null;
    this.roundWinner = null;
    this.gameWinner = null;
    this.targetScore = 12; // Pontuação alvo para vencer o jogo
    this.handValue = 1; // Valor inicial da mão
    this.currentRound = 1; // Rodada atual
    this.roundStarter = null; // Jogador que iniciou a rodada
    this.roundTies = null;
    this.roundWinners = null;
  }

  addPlayer(playerId, playerName) {
    if (this.players.length >= this.maxPlayers) {
      return { success: false, message: 'Sala cheia' };
    }

    // Alternar entre os times
    const teamIndex = this.players.length % 2;
    const player = new Player(playerId, playerName, teamIndex + 1);
    
    this.players.push(player);
    this.teams[teamIndex].addPlayer(player);

    return { success: true, player };
  }

  setPlayerReady(playerId) {
    console.log('\n=== JOGADOR MARCOU COMO PRONTO ===');
    console.log(`Jogador ${playerId} marcou como pronto`);
    
    const player = this.players.find(p => p.id === playerId);
    if (!player) {
      console.log('ERRO: Jogador não encontrado');
      return { error: 'Jogador não encontrado' };
    }

    console.log(`Estado anterior do jogador ${player.name}:`);
    console.log(`- isReady = ${player.isReady}`);

    // Se o jogador já está pronto, não faz nada
    if (player.isReady) {
      console.log('Jogador já está pronto, retornando estado atual');
      return { success: true, gameState: this.getGameState() };
    }

    // Marca o jogador como pronto
    player.isReady = true;
    console.log(`Jogador ${player.name} marcado como pronto`);

    // Verifica se todos os jogadores estão prontos e se há pelo menos 2 jogadores
    const allPlayersReady = this.players.every(p => p.isReady);
    const hasEnoughPlayers = this.players.length >= 2;

    console.log('\nVerificação de início do jogo:');
    console.log(`- Todos prontos: ${allPlayersReady}`);
    console.log(`- Jogadores suficientes: ${hasEnoughPlayers}`);
    console.log(`- Total de jogadores: ${this.players.length}`);

    // Só inicia o jogo se todos os jogadores estiverem prontos e houver jogadores suficientes
    if (allPlayersReady && hasEnoughPlayers) {
      console.log('Iniciando o jogo...');
      this.gameStatus = 'playing';
      this.status = 'playing';
      this.startGame();
    } else {
      // Se não iniciou o jogo, mantém o estado como waiting
      this.gameStatus = 'waiting';
      this.status = 'waiting';
    }

    // Retorna o estado atualizado do jogo
    const gameState = this.getGameState();
    console.log('=== FIM DO PROCESSO DE PRONTO ===\n');
    
    return { success: true, gameState };
  }

  startGame() {
    console.log('Iniciando o jogo');
    console.log('Status atual:', this.gameStatus);
    console.log('Número de jogadores:', this.players.length);
    
    // Atualizar o status do jogo
    this.gameStatus = 'playing';
    this.status = 'playing';
    console.log('Status atualizado para:', this.gameStatus);
    
    // Inicializar variáveis do jogo
    this.currentRound = 1;
    this.handValue = 1;
    this.playedCards = [];
    this.trucoState = null;
    this.envidoState = null;
    this.florState = null;
    
    // Distribuir cartas para os jogadores
    console.log('Distribuindo cartas...');
    this.dealCards();
    
    // Definir o primeiro jogador da primeira rodada
    this.currentTurn = 0;
    this.players[0].isCurrentPlayer = true;
    
    // Atualizar o estado do jogo
    const gameState = this.getGameState();
    console.log('Jogo iniciado com sucesso. Estado final:', {
      status: gameState.status,
      gameStatus: gameState.gameStatus,
      currentRound: gameState.currentRound,
      players: gameState.players.map(p => ({
        name: p.name,
        handSize: p.hand.length,
        isCurrentPlayer: p.isCurrentPlayer
      }))
    });
    
    return { success: true, gameState };
  }

  dealCards() {
    console.log('Iniciando distribuição de cartas');
    
    // Criar e embaralhar o baralho
    this.deck = new Deck();
    console.log('Baralho criado com', this.deck.cards.length, 'cartas');
    
    // Distribuir 3 cartas para cada jogador
    const hands = this.deck.deal(this.players.length, 3);
    console.log('Mãos distribuídas:', hands.map(hand => hand.map(card => card.display)));
    
    // Atribuir as cartas aos jogadores
    this.players.forEach((player, index) => {
      console.log('Distribuindo cartas para o jogador:', player.name);
      player.hand = hands[index];
      console.log('Mão final do jogador', player.name, ':', player.hand.map(card => ({
        value: card.value,
        suit: card.suit,
        display: card.display,
        isManilha: card.isManilha
      })));
    });
    
    // Resetar o estado dos jogadores
    this.players.forEach(p => {
      p.isCurrentPlayer = false;
    });
    
    console.log('Distribuição de cartas concluída');
    
    // Atualizar o estado do jogo
    this.updateGameState();
  }

  playCard(playerId, card) {
    if (this.status !== 'playing') {
      return { success: false, message: 'O jogo não está em andamento' };
    }

    const player = this.players.find(p => p.id === playerId);
    if (!player) {
      return { success: false, message: 'Jogador não encontrado' };
    }

    // Verificar se o jogador está aguardando resposta de Truco, Retruco ou Vale 4
    if (this.trucoState && this.trucoState.requestedBy === playerId && !this.trucoState.accepted) {
      return { success: false, message: 'Aguarde a resposta do Truco' };
    }
    if (this.retrucoState && this.retrucoState.requestedBy === playerId && !this.retrucoState.accepted) {
      return { success: false, message: 'Aguarde a resposta do Retruco' };
    }
    if (this.vale4State && this.vale4State.requestedBy === playerId && !this.vale4State.accepted) {
      return { success: false, message: 'Aguarde a resposta do Vale 4' };
    }

    if (this.currentTurn !== this.players.indexOf(player)) {
      return { success: false, message: 'Não é sua vez de jogar' };
    }

    // Verificar se a carta pertence ao jogador
    const playerCard = player.hand.find(c => c.suit === card.suit && c.value === card.value);
    if (!playerCard) {
      return { success: false, message: 'Carta inválida' };
    }

    // Remover a carta da mão do jogador
    player.hand = player.hand.filter(c => c.suit !== card.suit || c.value !== card.value);

    // Adicionar a carta jogada
    this.playedCards.push({
      playerId,
      card: playerCard, // Usar o objeto card completo da mão do jogador
      team: player.team
    });

    // Determinar o próximo jogador
    const currentPlayerIndex = this.players.findIndex(p => p.id === playerId);
    const nextPlayerIndex = (currentPlayerIndex + 1) % this.players.length;
    this.currentTurn = nextPlayerIndex;

    // Atualizar o isCurrentPlayer dos jogadores
      this.players.forEach((p, i) => {
        p.isCurrentPlayer = (i === this.currentTurn);
      });

    // Se todas as cartas foram jogadas, determinar o vencedor da rodada
    if (this.playedCards.length === this.players.length) {
      this.determineRoundWinner();
    }

    return { 
      success: true,
      gameState: this.getGameState()
    };
  }

  determineRoundWinner() {
    console.log('\n=== DETERMINANDO VENCEDOR DA RODADA ===');
    console.log('Cartas jogadas:', this.playedCards.map(pc => ({
      playerId: pc.playerId,
      card: pc.card.display
    })));
    
    let winningCard = this.playedCards[0];
    let isTie = false;
    
    for (let i = 1; i < this.playedCards.length; i++) {
      const currentCard = this.playedCards[i];
      console.log(`Comparando cartas: ${winningCard.card.display} vs ${currentCard.card.display}`);
      const comparison = currentCard.card.compareWith(winningCard.card);
      console.log('Resultado da comparação:', comparison);
      
      if (comparison > 0) {
        console.log(`${currentCard.card.display} vence ${winningCard.card.display}`);
        winningCard = currentCard;
        isTie = false;
      } else if (comparison === 0) {
        console.log(`${currentCard.card.display} empata com ${winningCard.card.display}`);
        isTie = true;
      } else {
        console.log(`${winningCard.card.display} mantém a liderança sobre ${currentCard.card.display}`);
      }
    }

    const winningPlayer = this.players.find(p => p.id === winningCard.playerId);
    console.log('Jogador vencedor:', winningPlayer.name);
    console.log('Time vencedor:', winningPlayer.team);
    
    // Se houver empate, aplicar as regras de desempate
    if (isTie) {
      console.log('Empate detectado, aplicando regras de desempate');
      
      // Armazenar o empate na rodada atual
      this.roundTies = this.roundTies || [];
      this.roundTies.push(this.currentRound);
      
      // Verificar se já temos um vencedor da mão baseado nas regras de desempate
      const handWinner = this.determineHandWinnerFromTies();
      
      if (handWinner) {
        console.log(`Vencedor da mão determinado por regras de desempate: Time ${handWinner.id}`);
        this.endHand(handWinner);
        return this.getGameState();
      }
      
      // Se ainda não temos um vencedor, continuar para a próxima rodada
      console.log('Continuando para a próxima rodada após empate');
      
      // Enviar estado atual com as cartas ainda na mesa
      const currentState = this.getGameState();
      
      // Aguardar 3 segundos antes de limpar a mesa
      setTimeout(() => {
        // Preparar para a próxima rodada
        this.playedCards = [];
        this.players.forEach(p => p.playedCard = null);
        
        // Em caso de empate, o jogador que iniciou a rodada começa a próxima
        const starterPlayer = this.players.find(p => p.id === this.roundStarter);
        if (starterPlayer) {
          this.currentTurn = this.players.indexOf(starterPlayer);
          this.players.forEach((p, i) => {
            p.isCurrentPlayer = (i === this.currentTurn);
          });
        }
        
        // Enviar o estado atualizado após limpar a mesa
        const updatedState = this.getGameState();
        return updatedState;
      }, 3000);
      
      return currentState;
    }
    
    // Se não houver empate, atualizar o vencedor da rodada
    this.roundWinner = winningPlayer.team;
    const winningTeam = this.teams[winningPlayer.team - 1];
    winningTeam.addRoundWin();
    
    // Armazenar o vencedor da rodada
    this.roundWinners = this.roundWinners || [];
    this.roundWinners.push(winningTeam);
    
    console.log('Estado dos times após a vitória:');
    this.teams.forEach(team => {
      console.log(`Time ${team.id}: ${team.roundsWon} rodadas vencidas`);
    });

    // Verificar se o jogo terminou
    if (winningTeam.roundsWon >= 2) {
      console.log('Time vencedor atingiu 2 rodadas, finalizando a mão');
      this.endHand(winningTeam);
    } else {
      console.log('Preparando para a próxima rodada');
      // Enviar estado atual com as cartas ainda na mesa
      const currentState = this.getGameState();
      
      // Aguardar 3 segundos antes de limpar a mesa
      setTimeout(() => {
      // Preparar para a próxima rodada
      this.playedCards = [];
      this.players.forEach(p => p.playedCard = null);
        
        // O vencedor começa a próxima rodada
        const winningPlayerIndex = this.players.findIndex(p => p.id === winningPlayer.id);
        this.currentTurn = winningPlayerIndex;
        this.roundStarter = winningPlayer.id;
        
      this.players.forEach((p, i) => {
        p.isCurrentPlayer = (i === this.currentTurn);
      });
        
        // Enviar o estado atualizado após limpar a mesa
        const updatedState = this.getGameState();
        return updatedState;
      }, 3000);
    }
    
    // Retornar o estado atual com as cartas ainda na mesa
    const gameState = this.getGameState();
    console.log('Estado do jogo após determinar vencedor:', {
      teams: gameState.teams.map(team => ({
        id: team.id,
        score: team.score,
        roundsWon: team.roundsWon
      }))
    });
    
    console.log('=== FIM DA DETERMINAÇÃO DO VENCEDOR ===\n');
    
    return gameState;
  }

  requestTruco(playerId) {
    console.log(`[Truco] Jogador ${playerId} solicitando Truco`);
    
    if (this.gameStatus !== 'playing') {
      console.log('[Truco] Erro: Jogo não está em andamento');
      return { success: false, message: 'Jogo não está em andamento' };
    }

    const player = this.players.find(p => p.id === playerId);
    if (!player) {
      console.log('[Truco] Erro: Jogador não encontrado');
      return { success: false, message: 'Jogador não encontrado' };
    }

    if (this.trucoState || this.retrucoState || this.vale4State) {
      console.log('[Truco] Erro: já existe uma aposta de Truco/Retruco/Vale 4 em andamento');
      return { success: false, message: 'Já existe uma aposta em andamento' };
    }

    const respondingTeamId = player.team === 1 ? 2 : 1;
    console.log(`[Truco] Time respondente: ${respondingTeamId}`);

    this.trucoState = {
      level: 'truco',
      value: 2,
      team: player.team,
      requestedBy: playerId,
      respondingTeam: respondingTeamId,
      accepted: false
    };

    return {
      success: true,
      trucoState: this.trucoState
    };
  }

  respondToTruco(playerId, accept) {
    console.log(`[Truco] Jogador ${playerId} respondendo ao Truco: ${accept ? 'Aceito' : 'Recusado'}`);
    
    if (this.gameStatus !== 'playing') {
      console.log('[Truco] Erro: Jogo não está em andamento');
      return { success: false, message: 'Jogo não está em andamento' };
    }

    if (!this.trucoState || this.trucoState.requestedBy === playerId) {
      console.log('[Truco] Erro: Não há pedido de Truco para responder');
      return { success: false, message: 'Não há pedido de Truco para responder' };
    }

    const player = this.players.find(p => p.id === playerId);
    if (!player) {
      console.log('[Truco] Erro: Jogador não encontrado');
      return { success: false, message: 'Jogador não encontrado' };
    }

    if (player.team !== this.trucoState.respondingTeam) {
      console.log('[Truco] Erro: Não é a vez do seu time responder');
      return { success: false, message: 'Não é a vez do seu time responder' };
    }

    if (accept) {
      console.log('[Truco] Truco aceito, atualizando valor da mão');
      this.trucoState.accepted = true;
      this.handValue = 2;
      
      // Manter a vez do jogador que pediu o Truco
      const requestingPlayerIndex = this.players.findIndex(p => p.id === this.trucoState.requestedBy);
      this.currentTurn = requestingPlayerIndex;
      this.players.forEach((p, i) => {
        p.isCurrentPlayer = (i === requestingPlayerIndex);
      });
      
      return { 
        success: true, 
        accepted: true,
        handValue: this.handValue,
        trucoState: this.trucoState,
        currentPlayer: this.trucoState.requestedBy
      };
    } else {
      console.log('[Truco] Truco recusado, adicionando ponto para o time solicitante');
      const requestingTeam = this.teams.find(t => t.players.some(p => p.id === this.trucoState.requestedBy));
      requestingTeam.addPoints(1);
      
      this.trucoState = null;
      
      return { 
        success: true, 
        accepted: false
      };
    }
  }

  // Valor da "Falta" (pontos que faltam para o time líder atingir a pontuação alvo)
  getFaltaValue() {
    const leadingScore = Math.max(this.teams[0].score, this.teams[1].score);
    return Math.max(this.targetScore - leadingScore, 1);
  }

  // Soma do maior Envido de cada time (todos os jogadores participam do cálculo)
  getEnvidoTotals() {
    return {
      team1Envido: this.players.filter(p => p.team === 1).reduce((max, p) => Math.max(max, p.calculateEnvido()), 0),
      team2Envido: this.players.filter(p => p.team === 2).reduce((max, p) => Math.max(max, p.calculateEnvido()), 0)
    };
  }

  // Verifica se um pedido "do zero" (Envido/Real Envido/Falta Envido) pode ser feito agora:
  // só na primeira rodada, antes do jogador jogar sua carta, sem Flor em disputa, e (em
  // partidas de 4 jogadores) apenas pelos dois últimos jogadores da rodada.
  canOpenEnvidoFamily(player) {
    if (this.florState) {
      return { ok: false, message: 'A Flor anula o Envido nesta mão' };
    }
    if (this.envidoState) {
      return { ok: false, message: 'Já houve disputa de Envido nesta mão' };
    }
    if (this.currentRound !== 1) {
      return { ok: false, message: 'Envido só pode ser pedido na primeira rodada' };
    }
    if (!player.isCurrentPlayer) {
      return { ok: false, message: 'Não é a vez do jogador' };
    }
    if (this.players.length === 4 && this.playedCards.length < 2) {
      return { ok: false, message: 'Em partidas de 4 jogadores, só os dois últimos da rodada podem pedir Envido' };
    }
    return { ok: true };
  }

  requestEnvido(playerId) {
    if (this.gameStatus !== 'playing') {
      return { success: false, message: 'Jogo não está em andamento' };
    }

    const player = this.players.find(p => p.id === playerId);
    if (!player) {
      return { success: false, message: 'Jogador não encontrado' };
    }

    const check = this.canOpenEnvidoFamily(player);
    if (!check.ok) {
      return { success: false, message: check.message };
    }

    this.envidoState = {
      level: 'envido',
      value: 2,
      declineValue: 1,
      team: player.team,
      firstCallerTeam: player.team,
      requestedBy: playerId,
      accepted: false,
      resolved: false,
      waitingResponse: true,
      respondingTeam: player.team === 1 ? 2 : 1
    };
    return { success: true, envidoState: this.envidoState };
  }

  requestRealEnvido(playerId) {
    if (this.gameStatus !== 'playing') {
      return { success: false, message: 'Jogo não está em andamento' };
    }

    const player = this.players.find(p => p.id === playerId);
    if (!player) {
      return { success: false, message: 'Jogador não encontrado' };
    }

    // Pedido em resposta a um Envido pendente (sobe a aposta)
    if (this.envidoState && this.envidoState.waitingResponse) {
      if (this.envidoState.level !== 'envido') {
        return { success: false, message: 'Real Envido só pode ser pedido em resposta ao Envido' };
      }
      if (player.team !== this.envidoState.respondingTeam) {
        return { success: false, message: 'Não é a vez do seu time responder' };
      }

      this.envidoState = {
        ...this.envidoState,
        level: 'realEnvido',
        value: 5,
        declineValue: this.envidoState.value, // fugir agora custa o valor do Envido já pendente
        team: player.team,
        requestedBy: playerId,
        accepted: false,
        resolved: false,
        waitingResponse: true,
        respondingTeam: this.envidoState.team
      };
      return { success: true, envidoState: this.envidoState };
    }

    // Pedido "do zero" (sem Envido pendente)
    const check = this.canOpenEnvidoFamily(player);
    if (!check.ok) {
      return { success: false, message: check.message };
    }

    this.envidoState = {
      level: 'realEnvido',
      value: 5,
      declineValue: 1,
      team: player.team,
      firstCallerTeam: player.team,
      requestedBy: playerId,
      accepted: false,
      resolved: false,
      waitingResponse: true,
      respondingTeam: player.team === 1 ? 2 : 1
    };
    return { success: true, envidoState: this.envidoState };
  }

  requestFaltaEnvido(playerId) {
    if (this.gameStatus !== 'playing') {
      return { success: false, message: 'Jogo não está em andamento' };
    }

    const player = this.players.find(p => p.id === playerId);
    if (!player) {
      return { success: false, message: 'Jogador não encontrado' };
    }

    const faltaValue = this.getFaltaValue();

    // Pedido em resposta a um Envido ou Real Envido pendente (sobe a aposta ao máximo)
    if (this.envidoState && this.envidoState.waitingResponse) {
      if (this.envidoState.level === 'faltaEnvido') {
        return { success: false, message: 'Já foi pedido Falta Envido' };
      }
      if (player.team !== this.envidoState.respondingTeam) {
        return { success: false, message: 'Não é a vez do seu time responder' };
      }

      this.envidoState = {
        ...this.envidoState,
        level: 'faltaEnvido',
        value: faltaValue,
        declineValue: this.envidoState.value, // fugir custa o valor do nível anterior (Envido=2 ou Real Envido=5)
        team: player.team,
        requestedBy: playerId,
        accepted: false,
        resolved: false,
        waitingResponse: true,
        respondingTeam: this.envidoState.team
      };
      return { success: true, envidoState: this.envidoState };
    }

    // Pedido "do zero" (sem Envido pendente)
    const check = this.canOpenEnvidoFamily(player);
    if (!check.ok) {
      return { success: false, message: check.message };
    }

    this.envidoState = {
      level: 'faltaEnvido',
      value: faltaValue,
      declineValue: 1,
      team: player.team,
      firstCallerTeam: player.team,
      requestedBy: playerId,
      accepted: false,
      resolved: false,
      waitingResponse: true,
      respondingTeam: player.team === 1 ? 2 : 1
    };
    return { success: true, envidoState: this.envidoState };
  }

  respondToEnvido(playerId, accept) {
    if (!this.envidoState || !this.envidoState.waitingResponse) {
      return { success: false, message: 'Não há pedido de Envido pendente' };
    }

    const player = this.players.find(p => p.id === playerId);
    if (!player || player.team !== this.envidoState.respondingTeam) {
      return { success: false, message: 'Jogador não autorizado a responder' };
    }

    this.envidoState.waitingResponse = false;
    this.envidoState.accepted = accept;
    this.envidoState.resolved = true;

    const { team1Envido, team2Envido } = this.getEnvidoTotals();
    let winningTeam = null;
    let pointsAwarded = 0;

    if (accept) {
      if (team1Envido > team2Envido) {
        winningTeam = 1;
      } else if (team2Envido > team1Envido) {
        winningTeam = 2;
      } else {
        // Em caso de empate, vence quem cantou primeiro
        winningTeam = this.envidoState.firstCallerTeam;
      }
      pointsAwarded = this.envidoState.value;
      this.teams[winningTeam - 1].addPoints(pointsAwarded);
    } else {
      // Fugir: o time do último pedido (o que está sendo recusado) fica com os pontos de fuga
      winningTeam = this.envidoState.team;
      pointsAwarded = this.envidoState.declineValue;
      this.teams[winningTeam - 1].addPoints(pointsAwarded);
    }

    return {
      success: true,
      accepted: accept,
      team1Envido,
      team2Envido,
      winningTeam,
      pointsAwarded
    };
  }

  // Maior Flor de cada time (apenas jogadores que efetivamente têm Flor entram na conta)
  getFlorTotals() {
    return {
      team1Flor: this.players.filter(p => p.team === 1 && p.hasFlor()).reduce((max, p) => Math.max(max, p.calculateFlor()), 0),
      team2Flor: this.players.filter(p => p.team === 2 && p.hasFlor()).reduce((max, p) => Math.max(max, p.calculateFlor()), 0)
    };
  }

  declareFlor(playerId) {
    if (this.gameStatus !== 'playing') {
      return { success: false, message: 'Jogo não está em andamento' };
    }

    const player = this.players.find(p => p.id === playerId);
    if (!player) {
      return { success: false, message: 'Jogador não encontrado' };
    }

    if (!player.hasFlor()) {
      return { success: false, message: 'Jogador não tem Flor' };
    }

    if (this.florState) {
      return { success: false, message: 'Já houve disputa de Flor nesta mão' };
    }

    if (this.envidoState && this.envidoState.resolved) {
      return { success: false, message: 'O Envido desta mão já foi resolvido' };
    }

    if (this.currentRound !== 1) {
      return { success: false, message: 'Flor só pode ser declarada na primeira rodada' };
    }

    if (!player.isCurrentPlayer) {
      return { success: false, message: 'Não é a vez do jogador' };
    }

    if (this.players.length === 4 && this.playedCards.length < 2) {
      return { success: false, message: 'Em partidas de 4 jogadores, só os dois últimos da rodada podem declarar Flor' };
    }

    // A Flor anula qualquer disputa de Envido/Real Envido/Falta Envido ainda pendente
    this.envidoState = null;

    const opponentsWithFlor = this.players.filter(p => p.team !== player.team && p.hasFlor());

    if (opponentsWithFlor.length === 0) {
      // Ninguém mais tem Flor: resolve sozinho e ganha 3 pontos automaticamente
      this.florState = {
        level: 'flor',
        value: 3,
        team: player.team,
        firstCallerTeam: player.team,
        declaredBy: playerId,
        waitingResponse: false,
        resolved: true,
        accepted: true
      };
      this.teams[player.team - 1].addPoints(3);
      return { success: true, florState: this.florState, autoResolved: true };
    }

    this.florState = {
      level: 'flor',
      value: 3,
      declineValue: 4,
      team: player.team,
      firstCallerTeam: player.team,
      declaredBy: playerId,
      waitingResponse: true,
      resolved: false,
      respondingTeam: player.team === 1 ? 2 : 1
    };
    return { success: true, florState: this.florState, autoResolved: false };
  }

  requestContraFlor(playerId) {
    if (this.gameStatus !== 'playing') {
      return { success: false, message: 'Jogo não está em andamento' };
    }

    if (!this.florState || !this.florState.waitingResponse) {
      return { success: false, message: 'Não há Flor pendente para contestar' };
    }

    if (this.florState.level !== 'flor') {
      return { success: false, message: 'Contra-Flor só pode ser pedida em resposta a uma Flor' };
    }

    const player = this.players.find(p => p.id === playerId);
    if (!player) {
      return { success: false, message: 'Jogador não encontrado' };
    }

    if (player.team !== this.florState.respondingTeam) {
      return { success: false, message: 'Não é a vez do seu time responder' };
    }

    if (!player.hasFlor()) {
      return { success: false, message: 'Você precisa ter Flor para pedir Contra-Flor' };
    }

    this.florState = {
      ...this.florState,
      level: 'contraFlor',
      value: 6,
      declineValue: 4,
      team: player.team,
      requestedBy: playerId,
      waitingResponse: true,
      resolved: false,
      respondingTeam: this.florState.team
    };

    return { success: true, florState: this.florState };
  }

  requestContraFlorResto(playerId) {
    if (this.gameStatus !== 'playing') {
      return { success: false, message: 'Jogo não está em andamento' };
    }

    if (!this.florState || !this.florState.waitingResponse) {
      return { success: false, message: 'Não há Flor pendente para contestar' };
    }

    if (this.florState.level === 'contraFlorResto') {
      return { success: false, message: 'Já foi pedido Contra-Flor e o Resto' };
    }

    const player = this.players.find(p => p.id === playerId);
    if (!player) {
      return { success: false, message: 'Jogador não encontrado' };
    }

    if (player.team !== this.florState.respondingTeam) {
      return { success: false, message: 'Não é a vez do seu time responder' };
    }

    if (!player.hasFlor()) {
      return { success: false, message: 'Você precisa ter Flor para pedir Contra-Flor e o Resto' };
    }

    // Se veio direto da Flor, a fuga mantém o valor 4; se veio de cima do Contra-Flor, sobe para 6
    const declineValue = this.florState.level === 'flor' ? 4 : this.florState.value;

    this.florState = {
      ...this.florState,
      level: 'contraFlorResto',
      // Vale a "Falta" além dos pontos da Contra-Flor (6)
      value: this.getFaltaValue() + 6,
      declineValue,
      team: player.team,
      requestedBy: playerId,
      waitingResponse: true,
      resolved: false,
      respondingTeam: this.florState.team
    };

    return { success: true, florState: this.florState };
  }

  respondToFlor(playerId, accept) {
    if (!this.florState || !this.florState.waitingResponse) {
      return { success: false, message: 'Não há disputa de Flor pendente para responder' };
    }

    const player = this.players.find(p => p.id === playerId);
    if (!player || player.team !== this.florState.respondingTeam) {
      return { success: false, message: 'Jogador não autorizado a responder' };
    }

    if (accept && this.florState.level === 'flor') {
      return { success: false, message: 'Não é possível aceitar diretamente: peça Contra-Flor, Contra-Flor e o Resto, ou fuja' };
    }

    this.florState.waitingResponse = false;
    this.florState.accepted = accept;
    this.florState.resolved = true;

    const { team1Flor, team2Flor } = this.getFlorTotals();
    let winningTeam = null;
    let pointsAwarded = 0;

    if (accept) {
      if (team1Flor > team2Flor) {
        winningTeam = 1;
      } else if (team2Flor > team1Flor) {
        winningTeam = 2;
      } else {
        winningTeam = this.florState.firstCallerTeam;
      }
      pointsAwarded = this.florState.value;
      this.teams[winningTeam - 1].addPoints(pointsAwarded);
    } else {
      winningTeam = this.florState.team;
      pointsAwarded = this.florState.declineValue;
      this.teams[winningTeam - 1].addPoints(pointsAwarded);
    }

    return {
      success: true,
      accepted: accept,
      team1Flor,
      team2Flor,
      winningTeam,
      pointsAwarded
    };
  }

  removePlayer(playerId) {
    const playerIndex = this.players.findIndex(p => p.id === playerId);
    
    if (playerIndex === -1) {
      return { success: false, message: 'Jogador não encontrado' };
    }
    
    const player = this.players[playerIndex];
    const wasCurrentTurn = playerIndex === this.currentTurn;

    // Remover o jogador da lista de jogadores
    this.players.splice(playerIndex, 1);
    
    // Remover o jogador do time
    const teamIndex = player.team - 1;
    const playerTeamIndex = this.teams[teamIndex].players.findIndex(p => p.id === playerId);
    
    if (playerTeamIndex !== -1) {
      this.teams[teamIndex].players.splice(playerTeamIndex, 1);
    }

    // Remover qualquer carta que o jogador removido já tenha jogado nesta rodada,
    // para não travar/derrubar a determinação do vencedor da rodada
    this.playedCards = this.playedCards.filter(pc => pc.playerId !== playerId);

    // Se não houver mais jogadores, resetar o jogo
    if (this.players.length === 0) {
      this.resetGame();
      return { success: true, roomEmpty: true };
    }

    // Se o jogo estava em andamento, ajustar o turno e potencialmente finalizar
    if (this.gameStatus === 'playing') {
      if (playerIndex < this.currentTurn) {
        this.currentTurn--;
      } else if (wasCurrentTurn) {
        if (this.currentTurn >= this.players.length) {
          this.currentTurn = 0;
        }
      }

      // Recalcular as flags isCurrentPlayer para refletir o novo índice do turno
      this.players.forEach((p, i) => {
        p.isCurrentPlayer = (i === this.currentTurn);
      });

      // Se não houver jogadores suficientes, o jogo é interrompido
      if (this.players.length < 2) {
        this.gameStatus = 'waiting';
      } else if (this.playedCards.length > 0 && this.playedCards.length === this.players.length) {
        // A saída do jogador completou a rodada (todos os restantes já haviam jogado)
        this.determineRoundWinner();
      }
    }

    // Atualizar o estado do jogo após remover o jogador
    this.updateGameState();

    return { success: true, roomEmpty: false };
  }

  // Remapeia o id de um jogador (usado quando um socket reconecta com um novo id)
  reassignPlayerId(oldId, newId) {
    const player = this.players.find(p => p.id === oldId);
    if (!player) {
      return { success: false, message: 'Jogador não encontrado' };
    }

    player.id = newId;

    this.playedCards.forEach(pc => {
      if (pc.playerId === oldId) pc.playerId = newId;
    });

    [this.trucoState, this.retrucoState, this.vale4State, this.envidoState].forEach(state => {
      if (state && state.requestedBy === oldId) state.requestedBy = newId;
    });

    if (this.florState) {
      if (this.florState.declaredBy === oldId) this.florState.declaredBy = newId;
      if (this.florState.contraDeclaredBy === oldId) this.florState.contraDeclaredBy = newId;
    }

    if (this.roundStarter === oldId) this.roundStarter = newId;

    return { success: true };
  }
  
  resetGame() {
    this.deck = new Deck();
    this.gameStatus = 'waiting';
    this.currentTurn = 0;
    this.playedCards = [];
    this.trucoState = null;
    this.envidoState = null;
    this.florState = null;
    this.roundWinner = null;
    this.gameWinner = null;
    
    // Resetar os times
    this.teams.forEach(team => {
      team.score = 0;
      team.resetRoundWins();
    });
  }
  
  endHand(winningTeam) {
    console.log('\n=== FINALIZANDO MÃO ===');
    
    if (winningTeam) {
      console.log('Time vencedor:', winningTeam.id);
      console.log('Valor da mão:', this.handValue);
      
      winningTeam.addPoints(this.handValue);
      console.log('Pontuação após adicionar pontos:', winningTeam.score);
    
      if (winningTeam.score >= this.targetScore) {
        console.log('Time atingiu a pontuação alvo, finalizando o jogo');
        this.gameWinner = winningTeam;
        this.gameStatus = 'finished';
        this.status = 'finished';
      }
    } else {
      console.log('Empate na mão - nenhum time recebe pontos');
    }
    
    if (this.gameStatus === 'finished') {
      return this.getGameState();
    }

    console.log('Preparando para a próxima mão');
    
    setTimeout(() => {
      if (this.gameStatus === 'finished') return;

      this.currentRound = 1;
      this.handValue = 1;
      this.trucoState = null;
      this.envidoState = null;
      this.florState = null;
      this.playedCards = [];
      
      this.teams.forEach(team => team.resetRoundWins());
      
      this.roundTies = [];
      this.roundWinners = [];
      
      this.dealCards();
      
      this.currentTurn = (this.currentTurn + 1) % this.players.length;
      
      this.players.forEach((p, i) => {
        p.isCurrentPlayer = (i === this.currentTurn);
      });
      
      this.updateGameState();
    }, 3000);
    
    return this.getGameState();
  }
  
  // Método para obter o estado do jogo para enviar ao cliente
  // viewerId: se informado, a mão dos demais jogadores é ocultada (evita vazamento de cartas)
  getGameState(viewerId) {
    console.log('\n=== GERANDO ESTADO DO JOGO ===');
    console.log('Estado atual dos jogadores no servidor:');
    this.players.forEach(player => {
      console.log(`- ${player.name} (${player.id}): isReady = ${player.isReady}`);
    });

    // Garante que status e gameStatus estejam sincronizados
    if (this.gameStatus === 'playing' && this.status !== 'playing') {
      console.log('Sincronizando status com gameStatus: playing');
      this.status = 'playing';
    }

    // Se houver Retruco ativo, garantir que trucoState seja null
    if (this.retrucoState) {
      this.trucoState = null;
    }

    const gameState = {
      roomId: this.roomId,
      status: this.status || this.gameStatus,
      gameStatus: this.gameStatus,
      currentRound: this.currentRound,
      handValue: this.handValue,
      teams: this.teams.map(team => ({
        id: team.id,
        name: team.name,
        score: team.score,
        roundsWon: team.roundsWon
      })),
      currentPlayer: this.players[this.currentTurn]?.id,
      players: this.players.map(player => {
        console.log(`\nTransformando estado do jogador ${player.name}:`);
        console.log('Estado original:', {
          id: player.id,
          name: player.name,
          isReady: player.isReady
        });

        // Só o próprio jogador pode ver os valores da sua mão; para os demais, mandamos apenas a contagem
        const isViewer = viewerId === undefined || viewerId === null || player.id === viewerId;
        const playerState = {
          id: player.id,
          name: player.name,
          isReady: player.isReady,
          connected: true,
          socketId: player.id,
          team: player.team,
          isCurrentPlayer: player.isCurrentPlayer,
          hand: player.hand ? (isViewer ? player.hand.map(card => ({
            value: card.value,
            suit: card.suit,
            display: card.display,
            isManilha: card.isManilha
          })) : player.hand.map(() => ({ hidden: true }))) : []
        };

        console.log('Estado transformado:', {
          id: playerState.id,
          name: playerState.name,
          team: playerState.team,
          isReady: playerState.isReady,
          cards: playerState.hand.length
        });

        return playerState;
      }),
      playedCards: this.playedCards,
      trucoState: this.trucoState,
      retrucoState: this.retrucoState,
      vale4State: this.vale4State,
      envidoState: this.envidoState,
      florState: this.florState,
      gameWinner: this.gameWinner,
      maxPlayers: this.maxPlayers,
      hasStarted: this.gameStatus === 'playing'
    };

    console.log('\nEstado final enviado para o cliente:');
    console.log('Times:', gameState.teams.map(team => ({
      id: team.id,
      name: team.name,
      score: team.score,
      roundsWon: team.roundsWon
    })));
    console.log('Jogadores:');
    gameState.players.forEach(player => {
      console.log(`- ${player.name}: isReady = ${player.isReady}, cards = ${player.hand.length}`);
    });
    console.log('Estado do Truco/Retruco/Vale 4:', {
      trucoState: gameState.trucoState,
      retrucoState: gameState.retrucoState,
      vale4State: gameState.vale4State
    });
    console.log('=== FIM DO ESTADO DO JOGO ===\n');

    return gameState;
  }
  
  // Método para atualizar o estado do jogo
  updateGameState() {
    // Atualizar o estado do jogo com base no estado atual
    if (this.players.length === 0) {
      this.gameStatus = 'waiting';
      this.status = 'waiting';
    } else if (this.players.length < 2) {
      this.gameStatus = 'waiting';
      this.status = 'waiting';
    } else if (this.players.every(p => p.isReady)) {
      if (this.gameStatus !== 'playing') {
        console.log('Todos os jogadores estão prontos, iniciando o jogo...');
        return this.startGame();
      }
    } else {
      this.gameStatus = 'waiting';
      this.status = 'waiting';
    }
    
    console.log('Estado do jogo atualizado:', this.gameStatus);
    console.log('Estado dos jogadores:');
    this.players.forEach(player => {
      console.log(`- ${player.name}: isReady = ${player.isReady}`);
    });
    
    return this.getGameState();
  }
  
  getPlayerCards(playerId) {
    console.log('Obtendo cartas do jogador:', playerId);
    const player = this.players.find(p => p.id === playerId);
    
    if (!player) {
      console.log('Jogador não encontrado:', playerId);
      return { success: false, error: 'Jogador não encontrado' };
    }
    
    // Verificar se o jogo já começou
    if (this.gameStatus !== 'playing') {
      console.log('Jogo ainda não começou');
      return { success: false, error: 'Jogo ainda não começou' };
    }
    
    console.log('Estado atual do jogador:', {
      id: player.id,
      name: player.name,
      hand: player.hand ? player.hand.length : 0,
      isReady: player.isReady
    });
    
    if (!player.hand || player.hand.length === 0) {
      console.log('Jogador não tem cartas na mão');
      return { success: false, error: 'Jogador não tem cartas' };
    }
    
    console.log('Cartas na mão do jogador:', player.hand.map(card => ({
      value: card.value,
      suit: card.suit,
      display: card.display,
      isManilha: card.isManilha
    })));
    
    const cards = player.hand.map(card => ({
      value: card.value,
      suit: card.suit,
      display: card.display,
      isManilha: card.isManilha
    }));
    
    console.log('Retornando cartas formatadas:', cards);
    return { success: true, cards };
  }

  getWinner() {
    if (this.gameStatus !== 'finished') {
      return null;
    }

    // Verificar se ambos os times passaram do total de pontos
    const team1Score = this.teams[0].score;
    const team2Score = this.teams[1].score;
    
    if (team1Score >= this.targetScore && team2Score >= this.targetScore) {
      // Se ambos passaram, o time com a pontuação mais alta vence
      console.log('Ambos os times passaram do total de pontos, vencedor é o com pontuação mais alta');
      return team1Score > team2Score ? this.teams[0] : this.teams[1];
    }
    
    // Caso contrário, o primeiro time a atingir o total de pontos vence
    return this.teams.find(team => team.score >= this.targetScore);
  }

  // Método para determinar o vencedor da mão com base nas regras de desempate
  determineHandWinnerFromTies() {
    // Se não temos informações suficientes, retornar null
    if (!this.roundTies || this.roundTies.length === 0) {
      return null;
    }
    
    // Se todas as três rodadas empataram, quem iniciou a mão vence
    if (this.roundTies.length === 3) {
      console.log('Todas as três rodadas empataram, vencedor é quem iniciou a mão');
      const starterTeam = this.teams.find(team => team.players.some(p => p.id === this.roundStarter));
      return starterTeam;
    }
    
    // Se temos apenas um empate, aplicar as regras específicas
    if (this.roundTies.length === 1) {
      const tieRound = this.roundTies[0];
      
      // Se empatou na primeira rodada, quem ganhar a segunda vence a mão
      if (tieRound === 1 && this.roundWinners && this.roundWinners.length > 0) {
        console.log('Empate na primeira rodada, vencedor é quem ganhou a segunda');
        return this.roundWinners[0];
      }
      
      // Se empatou na segunda rodada, quem ganhou a primeira vence a mão
      if (tieRound === 2 && this.roundWinners && this.roundWinners.length > 0) {
        console.log('Empate na segunda rodada, vencedor é quem ganhou a primeira');
        return this.roundWinners[0];
      }
      
      // Se empatou na terceira rodada, quem ganhou a primeira vence a mão
      if (tieRound === 3 && this.roundWinners && this.roundWinners.length > 0) {
        console.log('Empate na terceira rodada, vencedor é quem ganhou a primeira');
        return this.roundWinners[0];
      }
    }
    
    // Se temos dois empates, aplicar as regras específicas
    if (this.roundTies.length === 2) {
      // Se empatou na primeira e segunda rodadas, quem ganhar a terceira vence a mão
      if (this.roundTies.includes(1) && this.roundTies.includes(2) && this.roundWinners && this.roundWinners.length > 0) {
        console.log('Empate na primeira e segunda rodadas, vencedor é quem ganhou a terceira');
        return this.roundWinners[0];
      }
    }
    
    // Se não conseguimos determinar o vencedor, retornar null
    return null;
  }

  requestRetruco(playerId) {
    console.log(`[Retruco] Jogador ${playerId} solicitando Retruco`);
    
    if (this.gameStatus !== 'playing') {
      console.log('[Retruco] Erro: Jogo não está em andamento');
      return { success: false, message: 'Jogo não está em andamento' };
    }

    const player = this.players.find(p => p.id === playerId);
    if (!player) {
      console.log('[Retruco] Erro: Jogador não encontrado');
      return { success: false, message: 'Jogador não encontrado' };
    }

    if (!this.trucoState || player.team !== this.trucoState.respondingTeam) {
      console.log('[Retruco] Erro: O jogador não pode pedir retruco agora.');
      return { success: false, message: 'Você não pode pedir Retruco agora.' };
    }

    console.log(`[Retruco] Jogador ${playerId} pode pedir Retruco`);
      
    const respondingTeamId = this.trucoState.team;

    console.log(`[Retruco] Time respondente: ${respondingTeamId}`);
      
    this.trucoState = null;
    this.retrucoState = {
      level: 'retruco',
      value: 3,
      team: player.team,
      requestedBy: playerId,
      respondingTeam: respondingTeamId,
      accepted: false
    };
      
    return {
      success: true,
      retrucoState: this.retrucoState
    };
  }

  respondToRetruco(playerId, accept) {
    console.log(`[Retruco] Jogador ${playerId} respondendo ao Retruco: ${accept ? 'Aceito' : 'Recusado'}`);
    
    if (this.gameStatus !== 'playing') {
      console.log('[Retruco] Erro: Jogo não está em andamento');
      return { success: false, message: 'Jogo não está em andamento' };
    }

    if (!this.retrucoState || this.retrucoState.requestedBy === playerId) {
      console.log('[Retruco] Erro: Não há pedido de Retruco para responder');
      return { success: false, message: 'Não há pedido de Retruco para responder' };
    }

    const player = this.players.find(p => p.id === playerId);
    if (!player) {
      console.log('[Retruco] Erro: Jogador não encontrado');
      return { success: false, message: 'Jogador não encontrado' };
    }

    if (player.team !== this.retrucoState.respondingTeam) {
      console.log('[Retruco] Erro: Não é a vez do seu time responder');
      return { success: false, message: 'Não é a vez do seu time responder' };
    }

    if (accept) {
      console.log('[Retruco] Retruco aceito, atualizando valor da mão');
      this.retrucoState.accepted = true;
      this.handValue = 3;
      
      // Limpar o estado do Truco já que agora temos Retruco
      this.trucoState = null;
      
      // Manter a vez do jogador que pediu o Retruco
      const requestingPlayerIndex = this.players.findIndex(p => p.id === this.retrucoState.requestedBy);
      this.currentTurn = requestingPlayerIndex;
      this.players.forEach((p, i) => {
        p.isCurrentPlayer = (i === requestingPlayerIndex);
      });
      
      const response = { 
        success: true, 
        accepted: true,
        handValue: this.handValue,
        retrucoState: this.retrucoState,
        currentPlayer: this.retrucoState.requestedBy
      };
      
      // Garantir que o trucoState seja null na resposta
      response.trucoState = null;
      
      return response;
    } else {
      console.log('[Retruco] Retruco recusado, adicionando ponto para o time solicitante');
      const requestingTeam = this.teams.find(t => t.players.some(p => p.id === this.retrucoState.requestedBy));
      requestingTeam.addPoints(2);
      
      this.retrucoState = null;
      
      return { 
        success: true, 
        accepted: false
      };
    }
  }

  requestVale4(playerId) {
    console.log(`[Vale 4] Jogador ${playerId} solicitando Vale 4`);
    
    if (this.gameStatus !== 'playing') {
      console.log('[Vale 4] Erro: Jogo não está em andamento');
      return { success: false, message: 'Jogo não está em andamento' };
    }

    const player = this.players.find(p => p.id === playerId);
    if (!player) {
      console.log('[Vale 4] Erro: Jogador não encontrado');
      return { success: false, message: 'Jogador não encontrado' };
    }

    if (!this.retrucoState || player.team !== this.retrucoState.respondingTeam) {
      console.log('[Vale 4] Erro: O jogador não pode pedir Vale 4 agora.');
      return { success: false, message: 'Você não pode pedir Vale 4 agora.' };
    }

    console.log(`[Vale 4] Jogador ${playerId} pode pedir Vale 4`);
      
    const respondingTeamId = this.retrucoState.team;
      
    console.log(`[Vale 4] Time respondente: ${respondingTeamId}`);
      
    this.retrucoState = null;
    this.vale4State = {
      level: 'vale4',
      value: 4,
      team: player.team,
      requestedBy: playerId,
      respondingTeam: respondingTeamId,
      accepted: false
    };

    return {
      success: true,
      vale4State: this.vale4State,
    };
  }

  respondToVale4(playerId, accept) {
    console.log(`[Vale 4] Jogador ${playerId} respondendo ao Vale 4: ${accept ? 'Aceito' : 'Recusado'}`);
    
    if (this.gameStatus !== 'playing') {
      console.log('[Vale 4] Erro: Jogo não está em andamento');
      return { success: false, message: 'Jogo não está em andamento' };
    }

    if (!this.vale4State || this.vale4State.requestedBy === playerId) {
      console.log('[Vale 4] Erro: Não há pedido de Vale 4 para responder');
      return { success: false, message: 'Não há pedido de Vale 4 para responder' };
    }

    const player = this.players.find(p => p.id === playerId);
    if (!player) {
      console.log('[Vale 4] Erro: Jogador não encontrado');
      return { success: false, message: 'Jogador não encontrado' };
    }

    if (player.team !== this.vale4State.respondingTeam) {
      console.log('[Vale 4] Erro: Não é a vez do seu time responder');
      return { success: false, message: 'Não é a vez do seu time responder' };
    }

    if (accept) {
      console.log('[Vale 4] Vale 4 aceito, atualizando valor da mão');
      this.vale4State.accepted = true;
      this.handValue = 4;
      
      // Manter a vez do jogador que pediu o Vale 4
      const requestingPlayerIndex = this.players.findIndex(p => p.id === this.vale4State.requestedBy);
      this.currentTurn = requestingPlayerIndex;
      this.players.forEach((p, i) => {
        p.isCurrentPlayer = (i === requestingPlayerIndex);
      });
      
      return { 
        success: true, 
        accepted: true,
        handValue: this.handValue,
        vale4State: this.vale4State,
        currentPlayer: this.vale4State.requestedBy
      };
    } else {
      console.log('[Vale 4] Vale 4 recusado, adicionando ponto para o time solicitante');
      const requestingTeam = this.teams.find(t => t.players.some(p => p.id === this.vale4State.requestedBy));
      requestingTeam.addPoints(3);
      
      this.vale4State = null;
      
      return { 
        success: true, 
        accepted: false
      };
    }
  }
}

module.exports = { Card, Deck, Player, Team, TrucoGame };
