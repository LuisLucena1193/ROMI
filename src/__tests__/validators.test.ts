import { describe, it, expect } from 'vitest';
import {
  isValidForRound,
  getRoundObjective,
  countTrios,
  countSequences,
} from '../lib/utils/validators';
import { CardModel } from '../lib/models/Card';
import { Combination } from '../lib/types/game.types';

function makeTrio(value: number): Combination {
  return {
    type: 'trio',
    cards: [
      CardModel.create(value, 'hearts'),
      CardModel.create(value, 'diamonds'),
      CardModel.create(value, 'clubs'),
    ],
  };
}

function makeSequence(startValue: number, suit: 'hearts' | 'diamonds' | 'clubs' | 'spades', length = 4): Combination {
  const cards = Array.from({ length }, (_, i) =>
    CardModel.create(startValue + i, suit)
  );
  return { type: 'sequence', cards };
}

describe('Validators', () => {
  describe('countTrios / countSequences', () => {
    it('debe contar tríos correctamente', () => {
      const combos = [makeTrio(7), makeTrio(5), makeSequence(3, 'hearts')];
      expect(countTrios(combos)).toBe(2);
      expect(countSequences(combos)).toBe(1);
    });
  });

  describe('isValidForRound', () => {
    it('ronda 1: 1 trío + 1 seguidilla', () => {
      expect(isValidForRound(1, [makeTrio(7), makeSequence(3, 'hearts')])).toBe(true);
    });

    it('ronda 1: rechaza 2 tríos', () => {
      expect(isValidForRound(1, [makeTrio(7), makeTrio(5)])).toBe(false);
    });

    it('ronda 2: 3 tríos', () => {
      expect(isValidForRound(2, [makeTrio(7), makeTrio(5), makeTrio(3)])).toBe(true);
    });

    it('ronda 2: rechaza 2 tríos + 1 seguidilla', () => {
      expect(isValidForRound(2, [makeTrio(7), makeTrio(5), makeSequence(3, 'hearts')])).toBe(false);
    });

    it('ronda 3: 2 seguidillas', () => {
      expect(isValidForRound(3, [makeSequence(3, 'hearts'), makeSequence(5, 'spades')])).toBe(true);
    });

    it('ronda 3: rechaza 1 seguidilla + 1 trío', () => {
      expect(isValidForRound(3, [makeSequence(3, 'hearts'), makeTrio(5)])).toBe(false);
    });

    it('ronda 4: 2 tríos + 1 seguidilla', () => {
      expect(isValidForRound(4, [makeTrio(7), makeTrio(5), makeSequence(3, 'hearts')])).toBe(true);
    });

    it('ronda 4: rechaza 3 tríos', () => {
      expect(isValidForRound(4, [makeTrio(7), makeTrio(5), makeTrio(3)])).toBe(false);
    });
  });

  describe('getRoundObjective', () => {
    it('debe retornar texto correcto para cada ronda', () => {
      expect(getRoundObjective(1)).toBe('1 trío y 1 seguidilla');
      expect(getRoundObjective(2)).toBe('3 tríos');
      expect(getRoundObjective(3)).toBe('2 seguidillas');
      expect(getRoundObjective(4)).toBe('2 tríos y 1 seguidilla');
    });
  });
});
