import { describe, it, expect } from 'vitest';
import { CombinationModel } from '../lib/models/Combination';
import { CardModel } from '../lib/models/Card';
import { Combination } from '../lib/types/game.types';

describe('CombinationModel', () => {
  describe('isValidTrio', () => {
    it('debe validar trío de 3 cartas', () => {
      const cards = [
        CardModel.create(7, 'hearts'),
        CardModel.create(7, 'diamonds'),
        CardModel.create(7, 'clubs'),
      ];
      expect(CombinationModel.isValidTrio(cards)).toBe(true);
    });

    it('debe validar trío de 4 cartas', () => {
      const cards = [
        CardModel.create(7, 'hearts'),
        CardModel.create(7, 'diamonds'),
        CardModel.create(7, 'clubs'),
        CardModel.create(7, 'spades'),
      ];
      expect(CombinationModel.isValidTrio(cards)).toBe(true);
    });

    it('debe rechazar menos de 3 cartas', () => {
      const cards = [
        CardModel.create(7, 'hearts'),
        CardModel.create(7, 'diamonds'),
      ];
      expect(CombinationModel.isValidTrio(cards)).toBe(false);
    });

    it('debe rechazar cartas de valores diferentes', () => {
      const cards = [
        CardModel.create(7, 'hearts'),
        CardModel.create(8, 'diamonds'),
        CardModel.create(7, 'clubs'),
      ];
      expect(CombinationModel.isValidTrio(cards)).toBe(false);
    });

    it('debe validar trío con 1 joker + 2 cartas mismo valor', () => {
      const cards = [
        CardModel.create(7, 'hearts'),
        CardModel.create(7, 'diamonds'),
        CardModel.createJoker(1),
      ];
      expect(CombinationModel.isValidTrio(cards)).toBe(true);
    });

    it('debe validar trío con 2 jokers + 1 carta', () => {
      const cards = [
        CardModel.create(7, 'hearts'),
        CardModel.createJoker(1),
        CardModel.createJoker(2),
      ];
      expect(CombinationModel.isValidTrio(cards)).toBe(true);
    });

    it('debe validar trío de 3 jokers', () => {
      const cards = [
        CardModel.createJoker(1),
        CardModel.createJoker(2),
        CardModel.createJoker(3),
      ];
      expect(CombinationModel.isValidTrio(cards)).toBe(true);
    });

    it('debe rechazar trío con jokers si valores no coinciden', () => {
      const cards = [
        CardModel.create(7, 'hearts'),
        CardModel.create(8, 'diamonds'),
        CardModel.createJoker(1),
      ];
      expect(CombinationModel.isValidTrio(cards)).toBe(false);
    });
  });

  describe('isValidSequence', () => {
    it('debe validar seguidilla de 4 cartas', () => {
      const cards = [
        CardModel.create(4, 'spades'),
        CardModel.create(5, 'spades'),
        CardModel.create(6, 'spades'),
        CardModel.create(7, 'spades'),
      ];
      expect(CombinationModel.isValidSequence(cards)).toBe(true);
    });

    it('debe validar seguidilla de 5 cartas', () => {
      const cards = [
        CardModel.create(3, 'hearts'),
        CardModel.create(4, 'hearts'),
        CardModel.create(5, 'hearts'),
        CardModel.create(6, 'hearts'),
        CardModel.create(7, 'hearts'),
      ];
      expect(CombinationModel.isValidSequence(cards)).toBe(true);
    });

    it('debe validar seguidilla con As al inicio', () => {
      const cards = [
        CardModel.create(1, 'hearts'),
        CardModel.create(2, 'hearts'),
        CardModel.create(3, 'hearts'),
        CardModel.create(4, 'hearts'),
      ];
      expect(CombinationModel.isValidSequence(cards)).toBe(true);
    });

    it('debe validar seguidilla con As alto (J-Q-K-A)', () => {
      const cards = [
        CardModel.create(11, 'hearts'),
        CardModel.create(12, 'hearts'),
        CardModel.create(13, 'hearts'),
        CardModel.create(1, 'hearts'),
      ];
      expect(CombinationModel.isValidSequence(cards)).toBe(true);
    });

    it('debe validar seguidilla larga con As alto (10-J-Q-K-A)', () => {
      const cards = [
        CardModel.create(10, 'hearts'),
        CardModel.create(11, 'hearts'),
        CardModel.create(12, 'hearts'),
        CardModel.create(13, 'hearts'),
        CardModel.create(1, 'hearts'),
      ];
      expect(CombinationModel.isValidSequence(cards)).toBe(true);
    });

    it('debe rechazar wrap-around (Q-K-A-2)', () => {
      const cards = [
        CardModel.create(12, 'hearts'),
        CardModel.create(13, 'hearts'),
        CardModel.create(1, 'hearts'),
        CardModel.create(2, 'hearts'),
      ];
      expect(CombinationModel.isValidSequence(cards)).toBe(false);
    });

    it('debe rechazar wrap-around (K-A-2-3)', () => {
      const cards = [
        CardModel.create(13, 'hearts'),
        CardModel.create(1, 'hearts'),
        CardModel.create(2, 'hearts'),
        CardModel.create(3, 'hearts'),
      ];
      expect(CombinationModel.isValidSequence(cards)).toBe(false);
    });

    it('debe validar seguidilla As alto con joker (Joker-Q-K-A)', () => {
      const cards = [
        CardModel.createJoker(1),
        CardModel.create(12, 'hearts'),
        CardModel.create(13, 'hearts'),
        CardModel.create(1, 'hearts'),
      ];
      expect(CombinationModel.isValidSequence(cards)).toBe(true);
    });

    it('debe rechazar cartas de palos diferentes', () => {
      const cards = [
        CardModel.create(4, 'spades'),
        CardModel.create(5, 'hearts'),
        CardModel.create(6, 'spades'),
        CardModel.create(7, 'spades'),
      ];
      expect(CombinationModel.isValidSequence(cards)).toBe(false);
    });

    it('debe rechazar menos de 4 cartas', () => {
      const cards = [
        CardModel.create(4, 'spades'),
        CardModel.create(5, 'spades'),
        CardModel.create(6, 'spades'),
      ];
      expect(CombinationModel.isValidSequence(cards)).toBe(false);
    });

    it('debe rechazar cartas no consecutivas', () => {
      const cards = [
        CardModel.create(4, 'spades'),
        CardModel.create(5, 'spades'),
        CardModel.create(7, 'spades'),
        CardModel.create(8, 'spades'),
      ];
      expect(CombinationModel.isValidSequence(cards)).toBe(false);
    });

    it('debe validar cartas desordenadas si forman seguidilla', () => {
      const cards = [
        CardModel.create(7, 'diamonds'),
        CardModel.create(5, 'diamonds'),
        CardModel.create(6, 'diamonds'),
        CardModel.create(4, 'diamonds'),
      ];
      expect(CombinationModel.isValidSequence(cards)).toBe(true);
    });

    it('debe validar seguidilla con joker llenando gap', () => {
      // 3♥, Joker, 5♥, 6♥
      const cards = [
        CardModel.create(3, 'hearts'),
        CardModel.createJoker(1),
        CardModel.create(5, 'hearts'),
        CardModel.create(6, 'hearts'),
      ];
      expect(CombinationModel.isValidSequence(cards)).toBe(true);
    });

    it('debe validar seguidilla con joker extendiendo', () => {
      // 3♥, 4♥, 5♥, Joker (as 6)
      const cards = [
        CardModel.create(3, 'hearts'),
        CardModel.create(4, 'hearts'),
        CardModel.create(5, 'hearts'),
        CardModel.createJoker(1),
      ];
      expect(CombinationModel.isValidSequence(cards)).toBe(true);
    });

    it('debe validar seguidilla de solo jokers (4)', () => {
      const cards = [
        CardModel.createJoker(1),
        CardModel.createJoker(2),
        CardModel.createJoker(3),
        CardModel.createJoker(4),
      ];
      expect(CombinationModel.isValidSequence(cards)).toBe(true);
    });

    it('debe rechazar seguidilla con jokers si gap es demasiado grande', () => {
      // 3♥, Joker, 7♥, 8♥ — gap of 3, only 1 joker
      const cards = [
        CardModel.create(3, 'hearts'),
        CardModel.createJoker(1),
        CardModel.create(7, 'hearts'),
        CardModel.create(8, 'hearts'),
      ];
      expect(CombinationModel.isValidSequence(cards)).toBe(false);
    });

    it('debe rechazar seguidilla con jokers si palos no coinciden', () => {
      const cards = [
        CardModel.create(3, 'hearts'),
        CardModel.create(4, 'spades'),
        CardModel.createJoker(1),
        CardModel.createJoker(2),
      ];
      expect(CombinationModel.isValidSequence(cards)).toBe(false);
    });
  });

  describe('canAddCard', () => {
    it('debe permitir agregar carta a trío con mismo valor', () => {
      const combo: Combination = {
        type: 'trio',
        cards: [
          CardModel.create(7, 'hearts'),
          CardModel.create(7, 'diamonds'),
          CardModel.create(7, 'clubs'),
        ],
      };
      const card = CardModel.create(7, 'spades');
      expect(CombinationModel.canAddCard(combo, card)).toBe(true);
    });

    it('debe rechazar carta con valor diferente en trío', () => {
      const combo: Combination = {
        type: 'trio',
        cards: [
          CardModel.create(7, 'hearts'),
          CardModel.create(7, 'diamonds'),
          CardModel.create(7, 'clubs'),
        ],
      };
      const card = CardModel.create(8, 'spades');
      expect(CombinationModel.canAddCard(combo, card)).toBe(false);
    });

    it('debe permitir agregar carta consecutiva al final de seguidilla', () => {
      const combo: Combination = {
        type: 'sequence',
        cards: [
          CardModel.create(4, 'hearts'),
          CardModel.create(5, 'hearts'),
          CardModel.create(6, 'hearts'),
          CardModel.create(7, 'hearts'),
        ],
      };
      const card = CardModel.create(8, 'hearts');
      expect(CombinationModel.canAddCard(combo, card)).toBe(true);
    });

    it('debe permitir agregar carta consecutiva al inicio de seguidilla', () => {
      const combo: Combination = {
        type: 'sequence',
        cards: [
          CardModel.create(4, 'hearts'),
          CardModel.create(5, 'hearts'),
          CardModel.create(6, 'hearts'),
          CardModel.create(7, 'hearts'),
        ],
      };
      const card = CardModel.create(3, 'hearts');
      expect(CombinationModel.canAddCard(combo, card)).toBe(true);
    });

    it('debe rechazar carta de palo diferente en seguidilla', () => {
      const combo: Combination = {
        type: 'sequence',
        cards: [
          CardModel.create(4, 'hearts'),
          CardModel.create(5, 'hearts'),
          CardModel.create(6, 'hearts'),
          CardModel.create(7, 'hearts'),
        ],
      };
      const card = CardModel.create(8, 'spades');
      expect(CombinationModel.canAddCard(combo, card)).toBe(false);
    });

    it('debe permitir agregar joker a trío', () => {
      const combo: Combination = {
        type: 'trio',
        cards: [
          CardModel.create(7, 'hearts'),
          CardModel.create(7, 'diamonds'),
          CardModel.create(7, 'clubs'),
        ],
      };
      expect(CombinationModel.canAddCard(combo, CardModel.createJoker(1))).toBe(true);
    });

    it('debe permitir agregar joker a seguidilla', () => {
      const combo: Combination = {
        type: 'sequence',
        cards: [
          CardModel.create(4, 'hearts'),
          CardModel.create(5, 'hearts'),
          CardModel.create(6, 'hearts'),
          CardModel.create(7, 'hearts'),
        ],
      };
      expect(CombinationModel.canAddCard(combo, CardModel.createJoker(1))).toBe(true);
    });

    it('debe permitir agregar carta válida a trío con jokers', () => {
      const combo: Combination = {
        type: 'trio',
        cards: [
          CardModel.create(7, 'hearts'),
          CardModel.create(7, 'diamonds'),
          CardModel.createJoker(1),
        ],
      };
      const card = CardModel.create(7, 'spades');
      expect(CombinationModel.canAddCard(combo, card)).toBe(true);
    });

    it('debe rechazar carta inválida a trío con jokers', () => {
      const combo: Combination = {
        type: 'trio',
        cards: [
          CardModel.create(7, 'hearts'),
          CardModel.create(7, 'diamonds'),
          CardModel.createJoker(1),
        ],
      };
      const card = CardModel.create(8, 'spades');
      expect(CombinationModel.canAddCard(combo, card)).toBe(false);
    });

    it('debe permitir agregar carta válida a seguidilla con jokers', () => {
      const combo: Combination = {
        type: 'sequence',
        cards: [
          CardModel.create(3, 'hearts'),
          CardModel.createJoker(1),
          CardModel.create(5, 'hearts'),
          CardModel.create(6, 'hearts'),
        ],
      };
      // Adding 7♥ to extend
      const card = CardModel.create(7, 'hearts');
      expect(CombinationModel.canAddCard(combo, card)).toBe(true);
    });
  });

  describe('addCard', () => {
    it('debe retornar nueva combinación con carta agregada', () => {
      const combo: Combination = {
        type: 'trio',
        cards: [
          CardModel.create(7, 'hearts'),
          CardModel.create(7, 'diamonds'),
          CardModel.create(7, 'clubs'),
        ],
      };
      const card = CardModel.create(7, 'spades');
      const result = CombinationModel.addCard(combo, card);
      expect(result.cards).toHaveLength(4);
      expect(result).not.toBe(combo); // inmutabilidad
    });

    it('debe lanzar error si carta no es compatible', () => {
      const combo: Combination = {
        type: 'trio',
        cards: [
          CardModel.create(7, 'hearts'),
          CardModel.create(7, 'diamonds'),
          CardModel.create(7, 'clubs'),
        ],
      };
      const card = CardModel.create(8, 'spades');
      expect(() => CombinationModel.addCard(combo, card)).toThrow();
    });

    it('debe ordenar jokers al final', () => {
      const combo: Combination = {
        type: 'trio',
        cards: [
          CardModel.create(7, 'hearts'),
          CardModel.create(7, 'diamonds'),
          CardModel.createJoker(1),
        ],
      };
      const card = CardModel.create(7, 'spades');
      const result = CombinationModel.addCard(combo, card);
      expect(CardModel.isJoker(result.cards[result.cards.length - 1])).toBe(true);
    });
  });
});
