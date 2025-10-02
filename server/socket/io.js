// Módulo para exportar a instância do Socket.IO
let io;

// Função para inicializar o módulo io
const init = (socketIo) => {
  io = socketIo;
};

// Função para obter a instância do io
const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO não foi inicializado');
  }
  return io;
};

module.exports = {
  init,
  getIO
}; 