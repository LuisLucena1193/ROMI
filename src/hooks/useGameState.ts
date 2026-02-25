'use client';

import { useState, useCallback } from 'react';
import { GameState, Card, Combination, Player } from '@/lib/types/game.types';
import * as gameLogic from '@/lib/utils/gameLogic';

export function useGameState() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [hasDrawnThisTurn, setHasDrawnThisTurn] = useState(false);

  const getCurrentPlayer = useCallback((): Player | null => {
    if (!gameState) return null;
    return gameState.players[gameState.currentPlayerIndex];
  }, [gameState]);

  const initGame = useCallback((playerNames: string[]) => {
    setGameState(gameLogic.initGame(playerNames));
    setHasDrawnThisTurn(false);
  }, []);

  const drawFromDeck = useCallback(() => {
    setGameState((prev) => {
      if (!prev || hasDrawnThisTurn) return prev;
      const current = prev.players[prev.currentPlayerIndex];
      setHasDrawnThisTurn(true);
      return gameLogic.drawFromDeck(prev, current.id);
    });
  }, [hasDrawnThisTurn]);

  const drawFromDiscard = useCallback(() => {
    setGameState((prev) => {
      if (!prev || hasDrawnThisTurn) return prev;
      const current = prev.players[prev.currentPlayerIndex];
      setHasDrawnThisTurn(true);
      return gameLogic.drawFromDiscard(prev, current.id);
    });
  }, [hasDrawnThisTurn]);

  const discardCard = useCallback(
    (card: Card) => {
      setGameState((prev) => {
        if (!prev || !hasDrawnThisTurn) return prev;
        const current = prev.players[prev.currentPlayerIndex];
        let next = gameLogic.discardCard(prev, current.id, card);
        next = gameLogic.checkRoundEnd(next);
        if (next.phase === 'playing') {
          next = gameLogic.nextTurn(next);
        } else {
          next = gameLogic.checkGameEnd(next);
        }
        return next;
      });
      setHasDrawnThisTurn(false);
    },
    [hasDrawnThisTurn],
  );

  const meldCombinations = useCallback((combinations: Combination[]) => {
    setGameState((prev) => {
      if (!prev) return prev;
      const current = prev.players[prev.currentPlayerIndex];
      let next = gameLogic.meldCombinations(prev, current.id, combinations);
      // Check if melding left the player with 0 cards
      next = gameLogic.checkRoundEnd(next);
      if (next.phase === 'roundEnd') {
        next = gameLogic.checkGameEnd(next);
      }
      return next;
    });
  }, []);

  const addToCombination = useCallback(
    (targetPlayerId: string, combinationIndex: number, card: Card, position?: 'start' | 'end') => {
      setGameState((prev) => {
        if (!prev) return prev;
        const current = prev.players[prev.currentPlayerIndex];
        let next = gameLogic.addToCombination(
          prev,
          current.id,
          targetPlayerId,
          combinationIndex,
          card,
          position,
        );
        // Check if adding left the player with 0 cards
        next = gameLogic.checkRoundEnd(next);
        if (next.phase === 'roundEnd') {
          next = gameLogic.checkGameEnd(next);
        }
        return next;
      });
    },
    [],
  );

  const substituteJoker = useCallback(
    (targetPlayerId: string, combinationIndex: number, card: Card, jokerId: string) => {
      setGameState((prev) => {
        if (!prev) return prev;
        const current = prev.players[prev.currentPlayerIndex];
        let next = gameLogic.substituteJoker(
          prev,
          current.id,
          targetPlayerId,
          combinationIndex,
          card,
          jokerId,
        );
        next = gameLogic.checkRoundEnd(next);
        if (next.phase === 'roundEnd') {
          next = gameLogic.checkGameEnd(next);
        }
        return next;
      });
    },
    [],
  );

  const claimDiscard = useCallback((playerId: string) => {
    setGameState((prev) => {
      if (!prev) return prev;
      return gameLogic.claimDiscard(prev, playerId);
    });
  }, []);

  const nextRound = useCallback(() => {
    setGameState((prev) => {
      if (!prev) return prev;
      return gameLogic.startRound(prev);
    });
    setHasDrawnThisTurn(false);
  }, []);

  const resetGame = useCallback(() => {
    setGameState(null);
    setHasDrawnThisTurn(false);
  }, []);

  return {
    gameState,
    hasDrawnThisTurn,
    initGame,
    drawFromDeck,
    drawFromDiscard,
    discardCard,
    meldCombinations,
    addToCombination,
    substituteJoker,
    claimDiscard,
    nextRound,
    resetGame,
    getCurrentPlayer,
  };
}
