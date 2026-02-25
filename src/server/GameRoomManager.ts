import { ServerGameRoom } from './types';
import { GameState, Player } from '../lib/types/game.types';
import * as gameLogic from '../lib/utils/gameLogic';

export class GameRoomManager {
  private rooms: Map<string, ServerGameRoom> = new Map();

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return this.rooms.has(code) ? this.generateRoomCode() : code;
  }

  private generatePlayerId(): string {
    return `player-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  createRoom(hostSocketId: string, playerName: string): { roomCode: string; playerId: string } {
    const roomCode = this.generateRoomCode();
    const playerId = this.generatePlayerId();

    const room: ServerGameRoom = {
      id: roomCode,
      gameState: {
        players: [
          {
            id: playerId,
            name: playerName,
            hand: [],
            hasMelded: false,
            meldedCombinations: [],
            roundScore: 0,
            totalScore: 0,
          },
        ],
        currentRound: 1,
        currentPlayerIndex: 0,
        deck: [],
        discardPile: [],
        phase: 'setup',
        winner: null,
        pendingClaimCard: null,
        pendingClaimants: [],
        pendingSkipPlayerId: null,
      },
      hostSocketId,
      playerSockets: new Map([[playerId, hostSocketId]]),
      createdAt: new Date(),
    };

    this.rooms.set(roomCode, room);
    return { roomCode, playerId };
  }

  joinRoom(
    roomCode: string,
    socketId: string,
    playerName: string,
  ): { success: boolean; error?: string; playerId?: string } {
    const room = this.rooms.get(roomCode);

    if (!room) return { success: false, error: 'Sala no encontrada' };
    if (room.gameState.phase !== 'setup') return { success: false, error: 'El juego ya comenzó' };
    if (room.gameState.players.length >= 4) return { success: false, error: 'Sala llena (máximo 4 jugadores)' };

    if (room.gameState.players.some((p) => p.name.toLowerCase() === playerName.toLowerCase())) {
      return { success: false, error: 'Ya existe un jugador con ese nombre' };
    }

    const playerId = this.generatePlayerId();
    const newPlayer: Player = {
      id: playerId,
      name: playerName,
      hand: [],
      hasMelded: false,
      meldedCombinations: [],
      roundScore: 0,
      totalScore: 0,
    };

    room.gameState = {
      ...room.gameState,
      players: [...room.gameState.players, newPlayer],
    };
    room.playerSockets.set(playerId, socketId);

    return { success: true, playerId };
  }

  leaveRoom(socketId: string): { roomCode?: string; playerId?: string; isEmpty: boolean } {
    for (const [roomCode, room] of this.rooms.entries()) {
      let playerId: string | undefined;
      for (const [pId, sId] of room.playerSockets.entries()) {
        if (sId === socketId) {
          playerId = pId;
          break;
        }
      }
      if (!playerId) continue;

      room.gameState = {
        ...room.gameState,
        players: room.gameState.players.filter((p) => p.id !== playerId),
      };
      room.playerSockets.delete(playerId);

      if (room.playerSockets.size === 0) {
        this.rooms.delete(roomCode);
        return { roomCode, playerId, isEmpty: true };
      }

      // Reassign host if needed
      if (socketId === room.hostSocketId) {
        room.hostSocketId = Array.from(room.playerSockets.values())[0];
      }

      return { roomCode, playerId, isEmpty: false };
    }
    return { isEmpty: false };
  }

  startGame(roomCode: string, socketId: string): { success: boolean; error?: string } {
    const room = this.rooms.get(roomCode);
    if (!room) return { success: false, error: 'Sala no encontrada' };
    if (socketId !== room.hostSocketId) return { success: false, error: 'Solo el host puede iniciar el juego' };
    if (room.gameState.players.length < 2) return { success: false, error: 'Se necesitan al menos 2 jugadores' };

    // Re-init the game state (initGame shuffles the player order)
    const playerNames = room.gameState.players.map((p) => p.name);
    const freshState = gameLogic.initGame(playerNames);

    // Map player IDs from the room to the fresh state by name (not by index,
    // since initGame shuffles the order). This preserves socket mappings.
    const oldPlayers = room.gameState.players;
    const newPlayers = freshState.players.map((fp) => {
      const oldPlayer = oldPlayers.find((op) => op.name === fp.name)!;
      return { ...fp, id: oldPlayer.id };
    });

    room.gameState = { ...freshState, players: newPlayers };
    return { success: true };
  }

  getRoom(roomCode: string): ServerGameRoom | undefined {
    return this.rooms.get(roomCode);
  }

  getRoomBySocketId(socketId: string): { room: ServerGameRoom; roomCode: string } | undefined {
    for (const [roomCode, room] of this.rooms.entries()) {
      for (const sId of room.playerSockets.values()) {
        if (sId === socketId) return { room, roomCode };
      }
    }
    return undefined;
  }

  getPlayerIdBySocketId(roomCode: string, socketId: string): string | undefined {
    const room = this.rooms.get(roomCode);
    if (!room) return undefined;
    for (const [playerId, sId] of room.playerSockets.entries()) {
      if (sId === socketId) return playerId;
    }
    return undefined;
  }

  getHostPlayerId(roomCode: string): string | undefined {
    const room = this.rooms.get(roomCode);
    if (!room) return undefined;
    for (const [playerId, sId] of room.playerSockets.entries()) {
      if (sId === room.hostSocketId) return playerId;
    }
    return undefined;
  }

  updateGameState(roomCode: string, newState: GameState): void {
    const room = this.rooms.get(roomCode);
    if (room) room.gameState = newState;
  }

  cleanupInactiveRooms(): void {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    for (const [roomCode, room] of this.rooms.entries()) {
      if (room.createdAt < twoHoursAgo) {
        this.rooms.delete(roomCode);
      }
    }
  }
}
