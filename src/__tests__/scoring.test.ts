import { describe, it, expect } from 'vitest';
import { calculateHandScore, calculateRoundScores } from '../lib/utils/scoring';
import { CardModel } from '../lib/models/Card';
import { Player } from '../lib/types/game.types';

describe('Scoring', () => {
  describe('calculateHandScore', () => {
    it('debe sumar puntos correctamente', () => {
      const cards = [
        CardModel.create(1, 'hearts'),  // 1
        CardModel.create(5, 'diamonds'), // 5
        CardModel.create(13, 'clubs'),   // 10
      ];
      expect(calculateHandScore(cards)).toBe(16);
    });

    it('debe retornar 0 para mano vacía', () => {
      expect(calculateHandScore([])).toBe(0);
    });

    it('debe sumar 25 puntos por joker', () => {
      const cards = [
        CardModel.create(5, 'hearts'),  // 5
        CardModel.createJoker(1),        // 25
      ];
      expect(calculateHandScore(cards)).toBe(30);
    });
  });

  describe('calculateRoundScores', () => {
    it('debe actualizar scores de todos los jugadores', () => {
      const players: Player[] = [
        {
          id: 'p1',
          name: 'Juan',
          hand: [CardModel.create(5, 'hearts')],
          hasMelded: true,
          meldedCombinations: [],
          roundScore: 0,
          totalScore: 10,
        },
        {
          id: 'p2',
          name: 'María',
          hand: [],
          hasMelded: true,
          meldedCombinations: [],
          roundScore: 0,
          totalScore: 5,
        },
      ];

      const result = calculateRoundScores(players);

      expect(result[0].roundScore).toBe(5);
      expect(result[0].totalScore).toBe(15);
      expect(result[1].roundScore).toBe(0);
      expect(result[1].totalScore).toBe(5);
    });

    it('no debe mutar jugadores originales', () => {
      const players: Player[] = [
        {
          id: 'p1',
          name: 'Juan',
          hand: [CardModel.create(5, 'hearts')],
          hasMelded: false,
          meldedCombinations: [],
          roundScore: 0,
          totalScore: 0,
        },
      ];

      calculateRoundScores(players);
      expect(players[0].totalScore).toBe(0);
    });
  });
});
