import { Card, Combination, JokerMapping, Suit } from '../types/game.types';
import { CardModel } from './Card';

export class CombinationModel {
  static isValidTrio(cards: Card[]): boolean {
    if (cards.length < 3) return false;

    const nonJokers = cards.filter((c) => !CardModel.isJoker(c));
    const jokerCount = cards.length - nonJokers.length;

    // All jokers: valid if total >= 3
    if (nonJokers.length === 0) return jokerCount >= 3;

    // All non-jokers must have the same value
    const targetValue = nonJokers[0].value;
    if (!nonJokers.every((c) => c.value === targetValue)) return false;

    return true;
  }

  static isValidSequence(cards: Card[]): boolean {
    if (cards.length < 4) return false;

    const nonJokers = cards.filter((c) => !CardModel.isJoker(c));
    const jokerCount = cards.length - nonJokers.length;

    // All jokers: valid if total >= 4
    if (nonJokers.length === 0) return jokerCount >= 4;

    // All non-jokers must be the same suit
    const suit = nonJokers[0].suit;
    if (!nonJokers.every((c) => c.suit === suit)) return false;

    // Sort non-joker values and check for duplicates
    const values = nonJokers.map((c) => c.value).sort((a, b) => a - b);
    for (let i = 1; i < values.length; i++) {
      if (values[i] === values[i - 1]) return false;
    }

    // Try ace-low (values as-is: A=1)
    if (CombinationModel.checkSequenceGaps(values, jokerCount)) return true;

    // Try ace-high (A=14) if ace is present
    if (values[0] === 1) {
      const highValues = [...values.slice(1), 14];
      if (CombinationModel.checkSequenceGaps(highValues, jokerCount)) return true;
    }

    return false;
  }

  private static checkSequenceGaps(sortedValues: number[], jokerCount: number): boolean {
    const minVal = sortedValues[0];
    const maxVal = sortedValues[sortedValues.length - 1];
    const gapsNeeded = (maxVal - minVal + 1) - sortedValues.length;
    return jokerCount >= gapsNeeded;
  }

  static canAddCard(combination: Combination, card: Card): boolean {
    // Jokers can always be added to any combination
    if (CardModel.isJoker(card)) return true;

    if (combination.type === 'trio') {
      const nonJokers = combination.cards.filter((c) => !CardModel.isJoker(c));
      // If combo is all jokers, any card value can be added
      if (nonJokers.length === 0) return true;
      return card.value === nonJokers[0].value;
    }

    // Sequence: add the card and re-validate
    const testCards = [...combination.cards, card];
    return CombinationModel.isValidSequence(testCards);
  }

  /**
   * Returns what value/suit a new joker would represent at each end of a sequence.
   * Returns null for an end that is already at the boundary (A at start, K at end).
   */
  static getJokerExtensionValues(combination: Combination): {
    start: { value: number; suit: Suit } | null;
    end: { value: number; suit: Suit } | null;
  } {
    if (combination.type !== 'sequence') return { start: null, end: null };
    const nonJokers = combination.cards.filter((c) => !CardModel.isJoker(c));
    if (nonJokers.length === 0) return { start: null, end: null };
    const suit = nonJokers[0].suit;
    const allValues = new Set<number>();
    for (const c of combination.cards) {
      if (!CardModel.isJoker(c)) allValues.add(c.value);
    }
    for (const m of combination.jokerMappings ?? []) {
      allValues.add(m.replacesValue);
    }
    const sorted = [...allValues].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    return {
      start: min > 1 ? { value: min - 1, suit } : null,
      end: max < 13 ? { value: max + 1, suit } : null,
    };
  }

  static addCard(combination: Combination, card: Card, position?: 'start' | 'end'): Combination {
    if (!CombinationModel.canAddCard(combination, card)) {
      throw new Error('Card cannot be added to this combination.');
    }
    if (combination.type === 'trio') {
      const newCards = [...combination.cards, card];
      // Sort: non-jokers by value first, jokers at the end
      const sorted = newCards.sort((a, b) => {
        const aJoker = CardModel.isJoker(a);
        const bJoker = CardModel.isJoker(b);
        if (aJoker && !bJoker) return 1;
        if (!aJoker && bJoker) return -1;
        return a.value - b.value;
      });
      return { type: 'trio', cards: sorted };
    }
    // Sequence: joker position in the array determines extension direction in resolveJokerMappings.
    // Prepend to extend downward (start), append to extend upward (end).
    const newCards =
      CardModel.isJoker(card) && position === 'start'
        ? [card, ...combination.cards]
        : [...combination.cards, card];
    const { cards: sorted, jokerMappings } = CombinationModel.sortWithMappings(newCards);
    return {
      type: 'sequence',
      cards: sorted,
      jokerMappings: jokerMappings.length > 0 ? jokerMappings : undefined,
    };
  }

  /**
   * Resolves what card each joker represents in a sequence.
   * Cards must be in positional order (order of selection matters for jokers).
   */
  static resolveJokerMappings(cards: Card[]): JokerMapping[] {
    const jokers = cards.filter((c) => CardModel.isJoker(c));
    const nonJokers = cards.filter((c) => !CardModel.isJoker(c));

    // All jokers or no jokers → no mappings
    if (nonJokers.length === 0 || jokers.length === 0) return [];

    const suit = nonJokers[0].suit as Suit;

    // Sort non-jokers by value (anchors)
    const anchors = [...nonJokers].sort((a, b) => a.value - b.value);
    const anchorValues = anchors.map((c) => c.value);

    // Try ace-low first, then ace-high
    let useAceHigh = false;
    if (!CombinationModel.checkSequenceGaps(anchorValues, jokers.length)) {
      if (anchorValues[0] === 1) {
        const highValues = [...anchorValues.slice(1), 14];
        if (CombinationModel.checkSequenceGaps(highValues, jokers.length)) {
          useAceHigh = true;
        }
      }
    }

    // Build effective anchor values
    const effectiveAnchors = useAceHigh
      ? anchorValues.map((v) => (v === 1 ? 14 : v))
      : [...anchorValues];
    effectiveAnchors.sort((a, b) => a - b);

    const minAnchor = effectiveAnchors[0];
    const maxAnchor = effectiveAnchors[effectiveAnchors.length - 1];

    // Find internal gaps between anchors
    const anchorSet = new Set(effectiveAnchors);
    const internalGaps: number[] = [];
    for (let v = minAnchor + 1; v < maxAnchor; v++) {
      if (!anchorSet.has(v)) internalGaps.push(v);
    }

    // Determine joker positions in original array
    // Find the index of the first non-joker in the original cards array
    const firstNonJokerIdx = cards.findIndex((c) => !CardModel.isJoker(c));
    const jokersBeforeFirstNonJoker: Card[] = [];
    const jokersAfterFirstNonJoker: Card[] = [];
    for (let i = 0; i < cards.length; i++) {
      if (!CardModel.isJoker(cards[i])) continue;
      if (i < firstNonJokerIdx) {
        jokersBeforeFirstNonJoker.push(cards[i]);
      } else {
        jokersAfterFirstNonJoker.push(cards[i]);
      }
    }

    const mappings: JokerMapping[] = [];
    // Assign internal gaps first (in order of all jokers by position)
    const allJokersOrdered = [...jokersBeforeFirstNonJoker, ...jokersAfterFirstNonJoker];
    let gapIdx = 0;
    const assignedJokerIds = new Set<string>();

    for (const joker of allJokersOrdered) {
      if (gapIdx < internalGaps.length) {
        const val = internalGaps[gapIdx];
        mappings.push({
          jokerId: joker.id,
          replacesValue: val === 14 ? 1 : val,
          replacesSuit: suit,
        });
        assignedJokerIds.add(joker.id);
        gapIdx++;
      }
    }

    // Remaining jokers: before first non-joker → extend down, after → extend up
    let downVal = minAnchor - 1;
    let upVal = maxAnchor + 1;

    for (const joker of jokersBeforeFirstNonJoker) {
      if (assignedJokerIds.has(joker.id)) continue;
      mappings.push({
        jokerId: joker.id,
        replacesValue: downVal === 14 ? 1 : downVal,
        replacesSuit: suit,
      });
      downVal--;
    }

    for (const joker of jokersAfterFirstNonJoker) {
      if (assignedJokerIds.has(joker.id)) continue;
      mappings.push({
        jokerId: joker.id,
        replacesValue: upVal === 14 ? 1 : upVal,
        replacesSuit: suit,
      });
      upVal++;
    }

    return mappings;
  }

  /**
   * Sorts sequence cards and computes joker mappings in a single pass.
   * This avoids the bug where sorting changes joker positions, causing
   * a subsequent resolveJokerMappings call to produce different results.
   */
  /** Sort non-joker sequence cards with ace-high awareness. */
  private static sortSequenceValues(cards: Card[]): Card[] {
    const values = new Set(cards.map((c) => c.value));
    const useAceHigh = values.has(1) && values.has(13) && !values.has(2);
    return [...cards].sort((a, b) => {
      const av = useAceHigh && a.value === 1 ? 14 : a.value;
      const bv = useAceHigh && b.value === 1 ? 14 : b.value;
      return av - bv;
    });
  }

  static sortWithMappings(cards: Card[]): { cards: Card[]; jokerMappings: JokerMapping[] } {
    const jokers = cards.filter((c) => CardModel.isJoker(c));
    if (jokers.length === 0 || jokers.length === cards.length) {
      return {
        cards: CombinationModel.sortSequenceValues(cards),
        jokerMappings: [],
      };
    }

    // Compute mappings on the ORIGINAL card order (position matters for extension direction)
    const mappings = CombinationModel.resolveJokerMappings(cards);
    const jokerValueMap = new Map<string, number>();
    for (const m of mappings) {
      jokerValueMap.set(m.jokerId, m.replacesValue);
    }

    // Determine if ace-high is in play by looking at ALL values (anchors + joker mappings).
    // If the full value set contains Ace(1) and King(13) but not 2, it's ace-high.
    const allValues = new Set<number>();
    for (const c of cards) {
      if (CardModel.isJoker(c)) {
        const mapped = jokerValueMap.get(c.id);
        if (mapped !== undefined) allValues.add(mapped);
      } else {
        allValues.add(c.value);
      }
    }
    const useAceHigh = allValues.has(1) && allValues.has(13) && !allValues.has(2);

    const getEffectiveValue = (card: Card): number => {
      if (CardModel.isJoker(card)) {
        const mapped = jokerValueMap.get(card.id);
        if (mapped !== undefined) {
          return useAceHigh && mapped === 1 ? 14 : mapped;
        }
        return 999;
      }
      return useAceHigh && card.value === 1 ? 14 : card.value;
    };

    const sorted = [...cards].sort((a, b) => getEffectiveValue(a) - getEffectiveValue(b));
    return { cards: sorted, jokerMappings: mappings };
  }

  /**
   * Sorts sequence cards with jokers in their correct positions (not at the end).
   */
  static sortSequenceCards(cards: Card[]): Card[] {
    return CombinationModel.sortWithMappings(cards).cards;
  }

  /**
   * Returns the jokerId if `card` can substitute a joker in the combination, or null.
   */
  static canSubstituteJoker(combination: Combination, card: Card): string | null {
    if (combination.type !== 'sequence') return null;
    if (!combination.jokerMappings || combination.jokerMappings.length === 0) return null;
    if (CardModel.isJoker(card)) return null;

    const match = combination.jokerMappings.find(
      (m) => m.replacesValue === card.value && m.replacesSuit === card.suit,
    );
    return match ? match.jokerId : null;
  }

  /**
   * Replaces a joker with the real card in a sequence combination.
   */
  static substituteJoker(
    combination: Combination,
    card: Card,
    jokerId: string,
  ): { combination: Combination; jokerCard: Card } {
    const jokerCard = combination.cards.find((c) => c.id === jokerId);
    if (!jokerCard) {
      throw new Error(`Joker ${jokerId} not found in combination.`);
    }

    // Swap: joker → real card (same position)
    const newCards = combination.cards.map((c) => (c.id === jokerId ? card : c));

    // Recompute joker mappings for remaining jokers
    const remainingJokers = newCards.filter((c) => CardModel.isJoker(c));
    let jokerMappings: JokerMapping[] | undefined;
    if (remainingJokers.length > 0) {
      const { cards: sorted, jokerMappings: mappings } = CombinationModel.sortWithMappings(newCards);
      jokerMappings = mappings.length > 0 ? mappings : undefined;
      return {
        combination: { type: 'sequence', cards: sorted, jokerMappings },
        jokerCard,
      };
    }

    // No more jokers — sort with ace-high awareness
    const sorted = CombinationModel.sortSequenceValues(newCards);
    return {
      combination: { type: 'sequence', cards: sorted },
      jokerCard,
    };
  }
}
