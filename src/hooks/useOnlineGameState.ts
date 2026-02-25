'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import { Card, Combination } from '@/lib/types/game.types';
import type { PublicGameState } from '@/server/types';

export function useOnlineGameState() {
  const { socket, connected } = useSocket();
  const [gameState, setGameState] = useState<PublicGameState | null>(null);
  const [myHand, setMyHand] = useState<Card[]>([]);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [hasDrawnThisTurn, setHasDrawnThisTurn] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const myPlayerIdRef = useRef(myPlayerId);
  myPlayerIdRef.current = myPlayerId;

  // Listen to server events
  useEffect(() => {
    if (!socket) return;

    socket.on('gameStateUpdate', (state) => {
      setGameState(state);
    });

    socket.on('privateHandUpdate', (hand) => {
      setMyHand(hand);
    });

    socket.on('cardDrawn', () => {
      setHasDrawnThisTurn(true);
    });

    socket.on('turnChanged', () => {
      setHasDrawnThisTurn(false);
    });

    socket.on('hostChanged', (hostPlayerId) => {
      setIsHost(hostPlayerId === myPlayerIdRef.current);
    });

    socket.on('error', (message) => {
      console.error('Server error:', message);
      setServerError(message);
      // Auto-clear after 4 seconds
      setTimeout(() => setServerError(null), 4000);
    });

    return () => {
      socket.off('gameStateUpdate');
      socket.off('privateHandUpdate');
      socket.off('cardDrawn');
      socket.off('turnChanged');
      socket.off('hostChanged');
      socket.off('error');
    };
  }, [socket]);

  // Derived state
  const isMyTurn = gameState?.phase === 'playing' && myPlayerId != null
    ? gameState.players[gameState.currentPlayerIndex]?.id === myPlayerId
    : false;

  const myPlayer = gameState?.players.find((p) => p.id === myPlayerId) ?? null;

  // --- Actions ---

  const createRoom = useCallback((playerName: string) => {
    if (!socket) return;
    socket.emit('createRoom', playerName, ({ roomCode: code, playerId }) => {
      setRoomCode(code);
      setMyPlayerId(playerId);
      setIsHost(true);
    });
  }, [socket]);

  const joinRoom = useCallback((code: string, playerName: string): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!socket) { resolve('No hay conexión'); return; }
      socket.emit('joinRoom', code, playerName, (response) => {
        if (response.success) {
          setRoomCode(code);
          setMyPlayerId(response.playerId!);
          setIsHost(false);
          resolve(null);
        } else {
          resolve(response.error || 'Error al unirse');
        }
      });
    });
  }, [socket]);

  const startGame = useCallback(() => {
    if (!socket) return;
    socket.emit('startGame');
  }, [socket]);

  const drawFromDeck = useCallback(() => {
    if (!socket || !isMyTurn || hasDrawnThisTurn) return;
    socket.emit('drawFromDeck');
  }, [socket, isMyTurn, hasDrawnThisTurn]);

  const drawFromDiscard = useCallback(() => {
    if (!socket || !isMyTurn || hasDrawnThisTurn) return;
    socket.emit('drawFromDiscard');
  }, [socket, isMyTurn, hasDrawnThisTurn]);

  const discardCard = useCallback((card: Card) => {
    if (!socket || !isMyTurn || !hasDrawnThisTurn) return;
    socket.emit('discardCard', card);
    setHasDrawnThisTurn(false);
  }, [socket, isMyTurn, hasDrawnThisTurn]);

  const meldCombinations = useCallback((combinations: Combination[]) => {
    if (!socket || !isMyTurn) return;
    socket.emit('meldCombinations', combinations);
  }, [socket, isMyTurn]);

  const addToCombination = useCallback((
    targetPlayerId: string,
    combinationIndex: number,
    card: Card,
    position?: 'start' | 'end',
  ) => {
    if (!socket || !isMyTurn) return;
    socket.emit('addToCombination', targetPlayerId, combinationIndex, card, position);
  }, [socket, isMyTurn]);

  const substituteJoker = useCallback((
    targetPlayerId: string,
    combinationIndex: number,
    card: Card,
    jokerId: string,
  ) => {
    if (!socket || !isMyTurn) return;
    socket.emit('substituteJoker', targetPlayerId, combinationIndex, card, jokerId);
  }, [socket, isMyTurn]);

  const claimDiscard = useCallback(() => {
    if (!socket || isMyTurn || !gameState?.pendingClaimCard) return;
    socket.emit('claimDiscard');
  }, [socket, isMyTurn, gameState?.pendingClaimCard]);

  const nextRound = useCallback(() => {
    if (!socket) return;
    socket.emit('nextRound');
  }, [socket]);

  const leaveRoom = useCallback(() => {
    if (socket) socket.emit('leaveRoom');
    setGameState(null);
    setMyHand([]);
    setRoomCode(null);
    setMyPlayerId(null);
    setHasDrawnThisTurn(false);
    setIsHost(false);
  }, [socket]);

  return {
    connected,
    gameState,
    myHand,
    myPlayer,
    myPlayerId,
    roomCode,
    hasDrawnThisTurn,
    isMyTurn,
    isHost,
    serverError,
    createRoom,
    joinRoom,
    startGame,
    drawFromDeck,
    drawFromDiscard,
    discardCard,
    meldCombinations,
    addToCombination,
    substituteJoker,
    claimDiscard,
    nextRound,
    leaveRoom,
  };
}
