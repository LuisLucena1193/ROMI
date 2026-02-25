import { describe, it, expect } from 'vitest';
import { DeckModel } from '../lib/models/Deck';

describe('DeckModel', () => {
  describe('createDeck', () => {
    it('debe crear baraja de 54 cartas para 2 jugadores', () => {
      const deck = DeckModel.createDeck(2);
      expect(deck).toHaveLength(54);
    });

    it('debe crear baraja de 54 cartas por defecto', () => {
      const deck = DeckModel.createDeck();
      expect(deck).toHaveLength(54);
    });

    it('debe crear doble baraja de 108 cartas para 3 jugadores', () => {
      const deck = DeckModel.createDeck(3);
      expect(deck).toHaveLength(108);
    });

    it('debe crear doble baraja de 108 cartas para 4 jugadores', () => {
      const deck = DeckModel.createDeck(4);
      expect(deck).toHaveLength(108);
    });

    it('debe tener IDs únicos', () => {
      const deck = DeckModel.createDeck(2);
      const ids = new Set(deck.map((c) => c.id));
      expect(ids.size).toBe(54);
    });

    it('debe tener IDs únicos en doble baraja', () => {
      const deck = DeckModel.createDeck(3);
      const ids = new Set(deck.map((c) => c.id));
      expect(ids.size).toBe(108);
    });

    it('debe incluir jokers', () => {
      const deck = DeckModel.createDeck(2);
      const jokers = deck.filter((c) => c.suit === 'joker');
      expect(jokers).toHaveLength(2);
    });

    it('debe incluir 4 jokers en doble baraja', () => {
      const deck = DeckModel.createDeck(3);
      const jokers = deck.filter((c) => c.suit === 'joker');
      expect(jokers).toHaveLength(4);
    });
  });

  describe('shuffle', () => {
    it('debe retornar mismo número de cartas', () => {
      const deck = DeckModel.createDeck();
      const shuffled = DeckModel.shuffle(deck);
      expect(shuffled).toHaveLength(54);
    });

    it('no debe mutar array original', () => {
      const deck = DeckModel.createDeck();
      const original = [...deck];
      DeckModel.shuffle(deck);
      expect(deck).toEqual(original);
    });
  });

  describe('draw', () => {
    it('debe tomar N cartas del tope', () => {
      const deck = DeckModel.createDeck();
      const { drawn, remaining } = DeckModel.draw(deck, 5);
      expect(drawn).toHaveLength(5);
      expect(remaining).toHaveLength(49);
    });

    it('debe lanzar error si no hay suficientes cartas', () => {
      const deck = DeckModel.createDeck();
      expect(() => DeckModel.draw(deck, 55)).toThrow();
    });

    it('no debe mutar array original', () => {
      const deck = DeckModel.createDeck();
      const originalLength = deck.length;
      DeckModel.draw(deck, 5);
      expect(deck).toHaveLength(originalLength);
    });
  });
});
