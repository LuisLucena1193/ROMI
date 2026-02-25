import { Card, Suit } from '../types/game.types';

const SUIT_ORDER: Record<Suit, number> = {
  spades: 0,
  hearts: 1,
  diamonds: 2,
  clubs: 3,
  joker: 4,
};

const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
  joker: '★',
};

export class CardModel {
  static create(value: number, suit: Suit): Card {
    if (value < 1 || value > 13 || !Number.isInteger(value)) {
      throw new Error(`Invalid card value: ${value}. Must be integer 1-13.`);
    }
    return {
      value,
      suit,
      id: `${value}-${suit}`,
    };
  }

  static createJoker(index: number): Card {
    return {
      value: 0,
      suit: 'joker',
      id: `joker-${index}`,
    };
  }

  static isJoker(card: Card): boolean {
    return card.suit === 'joker';
  }

  static getId(card: Card): string {
    return card.id;
  }

  static getDisplayValue(card: Card): string {
    if (card.value === 0) return '★';
    switch (card.value) {
      case 1: return 'A';
      case 11: return 'J';
      case 12: return 'Q';
      case 13: return 'K';
      default: return String(card.value);
    }
  }

  static getSuitSymbol(suit: Suit): string {
    return SUIT_SYMBOLS[suit];
  }

  static getPointValue(card: Card): number {
    if (card.value === 0) return 25;
    if (card.value === 1) return 1;
    if (card.value >= 11) return 10;
    return card.value;
  }

  static compare(a: Card, b: Card): number {
    const suitDiff = SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
    if (suitDiff !== 0) return suitDiff;
    return a.value - b.value;
  }
}
