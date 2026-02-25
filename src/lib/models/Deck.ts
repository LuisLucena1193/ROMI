import { Card, Suit } from '../types/game.types';
import { CardModel } from './Card';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

export class DeckModel {
  static createDeck(playerCount: number = 2): Card[] {
    const deckCount = playerCount > 2 ? 2 : 1;
    const cards: Card[] = [];
    let jokerIndex = 1;

    for (let d = 1; d <= deckCount; d++) {
      const suffix = deckCount > 1 ? `-d${d}` : '';
      for (const suit of SUITS) {
        for (let value = 1; value <= 13; value++) {
          const card = CardModel.create(value, suit);
          cards.push({ ...card, id: `${card.id}${suffix}` });
        }
      }
      // 2 jokers per deck
      for (let j = 0; j < 2; j++) {
        cards.push(CardModel.createJoker(jokerIndex++));
      }
    }

    return cards;
  }

  static shuffle(cards: Card[]): Card[] {
    const shuffled = [...cards];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  static draw(deck: Card[], count: number): { drawn: Card[]; remaining: Card[] } {
    if (count > deck.length) {
      throw new Error(
        `Cannot draw ${count} cards from deck with ${deck.length} cards.`
      );
    }
    return {
      drawn: deck.slice(0, count),
      remaining: deck.slice(count),
    };
  }
}
