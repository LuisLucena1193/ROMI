import { describe, it, expect } from 'vitest';
import {
  initGame,
  drawFromDeck,
  drawFromDiscard,
  discardCard,
  meldCombinations,
  addToCombination,
  checkRoundEnd,
  checkGameEnd,
  nextTurn,
  startRound,
} from '../lib/utils/gameLogic';
import { CardModel } from '../lib/models/Card';
import { Combination, GameState } from '../lib/types/game.types';

describe('Game Logic', () => {
  describe('initGame', () => {
    it('debe inicializar juego con jugadores correctamente', () => {
      const state = initGame(['Juan', 'María', 'Pedro']);

      expect(state.players).toHaveLength(3);
      // Order is randomized, so just verify all names are present
      const names = state.players.map((p) => p.name);
      expect(names).toContain('Juan');
      expect(names).toContain('María');
      expect(names).toContain('Pedro');
    });

    it('debe repartir 10 cartas a cada jugador', () => {
      const state = initGame(['Juan', 'María']);

      expect(state.players[0].hand).toHaveLength(10);
      expect(state.players[1].hand).toHaveLength(10);
    });

    it('debe colocar 1 carta en el descarte', () => {
      const state = initGame(['Juan', 'María']);
      expect(state.discardPile).toHaveLength(1);
    });

    it('debe configurar estado inicial correctamente', () => {
      const state = initGame(['Juan', 'María']);

      expect(state.currentRound).toBe(1);
      expect(state.currentPlayerIndex).toBe(0);
      expect(state.phase).toBe('playing');
      expect(state.winner).toBeNull();
    });

    it('debe tener 54 cartas en total para 2 jugadores (manos + deck + descarte)', () => {
      const state = initGame(['Juan', 'María']);
      const totalCards =
        state.players.reduce((sum, p) => sum + p.hand.length, 0) +
        state.deck.length +
        state.discardPile.length;
      expect(totalCards).toBe(54);
    });

    it('debe tener 108 cartas en total para 3 jugadores', () => {
      const state = initGame(['Juan', 'María', 'Pedro']);
      const totalCards =
        state.players.reduce((sum, p) => sum + p.hand.length, 0) +
        state.deck.length +
        state.discardPile.length;
      expect(totalCards).toBe(108);
    });

    it('debe rechazar menos de 2 jugadores', () => {
      expect(() => initGame(['Solo'])).toThrow();
    });
  });

  describe('drawFromDeck', () => {
    it('debe dar 1 carta al jugador actual', () => {
      const state = initGame(['Juan', 'María']);
      const playerId = state.players[0].id;
      const deckSize = state.deck.length;

      const newState = drawFromDeck(state, playerId);

      expect(newState.players[0].hand).toHaveLength(11);
      expect(newState.deck).toHaveLength(deckSize - 1);
    });

    it('debe rechazar si no es turno del jugador', () => {
      const state = initGame(['Juan', 'María']);
      const wrongPlayerId = state.players[1].id;

      expect(() => drawFromDeck(state, wrongPlayerId)).toThrow();
    });

    it('no debe mutar el estado original', () => {
      const state = initGame(['Juan', 'María']);
      const originalHandLength = state.players[0].hand.length;

      drawFromDeck(state, state.players[0].id);

      expect(state.players[0].hand).toHaveLength(originalHandLength);
    });
  });

  describe('drawFromDiscard', () => {
    it('debe tomar carta del tope del descarte', () => {
      const state = initGame(['Juan', 'María']);
      const playerId = state.players[0].id;
      const topCard = state.discardPile[state.discardPile.length - 1];

      const newState = drawFromDiscard(state, playerId);

      expect(newState.players[0].hand).toHaveLength(11);
      expect(newState.players[0].hand).toContainEqual(topCard);
      expect(newState.discardPile).toHaveLength(0);
    });
  });

  describe('discardCard', () => {
    it('debe mover carta de la mano al descarte', () => {
      const state = initGame(['Juan', 'María']);
      const playerId = state.players[0].id;
      const cardToDiscard = state.players[0].hand[0];

      // First draw a card so player has 11
      const afterDraw = drawFromDeck(state, playerId);
      const newState = discardCard(afterDraw, playerId, cardToDiscard);

      expect(newState.players[0].hand).toHaveLength(10);
      expect(newState.discardPile[newState.discardPile.length - 1]).toEqual(cardToDiscard);
    });

    it('debe rechazar carta que no está en la mano', () => {
      const state = initGame(['Juan', 'María']);
      const playerId = state.players[0].id;
      const fakeCard = CardModel.create(1, 'hearts');

      // The card might actually be in hand, so create one that definitely isn't
      // by using a card from the other player's hand
      const otherCard = state.players[1].hand[0];
      // This might still be rejected or not depending on if same card value exists
      // Better test: just ensure error for a card clearly not in hand
      expect(() =>
        discardCard(state, playerId, { ...fakeCard, id: 'nonexistent-card' })
      ).toThrow();
    });
  });

  describe('nextTurn', () => {
    it('debe avanzar al siguiente jugador', () => {
      const state = initGame(['Juan', 'María', 'Pedro']);
      expect(state.currentPlayerIndex).toBe(0);

      const next1 = nextTurn(state);
      expect(next1.currentPlayerIndex).toBe(1);

      const next2 = nextTurn(next1);
      expect(next2.currentPlayerIndex).toBe(2);
    });

    it('debe hacer wrap-around al primer jugador', () => {
      const state = initGame(['Juan', 'María']);
      const next1 = nextTurn(state);
      expect(next1.currentPlayerIndex).toBe(1);

      const next2 = nextTurn(next1);
      expect(next2.currentPlayerIndex).toBe(0);
    });
  });

  describe('checkRoundEnd', () => {
    it('debe detectar fin de ronda cuando un jugador no tiene cartas', () => {
      const state = initGame(['Juan', 'María']);
      // Manually empty a player's hand
      const modifiedState: GameState = {
        ...state,
        players: state.players.map((p, i) =>
          i === 0 ? { ...p, hand: [] } : p
        ),
      };

      const result = checkRoundEnd(modifiedState);
      expect(result.phase).toBe('roundEnd');
    });

    it('no debe cambiar fase si todos tienen cartas', () => {
      const state = initGame(['Juan', 'María']);
      const result = checkRoundEnd(state);
      expect(result.phase).toBe('playing');
    });
  });

  describe('checkGameEnd', () => {
    it('debe detectar fin de juego en ronda 4 con phase roundEnd', () => {
      const state = initGame(['Juan', 'María']);
      const endState: GameState = {
        ...state,
        currentRound: 4,
        phase: 'roundEnd',
        players: state.players.map((p, i) => ({
          ...p,
          totalScore: i === 0 ? 10 : 30,
        })),
      };

      const result = checkGameEnd(endState);
      expect(result.phase).toBe('gameEnd');
      expect(result.winner).toBe(state.players[0].id);
    });

    it('no debe terminar juego si no es ronda 4', () => {
      const state = initGame(['Juan', 'María']);
      const midState: GameState = {
        ...state,
        currentRound: 2,
        phase: 'roundEnd',
      };

      const result = checkGameEnd(midState);
      expect(result.phase).toBe('roundEnd');
      expect(result.winner).toBeNull();
    });
  });

  describe('startRound', () => {
    it('debe iniciar nueva ronda incrementando el número', () => {
      const state = initGame(['Juan', 'María']);
      const modifiedState: GameState = {
        ...state,
        currentRound: 1,
        phase: 'roundEnd',
      };

      const newRound = startRound(modifiedState);
      expect(newRound.currentRound).toBe(2);
      expect(newRound.phase).toBe('playing');
    });

    it('debe repartir 10 cartas frescas a cada jugador', () => {
      const state = initGame(['Juan', 'María']);
      const newRound = startRound(state);

      expect(newRound.players[0].hand).toHaveLength(10);
      expect(newRound.players[1].hand).toHaveLength(10);
      expect(newRound.players[0].hasMelded).toBe(false);
    });
  });

  describe('meldCombinations', () => {
    it('debe rechazar si jugador ya se bajó', () => {
      const state = initGame(['Juan', 'María']);
      const modifiedState: GameState = {
        ...state,
        players: state.players.map((p, i) =>
          i === 0 ? { ...p, hasMelded: true } : p
        ),
      };

      expect(() =>
        meldCombinations(modifiedState, state.players[0].id, [])
      ).toThrow('already melded');
    });
  });
});
