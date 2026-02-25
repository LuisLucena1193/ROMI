import { Card, Player } from '../types/game.types';
import { CardModel } from '../models/Card';

export function calculateHandScore(cards: Card[]): number {
  return cards.reduce((sum, card) => sum + CardModel.getPointValue(card), 0);
}

export function calculateRoundScores(players: Player[]): Player[] {
  return players.map((player) => {
    const roundScore = calculateHandScore(player.hand);
    return {
      ...player,
      roundScore,
      totalScore: player.totalScore + roundScore,
    };
  });
}
