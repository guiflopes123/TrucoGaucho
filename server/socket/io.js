// Guarda a instância do Socket.IO para que os controladores possam emitir eventos.
let io;

const init = (socketIo) => {
  io = socketIo;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO não foi inicializado');
  }
  return io;
};

// Canal privado de um jogador: todas as conexões dele entram nesta "sala" do Socket.IO,
// assim o servidor endereça o jogador (e não um socket.id que muda a cada reconexão).
const playerChannel = (playerId) => `player:${playerId}`;

module.exports = { init, getIO, playerChannel };
