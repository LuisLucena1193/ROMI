import { GameState, Card, Combination, Player } from '../lib/types/game.types';

export interface ServerGameRoom {
  id: string;
  gameState: GameState;
  hostSocketId: string;
  playerSockets: Map<string, string>; // playerId -> socketId
  createdAt: Date;
}

// Client → Server events
export interface ClientToServerEvents {
  // Lobby
  createRoom: (playerName: string, callback: (response: { roomCode: string; playerId: string }) => void) => void;
  joinRoom: (roomCode: string, playerName: string, callback: (response: { success: boolean; error?: string; playerId?: string }) => void) => void;
  leaveRoom: () => void;
  startGame: () => void;

  // Game actions
  drawFromDeck: () => void;
  drawFromDiscard: () => void;
  discardCard: (card: Card) => void;
  meldCombinations: (combinations: Combination[]) => void;
  addToCombination: (targetPlayerId: string, combinationIndex: number, card: Card, position?: 'start' | 'end') => void;
  substituteJoker: (targetPlayerId: string, combinationIndex: number, realCard: Card, jokerId: string) => void;
  claimDiscard: () => void;

  // Rounds
  nextRound: () => void;
}

// Server → Client events
export interface ServerToClientEvents {
  // Lobby
  playerJoined: (players: Pick<Player, 'id' | 'name'>[]) => void;
  playerLeft: (players: Pick<Player, 'id' | 'name'>[]) => void;
  hostChanged: (hostPlayerId: string) => void;
  gameStarted: () => void;

  // Game state
  gameStateUpdate: (state: PublicGameState) => void;
  privateHandUpdate: (hand: Card[]) => void;

  // Turn
  turnChanged: (currentPlayerId: string) => void;
  cardDrawn: () => void;

  // End
  roundEnded: () => void;
  gameEnded: () => void;

  // Errors
  error: (message: string) => void;
}

// Game state sent to clients — hands stripped out
export interface PublicGameState {
  players: PublicPlayer[];
  currentRound: 1 | 2 | 3 | 4;
  currentPlayerIndex: number;
  deckCount: number;
  discardPile: Card[];
  phase: GameState['phase'];
  winner: string | null;
  pendingClaimCard: Card | null;
  pendingClaimants: string[];
}

export interface PublicPlayer {
  id: string;
  name: string;
  handCount: number;
  hasMelded: boolean;
  meldedCombinations: Combination[];
  roundScore: number;
  totalScore: number;
}
