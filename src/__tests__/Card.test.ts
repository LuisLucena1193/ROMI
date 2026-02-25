import { describe, it, expect } from 'vitest';
import { CardModel } from '../lib/models/Card';

describe('CardModel', () => {
  describe('create', () => {
    it('debe crear carta con valor y palo', () => {
      const card = CardModel.create(7, 'hearts');
      expect(card.value).toBe(7);
      expect(card.suit).toBe('hearts');
      expect(card.id).toBe('7-hearts');
    });

    it('debe rechazar valor fuera de rango', () => {
      expect(() => CardModel.create(0, 'hearts')).toThrow();
      expect(() => CardModel.create(14, 'hearts')).toThrow();
    });
  });

  describe('createJoker', () => {
    it('debe crear joker con valor 0 y suit joker', () => {
      const joker = CardModel.createJoker(1);
      expect(joker.value).toBe(0);
      expect(joker.suit).toBe('joker');
      expect(joker.id).toBe('joker-1');
    });

    it('debe crear jokers con IDs distintos', () => {
      const j1 = CardModel.createJoker(1);
      const j2 = CardModel.createJoker(2);
      expect(j1.id).not.toBe(j2.id);
    });
  });

  describe('isJoker', () => {
    it('debe retornar true para joker', () => {
      expect(CardModel.isJoker(CardModel.createJoker(1))).toBe(true);
    });

    it('debe retornar false para carta normal', () => {
      expect(CardModel.isJoker(CardModel.create(7, 'hearts'))).toBe(false);
    });
  });

  describe('getDisplayValue', () => {
    it('debe retornar A para As', () => {
      expect(CardModel.getDisplayValue(CardModel.create(1, 'hearts'))).toBe('A');
    });

    it('debe retornar J, Q, K para figuras', () => {
      expect(CardModel.getDisplayValue(CardModel.create(11, 'hearts'))).toBe('J');
      expect(CardModel.getDisplayValue(CardModel.create(12, 'hearts'))).toBe('Q');
      expect(CardModel.getDisplayValue(CardModel.create(13, 'hearts'))).toBe('K');
    });

    it('debe retornar número como string para 2-10', () => {
      expect(CardModel.getDisplayValue(CardModel.create(7, 'hearts'))).toBe('7');
    });

    it('debe retornar ★ para joker', () => {
      expect(CardModel.getDisplayValue(CardModel.createJoker(1))).toBe('★');
    });
  });

  describe('getSuitSymbol', () => {
    it('debe retornar símbolos Unicode correctos', () => {
      expect(CardModel.getSuitSymbol('hearts')).toBe('♥');
      expect(CardModel.getSuitSymbol('diamonds')).toBe('♦');
      expect(CardModel.getSuitSymbol('clubs')).toBe('♣');
      expect(CardModel.getSuitSymbol('spades')).toBe('♠');
    });

    it('debe retornar ★ para joker', () => {
      expect(CardModel.getSuitSymbol('joker')).toBe('★');
    });
  });

  describe('getPointValue', () => {
    it('debe retornar 1 para As', () => {
      expect(CardModel.getPointValue(CardModel.create(1, 'hearts'))).toBe(1);
    });

    it('debe retornar valor facial para 2-10', () => {
      expect(CardModel.getPointValue(CardModel.create(5, 'hearts'))).toBe(5);
    });

    it('debe retornar 10 para figuras', () => {
      expect(CardModel.getPointValue(CardModel.create(11, 'hearts'))).toBe(10);
      expect(CardModel.getPointValue(CardModel.create(12, 'hearts'))).toBe(10);
      expect(CardModel.getPointValue(CardModel.create(13, 'hearts'))).toBe(10);
    });

    it('debe retornar 25 para joker', () => {
      expect(CardModel.getPointValue(CardModel.createJoker(1))).toBe(25);
    });
  });

  describe('compare', () => {
    it('debe ordenar por palo primero', () => {
      const spade = CardModel.create(2, 'spades');
      const heart = CardModel.create(2, 'hearts');
      expect(CardModel.compare(spade, heart)).toBeLessThan(0);
    });

    it('debe ordenar por valor dentro del mismo palo', () => {
      const low = CardModel.create(3, 'hearts');
      const high = CardModel.create(10, 'hearts');
      expect(CardModel.compare(low, high)).toBeLessThan(0);
    });

    it('debe ordenar jokers al final', () => {
      const joker = CardModel.createJoker(1);
      const king = CardModel.create(13, 'spades');
      expect(CardModel.compare(king, joker)).toBeLessThan(0);
    });
  });
});
