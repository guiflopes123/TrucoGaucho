const assert = require('assert');
const http = require('http');
const { Server } = require('socket.io');
const gameController = require('../controllers/gameController');
const ioModule = require('../socket/io');

describe('Game Controller Socket Events', () => {
  let server;
  let io;
  let mockSocket;
  let emittedEvents = [];

  beforeEach(() => {
    // Reset game rooms before each test
    gameController.gameRooms.clear();
    emittedEvents = [];

    // Mock Socket.IO emitter
    const mockIo = {
      to: (roomId) => ({
        emit: (event, data) => {
          emittedEvents.push({ event, data, roomId });
        }
      }),
      emit: (event, data) => {
        emittedEvents.push({ event, data });
      }
    };
    ioModule.init(mockIo);
  });

  const createAndSetupRoom = (playerIds) => {
    const room = gameController.createRoom('test_room', playerIds.length);
    playerIds.forEach((id, index) => {
      gameController.addPlayerToRoom(room.id, id, `Player ${index + 1}`);
    });
    playerIds.forEach(id => {
      gameController.setPlayerReady(room.id, id);
    });
    return room;
  };

  it('deve emitir "game_state_updated" e "truco_requested" ao pedir truco', () => {
    const player1Id = 'player1_socket_id';
    const player2Id = 'player2_socket_id';
    const room = createAndSetupRoom([player1Id, player2Id]);

    gameController.requestTruco(room.id, player1Id);

    const gameStateUpdatedEvent = emittedEvents.find(e => e.event === 'game_state_updated');
    const trucoRequestedEvent = emittedEvents.find(e => e.event === 'truco_requested');

    assert(gameStateUpdatedEvent, 'O evento "game_state_updated" não foi emitido');
    assert(trucoRequestedEvent, 'O evento "truco_requested" não foi emitido');
    assert.strictEqual(trucoRequestedEvent.data.trucoState.level, 'truco');
  });

  it('deve emitir "game_state_updated" e "retruco_requested" ao pedir retruco', () => {
    const player1Id = 'player1_socket_id';
    const player2Id = 'player2_socket_id';
    const room = createAndSetupRoom([player1Id, player2Id]);

    gameController.requestTruco(room.id, player1Id);
    emittedEvents = []; // Clear events after initial truco
    gameController.requestRetruco(room.id, player2Id);

    const gameStateUpdatedEvent = emittedEvents.find(e => e.event === 'game_state_updated');
    const retrucoRequestedEvent = emittedEvents.find(e => e.event === 'retruco_requested');

    assert(gameStateUpdatedEvent, 'O evento "game_state_updated" não foi emitido');
    assert(retrucoRequestedEvent, 'O evento "retruco_requested" não foi emitido');
    assert.strictEqual(retrucoRequestedEvent.data.retrucoState.level, 'retruco');
  });

  it('deve emitir "game_state_updated" e "vale4_requested" ao pedir vale 4', () => {
    const player1Id = 'player1_socket_id';
    const player2Id = 'player2_socket_id';
    const room = createAndSetupRoom([player1Id, player2Id]);

    gameController.requestTruco(room.id, player1Id);
    gameController.requestRetruco(room.id, player2Id);
    emittedEvents = []; // Clear events after retruco
    gameController.requestVale4(room.id, player1Id);

    const gameStateUpdatedEvent = emittedEvents.find(e => e.event === 'game_state_updated');
    const vale4RequestedEvent = emittedEvents.find(e => e.event === 'vale4_requested');

    assert(gameStateUpdatedEvent, 'O evento "game_state_updated" não foi emitido');
    assert(vale4RequestedEvent, 'O evento "vale4_requested" não foi emitido');
    assert.strictEqual(vale4RequestedEvent.data.vale4State.level, 'vale4');
  });

  it('deve emitir "game_state_updated" ao responder ao truco', () => {
    const player1Id = 'player1_socket_id';
    const player2Id = 'player2_socket_id';
    const room = createAndSetupRoom([player1Id, player2Id]);

    gameController.requestTruco(room.id, player1Id);
    emittedEvents = []; // Clear events
    gameController.respondToTruco(room.id, player2Id, true);

    const gameStateUpdatedEvent = emittedEvents.find(e => e.event === 'game_state_updated');
    assert(gameStateUpdatedEvent, 'O evento "game_state_updated" não foi emitido ao responder ao truco');
  });
});