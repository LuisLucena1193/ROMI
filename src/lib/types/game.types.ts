export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades' | 'joker';
export type CombinationType = 'trio' | 'sequence';
export type GamePhase = 'setup' | 'playing' | 'roundEnd' | 'gameEnd';

export interface Card {
  value: number; // 1-13 (A=1, J=11, Q=12, K=13), 0 for joker
  suit: Suit;
  id: string; // único: "7-hearts"
}

export interface JokerMapping {
  jokerId: string;        // e.g. "joker-1"
  replacesValue: number;  // 1-13 (Card.value real)
  replacesSuit: Suit;     // suit of the sequence
}

export interface Combination {
  type: CombinationType;
  cards: Card[];
  jokerMappings?: JokerMapping[]; // only sequences with jokers
}

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  hasMelded: boolean;
  meldedCombinations: Combination[];
  roundScore: number;
  totalScore: number;
}

export interface GameState {
  players: Player[];
  currentRound: 1 | 2 | 3 | 4;
  currentPlayerIndex: number;
  deck: Card[];
  discardPile: Card[];
  phase: GamePhase;
  winner: string | null;
  // Discard-claim mechanic (3+ players): when the current player draws from
  // deck instead of discard, other players may claim the top discard card at
  // the cost of also drawing a penalty card and forfeiting their next turn.
  pendingClaimCard: Card | null;
  pendingClaimants: string[];       // player IDs who pressed "La quiero", in press order
  pendingSkipPlayerId: string | null; // whose upcoming turn is consumed by claiming
}
