import { Server, Socket } from 'socket.io';
import { GameRoomManager } from './GameRoomManager';
import { ClientToServerEvents, ServerToClientEvents, PublicGameState, PublicPlayer } from './types';
import { GameState } from '../lib/types/game.types';
import * as gameLogic from '../lib/utils/gameLogic';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

const roomManager = new GameRoomManager();

// Cleanup every 30 minutes
setInterval(() => roomManager.cleanupInactiveRooms(), 30 * 60 * 1000);

function toPublicGameState(state: GameState): PublicGameState {
  return {
    players: state.players.map(
      (p): PublicPlayer => ({
        id: p.id,
        name: p.name,
        handCount: p.hand.length,
        hasMelded: p.hasMelded,
        meldedCombinations: p.meldedCombinations,
        roundScore: p.roundScore,
        totalScore: p.totalScore,
      }),
    ),
    currentRound: state.currentRound,
    currentPlayerIndex: state.currentPlayerIndex,
    deckCount: state.deck.length,
    discardPile: state.discardPile,
    phase: state.phase,
    winner: state.winner,
    pendingClaimCard: state.pendingClaimCard,
    pendingClaimants: state.pendingClaimants,
  };
}

function broadcastPrivateHands(io: TypedServer, roomCode: string, room: ReturnType<GameRoomManager['getRoom']>) {
  if (!room) return;
  for (const player of room.gameState.players) {
    const socketId = room.playerSockets.get(player.id);
    if (socketId) {
      io.to(socketId).emit('privateHandUpdate', player.hand);
    }
  }
}

export function setupSocketHandlers(io: TypedServer) {
  io.on('connection', (socket: TypedSocket) => {
    console.log('Connected:', socket.id);

    // Track which room this socket is in
    let currentRoomCode: string | null = null;

    // ===== LOBBY =====

    socket.on('createRoom', (playerName, callback) => {
      try {
        const { roomCode, playerId } = roomManager.createRoom(socket.id, playerName);
        currentRoomCode = roomCode;
        socket.join(roomCode);

        console.log(`Room ${roomCode} created by ${playerName}`);
        callback({ roomCode, playerId });

        const room = roomManager.getRoom(roomCode)!;
        io.to(roomCode).emit('gameStateUpdate', toPublicGameState(room.gameState));
      } catch (err) {
        console.error('Error creating room:', err);
        socket.emit('error', 'Error al crear sala');
      }
    });

    socket.on('joinRoom', (roomCode, playerName, callback) => {
      try {
        const result = roomManager.joinRoom(roomCode, socket.id, playerName);
        if (!result.success) {
          callback({ success: false, error: result.error });
          return;
        }

        currentRoomCode = roomCode;
        socket.join(roomCode);
        callback({ success: true, playerId: result.playerId });

        console.log(`${playerName} joined room ${roomCode}`);

        const room = roomManager.getRoom(roomCode)!;
        const playerList = room.gameState.players.map((p) => ({ id: p.id, name: p.name }));
        io.to(roomCode).emit('playerJoined', playerList);
        io.to(roomCode).emit('gameStateUpdate', toPublicGameState(room.gameState));
      } catch (err) {
        console.error('Error joining room:', err);
        callback({ success: false, error: 'Error al unirse a la sala' });
      }
    });

    socket.on('leaveRoom', () => {
      handleLeave();
    });

    socket.on('startGame', () => {
      try {
        if (!currentRoomCode) {
          socket.emit('error', 'No estás en una sala');
          return;
        }

        const result = roomManager.startGame(currentRoomCode, socket.id);
        if (!result.success) {
          socket.emit('error', result.error || 'Error al iniciar juego');
          return;
        }

        console.log(`Game started in room ${currentRoomCode}`);

        const room = roomManager.getRoom(currentRoomCode)!;
        io.to(currentRoomCode).emit('gameStarted');
        io.to(currentRoomCode).emit('gameStateUpdate', toPublicGameState(room.gameState));
        broadcastPrivateHands(io, currentRoomCode, room);
      } catch (err) {
        console.error('Error starting game:', err);
        socket.emit('error', 'Error al iniciar juego');
      }
    });

    // ===== GAME ACTIONS =====

    function getContext() {
      if (!currentRoomCode) return null;
      const room = roomManager.getRoom(currentRoomCode);
      if (!room) return null;
      const playerId = roomManager.getPlayerIdBySocketId(currentRoomCode, socket.id);
      if (!playerId) return null;
      return { room, playerId, roomCode: currentRoomCode };
    }

    function validateTurn(ctx: NonNullable<ReturnType<typeof getContext>>): boolean {
      const currentPlayer = ctx.room.gameState.players[ctx.room.gameState.currentPlayerIndex];
      if (currentPlayer.id !== ctx.playerId) {
        socket.emit('error', 'No es tu turno');
        return false;
      }
      return true;
    }

    socket.on('drawFromDeck', () => {
      try {
        const ctx = getContext();
        if (!ctx) return;
        if (!validateTurn(ctx)) return;

        const newState = gameLogic.drawFromDeck(ctx.room.gameState, ctx.playerId);
        roomManager.updateGameState(ctx.roomCode, newState);

        socket.emit('cardDrawn');
        io.to(ctx.roomCode).emit('gameStateUpdate', toPublicGameState(newState));

        const player = newState.players.find((p) => p.id === ctx.playerId)!;
        socket.emit('privateHandUpdate', player.hand);
      } catch (err) {
        console.error('Error drawing from deck:', err);
        socket.emit('error', 'Error al tomar carta del mazo');
      }
    });

    socket.on('drawFromDiscard', () => {
      try {
        const ctx = getContext();
        if (!ctx) return;
        if (!validateTurn(ctx)) return;

        const newState = gameLogic.drawFromDiscard(ctx.room.gameState, ctx.playerId);
        roomManager.updateGameState(ctx.roomCode, newState);

        socket.emit('cardDrawn');
        io.to(ctx.roomCode).emit('gameStateUpdate', toPublicGameState(newState));

        const player = newState.players.find((p) => p.id === ctx.playerId)!;
        socket.emit('privateHandUpdate', player.hand);
      } catch (err) {
        console.error('Error drawing from discard:', err);
        socket.emit('error', 'Error al tomar carta del descarte');
      }
    });

    socket.on('discardCard', (card) => {
      try {
        const ctx = getContext();
        if (!ctx) return;
        if (!validateTurn(ctx)) return;

        let newState = gameLogic.discardCard(ctx.room.gameState, ctx.playerId, card);
        newState = gameLogic.checkRoundEnd(newState);

        if (newState.phase === 'roundEnd') {
          newState = gameLogic.checkGameEnd(newState);
          roomManager.updateGameState(ctx.roomCode, newState);

          io.to(ctx.roomCode).emit('gameStateUpdate', toPublicGameState(newState));
          broadcastPrivateHands(io, ctx.roomCode, roomManager.getRoom(ctx.roomCode));

          if (newState.phase === 'gameEnd') {
            io.to(ctx.roomCode).emit('gameEnded');
          } else {
            io.to(ctx.roomCode).emit('roundEnded');
          }
        } else {
          newState = gameLogic.nextTurn(newState);
          roomManager.updateGameState(ctx.roomCode, newState);

          const nextPlayer = newState.players[newState.currentPlayerIndex];
          io.to(ctx.roomCode).emit('turnChanged', nextPlayer.id);
          io.to(ctx.roomCode).emit('gameStateUpdate', toPublicGameState(newState));
          broadcastPrivateHands(io, ctx.roomCode, roomManager.getRoom(ctx.roomCode));
        }
      } catch (err) {
        console.error('Error discarding card:', err);
        socket.emit('error', 'Error al descartar carta');
      }
    });

    socket.on('meldCombinations', (combinations) => {
      try {
        const ctx = getContext();
        if (!ctx) return;
        if (!validateTurn(ctx)) return;

        let newState = gameLogic.meldCombinations(ctx.room.gameState, ctx.playerId, combinations);
        newState = gameLogic.checkRoundEnd(newState);
        if (newState.phase === 'roundEnd') {
          newState = gameLogic.checkGameEnd(newState);
        }
        roomManager.updateGameState(ctx.roomCode, newState);

        io.to(ctx.roomCode).emit('gameStateUpdate', toPublicGameState(newState));
        broadcastPrivateHands(io, ctx.roomCode, roomManager.getRoom(ctx.roomCode));

        if (newState.phase === 'gameEnd') {
          io.to(ctx.roomCode).emit('gameEnded');
        } else if (newState.phase === 'roundEnd') {
          io.to(ctx.roomCode).emit('roundEnded');
        }
      } catch (err) {
        console.error('Error melding combinations:', err);
        socket.emit('error', 'Combinaciones inválidas para esta ronda');
      }
    });

    socket.on('addToCombination', (targetPlayerId, combinationIndex, card, position) => {
      try {
        const ctx = getContext();
        if (!ctx) return;
        if (!validateTurn(ctx)) return;

        let newState = gameLogic.addToCombination(
          ctx.room.gameState,
          ctx.playerId,
          targetPlayerId,
          combinationIndex,
          card,
          position,
        );
        newState = gameLogic.checkRoundEnd(newState);
        if (newState.phase === 'roundEnd') {
          newState = gameLogic.checkGameEnd(newState);
        }
        roomManager.updateGameState(ctx.roomCode, newState);

        io.to(ctx.roomCode).emit('gameStateUpdate', toPublicGameState(newState));
        broadcastPrivateHands(io, ctx.roomCode, roomManager.getRoom(ctx.roomCode));

        if (newState.phase === 'gameEnd') {
          io.to(ctx.roomCode).emit('gameEnded');
        } else if (newState.phase === 'roundEnd') {
          io.to(ctx.roomCode).emit('roundEnded');
        }
      } catch (err) {
        console.error('Error adding to combination:', err);
        socket.emit('error', 'No se puede agregar carta a esa combinación');
      }
    });

    socket.on('substituteJoker', (targetPlayerId, combinationIndex, realCard, jokerId) => {
      try {
        const ctx = getContext();
        if (!ctx) return;
        if (!validateTurn(ctx)) return;

        let newState = gameLogic.substituteJoker(
          ctx.room.gameState,
          ctx.playerId,
          targetPlayerId,
          combinationIndex,
          realCard,
          jokerId,
        );
        newState = gameLogic.checkRoundEnd(newState);
        if (newState.phase === 'roundEnd') {
          newState = gameLogic.checkGameEnd(newState);
        }
        roomManager.updateGameState(ctx.roomCode, newState);

        io.to(ctx.roomCode).emit('gameStateUpdate', toPublicGameState(newState));
        broadcastPrivateHands(io, ctx.roomCode, roomManager.getRoom(ctx.roomCode));

        if (newState.phase === 'gameEnd') {
          io.to(ctx.roomCode).emit('gameEnded');
        } else if (newState.phase === 'roundEnd') {
          io.to(ctx.roomCode).emit('roundEnded');
        }
      } catch (err) {
        console.error('Error substituting joker:', err);
        socket.emit('error', 'No se puede sustituir el comodín');
      }
    });

    socket.on('claimDiscard', () => {
      try {
        const ctx = getContext();
        if (!ctx) return;

        const state = ctx.room.gameState;
        if (state.phase !== 'playing') return;
        if (state.players.length < 3) return;
        if (!state.pendingClaimCard) return;
        if (state.players[state.currentPlayerIndex].id === ctx.playerId) return;
        if (state.pendingClaimants.includes(ctx.playerId)) return;

        const newState = gameLogic.claimDiscard(state, ctx.playerId);
        roomManager.updateGameState(ctx.roomCode, newState);
        io.to(ctx.roomCode).emit('gameStateUpdate', toPublicGameState(newState));
      } catch (err) {
        console.error('Error claiming discard:', err);
        socket.emit('error', 'Error al reclamar carta del descarte');
      }
    });

    socket.on('nextRound', () => {
      try {
        if (!currentRoomCode) return;
        const room = roomManager.getRoom(currentRoomCode);
        if (!room) return;

        if (socket.id !== room.hostSocketId) {
          socket.emit('error', 'Solo el host puede avanzar a la siguiente ronda');
          return;
        }

        const newState = gameLogic.startRound(room.gameState);
        roomManager.updateGameState(currentRoomCode, newState);

        io.to(currentRoomCode).emit('gameStateUpdate', toPublicGameState(newState));
        broadcastPrivateHands(io, currentRoomCode, roomManager.getRoom(currentRoomCode));
      } catch (err) {
        console.error('Error starting next round:', err);
        socket.emit('error', 'Error al iniciar siguiente ronda');
      }
    });

    // ===== DISCONNECT =====

    function handleLeave() {
      const result = roomManager.leaveRoom(socket.id);
      if (result.roomCode && result.playerId) {
        socket.leave(result.roomCode);
        currentRoomCode = null;

        if (!result.isEmpty) {
          const room = roomManager.getRoom(result.roomCode)!;
          const playerList = room.gameState.players.map((p) => ({ id: p.id, name: p.name }));
          io.to(result.roomCode).emit('playerLeft', playerList);
          io.to(result.roomCode).emit('gameStateUpdate', toPublicGameState(room.gameState));

          // Notify new host
          const hostPlayerId = roomManager.getHostPlayerId(result.roomCode);
          if (hostPlayerId) {
            io.to(result.roomCode).emit('hostChanged', hostPlayerId);
          }
        }
      }
    }

    socket.on('disconnect', () => {
      console.log('Disconnected:', socket.id);
      handleLeave();
    });
  });
}
