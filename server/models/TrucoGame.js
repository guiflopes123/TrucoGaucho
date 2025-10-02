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

    // Encontrar o próximo jogador
    const currentIndex = this.players.findIndex(p => p.id === playerId);
    const nextIndex = (currentIndex + 1) % this.players.length;
    const nextPlayer = this.players[nextIndex];
    
    console.log(`[Truco] Próximo jogador para responder: ${nextPlayer.id}`);
    
    // Configurar estado do Truco
    this.trucoState = {
      level: 'truco',
      value: 2,
      team: player.team,
      requestedBy: playerId,
      respondingPlayer: nextPlayer.id,
      accepted: false
    };
    
    return { 
      success: true,
      nextPlayer: nextPlayer.id,
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

    if (player.id !== this.trucoState.respondingPlayer) {
      console.log('[Truco] Erro: Não é a vez do jogador responder');
      return { success: false, message: 'Não é a vez do jogador responder' };
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

  requestEnvido(playerId) {
    if (this.gameStatus !== 'playing') {
      return { success: false, message: 'Jogo não está em andamento' };
    }

    const player = this.players.find(p => p.id === playerId);
    if (!player) {
      return { success: false, message: 'Jogador não encontrado' };
    }

    if (player.isCurrentPlayer) {
      this.envidoState = {
        level: 'envido',
        value: 2,
        team: player.team,
        requestedBy: playerId,
        accepted: false,
        waitingResponse: true,
        respondingTeam: player.team === 1 ? 2 : 1
      };
      return { success: true };
    }

    return { success: false, message: 'Não é a vez do jogador' };
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

    if (accept) {
      // Calcular Envido para cada time
      const team1Envido = this.players
        .filter(p => p.team === 1)
        .reduce((max, p) => Math.max(max, p.calculateEnvido()), 0);
      
      const team2Envido = this.players
        .filter(p => p.team === 2)
        .reduce((max, p) => Math.max(max, p.calculateEnvido()), 0);

      const winningTeam = team1Envido > team2Envido ? 1 : 2;
      this.teams[winningTeam - 1].addPoints(2);
    }

    return { 
      success: true, 
      accepted: accept,
      team1Envido: this.players.filter(p => p.team === 1).reduce((max, p) => Math.max(max, p.calculateEnvido()), 0),
      team2Envido: this.players.filter(p => p.team === 2).reduce((max, p) => Math.max(max, p.calculateEnvido()), 0),
      winningTeam: accept ? (this.players.filter(p => p.team === 1).reduce((max, p) => Math.max(max, p.calculateEnvido()), 0) > 
                           this.players.filter(p => p.team === 2).reduce((max, p) => Math.max(max, p.calculateEnvido()), 0) ? 1 : 2) : null
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

    if (player.hasFlor()) {
      this.florState = {
        level: 'flor',
        value: player.calculateFlor(),
        team: player.team,
        declaredBy: playerId
      };
      return { success: true };
    }

    return { success: false, message: 'Jogador não tem Flor' };
  }

  removePlayer(playerId) {
    const playerIndex = this.players.findIndex(p => p.id === playerId);
    
    if (playerIndex === -1) {
      return { success: false, message: 'Jogador não encontrado' };
    }
    
    const player = this.players[playerIndex];
    
    // Remover o jogador da lista de jogadores
    this.players.splice(playerIndex, 1);
    
    // Remover o jogador do time
    const teamIndex = player.team - 1;
    const playerTeamIndex = this.teams[teamIndex].players.findIndex(p => p.id === playerId);
    
    if (playerTeamIndex !== -1) {
      this.teams[teamIndex].players.splice(playerTeamIndex, 1);
    }
    
    // Se não houver mais jogadores, resetar o jogo
    if (this.players.length === 0) {
      this.resetGame();
      return { success: true, roomEmpty: true };
    }
    
    // Se o jogo estava em andamento, finalizar
    if (this.gameStatus === 'playing') {
      this.gameStatus = 'waiting';
    }
    
    // Atualizar o estado do jogo após remover o jogador
    this.updateGameState();
    
    return { success: true, roomEmpty: false };
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
      
    // Adicionar pontos ao time vencedor
    winningTeam.addPoints(this.handValue);
      console.log('Pontuação após adicionar pontos:', winningTeam.score);
    
    // Verificar se o time atingiu a pontuação alvo
    if (winningTeam.score >= this.targetScore) {
        console.log('Time atingiu a pontuação alvo, finalizando o jogo');
      this.gameWinner = winningTeam;
      this.gameStatus = 'finished';
        this.status = 'finished';
      }
    } else {
      console.log('Empate na mão - nenhum time recebe pontos');
    }
    
    console.log('Preparando para a próxima mão');
    
    // Aguardar 3 segundos antes de limpar a mesa e preparar para a próxima mão
    setTimeout(() => {
      // Preparar para a próxima mão
      this.currentRound = 1;
      this.handValue = 1;
      this.trucoState = null;
      this.envidoState = null;
      this.florState = null;
      this.playedCards = []; // Limpar as cartas da mesa
      
      // Resetar as vitórias de rodada e os registros de empate
      this.teams.forEach(team => {
        team.resetRoundWins();
        console.log(`Time ${team.id}: ${team.roundsWon} rodadas vencidas após reset`);
      });
      
      // Resetar os registros de empate e vencedores
      this.roundTies = [];
      this.roundWinners = [];
      
      // Distribuir novas cartas
      this.dealCards();
      
      // Alternar o jogador inicial da mão
      this.currentTurn = (this.currentTurn + 1) % this.players.length;
      
      for (let i = 0; i < this.players.length; i++) {
        this.players[i].isCurrentPlayer = (i === this.currentTurn);
      }
      
      // Enviar o estado atualizado após limpar a mesa
      const updatedState = this.getGameState();
      return updatedState;
    }, 3000);
    
    // Atualizar o estado do jogo
    const gameState = this.getGameState();
    console.log('Estado do jogo após finalizar a mão:', {
      status: gameState.status,
      teams: gameState.teams.map(team => ({
        id: team.id,
        score: team.score,
        roundsWon: team.roundsWon
      }))
    });
    
    console.log('=== FIM DA FINALIZAÇÃO DA MÃO ===\n');
    
    return gameState;
  }
  
  // Método para obter o estado do jogo para enviar ao cliente
  getGameState() {
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

        const playerState = {
          id: player.id,
          name: player.name,
          isReady: player.isReady,
          connected: true,
          socketId: player.id,
          isCurrentPlayer: player.isCurrentPlayer,
          hand: player.hand ? player.hand.map(card => ({
            value: card.value,
            suit: card.suit,
            display: card.display,
            isManilha: card.isManilha
          })) : []
        };

        console.log('Estado transformado:', {
          id: playerState.id,
          name: playerState.name,
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

    if (player.isCurrentPlayer) {
      console.log(`[Retruco] Jogador ${playerId} pode pedir Retruco`);
      
      // Encontrar o próximo jogador
      const currentIndex = this.players.findIndex(p => p.id === playerId);
      const nextIndex = (currentIndex + 1) % this.players.length;
      const nextPlayer = this.players[nextIndex];
      
      console.log(`[Retruco] Próximo jogador para responder: ${nextPlayer.id}`);
      
      // Configurar estado do Retruco
      this.retrucoState = {
        level: 'retruco',
        value: 3,
        team: player.team,
        requestedBy: playerId,
        respondingPlayer: nextPlayer.id,
        accepted: false
      };
      
      return { 
        success: true,
        nextPlayer: nextPlayer.id,
        retrucoState: this.retrucoState
      };
    }

    console.log('[Retruco] Erro: Não é a vez do jogador');
    return { success: false, message: 'Não é a vez do jogador' };
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

    if (player.id !== this.retrucoState.respondingPlayer) {
      console.log('[Retruco] Erro: Não é a vez do jogador responder');
      return { success: false, message: 'Não é a vez do jogador responder' };
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

    // Verificar se o jogador é quem recebeu o Retruco
    if (!this.retrucoState || this.retrucoState.respondingPlayer !== playerId) {
      console.log('[Vale 4] Erro: Apenas o jogador que recebeu o Retruco pode pedir Vale 4');
      return { success: false, message: 'Apenas o jogador que recebeu o Retruco pode pedir Vale 4' };
    }

    if (player.isCurrentPlayer) {
      console.log(`[Vale 4] Jogador ${playerId} pode pedir Vale 4`);
      
      // Encontrar o próximo jogador
      const currentIndex = this.players.findIndex(p => p.id === playerId);
      const nextIndex = (currentIndex + 1) % this.players.length;
      const nextPlayer = this.players[nextIndex];
      
      console.log(`[Vale 4] Próximo jogador para responder: ${nextPlayer.id}`);
      
      // Configurar estado do Vale 4
      this.vale4State = {
        level: 'vale4',
        value: 4,
        team: player.team,
        requestedBy: playerId,
        respondingPlayer: nextPlayer.id,
        accepted: false
      };

      // Limpar o estado do Retruco já que agora temos Vale 4
      this.retrucoState = null;
      
      // Não alterar o jogador atual, pois a vez deve permanecer com quem pediu o Vale 4
      console.log(`[Vale 4] Mantendo a vez com o jogador ${playerId}`);
      console.log('[Vale 4] Estado atualizado:', {
        vale4State: this.vale4State,
        retrucoState: this.retrucoState,
        currentPlayer: playerId
      });
      
      return { 
        success: true,
        playerId: playerId,
        nextPlayer: nextPlayer.id,
        vale4State: this.vale4State,
        currentPlayer: playerId, // Manter a vez com quem pediu o Vale 4
        gameState: this.getGameState()
      };
    }

    console.log('[Vale 4] Erro: Não é a vez do jogador');
    return { success: false, message: 'Não é a vez do jogador' };
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

    if (player.id !== this.vale4State.respondingPlayer) {
      console.log('[Vale 4] Erro: Não é a vez do jogador responder');
      return { success: false, message: 'Não é a vez do jogador responder' };
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
