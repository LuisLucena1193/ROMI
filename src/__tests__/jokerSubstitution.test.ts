import { describe, it, expect } from 'vitest';
import { CombinationModel } from '../lib/models/Combination';
import { CardModel } from '../lib/models/Card';
import { Combination, Card } from '../lib/types/game.types';
import * as gameLogic from '../lib/utils/gameLogic';

describe('resolveJokerMappings', () => {
  it('returns empty for no jokers', () => {
    const cards = [
      CardModel.create(3, 'hearts'),
      CardModel.create(4, 'hearts'),
      CardModel.create(5, 'hearts'),
      CardModel.create(6, 'hearts'),
    ];
    expect(CombinationModel.resolveJokerMappings(cards)).toEqual([]);
  });

  it('returns empty for all jokers', () => {
    const cards = [
      CardModel.createJoker(1),
      CardModel.createJoker(2),
      CardModel.createJoker(3),
      CardModel.createJoker(4),
    ];
    expect(CombinationModel.resolveJokerMappings(cards)).toEqual([]);
  });

  it('resolves joker filling internal gap', () => {
    // 3♥, Joker, 5♥, 6♥ → joker = 4♥
    const cards = [
      CardModel.create(3, 'hearts'),
      CardModel.createJoker(1),
      CardModel.create(5, 'hearts'),
      CardModel.create(6, 'hearts'),
    ];
    const mappings = CombinationModel.resolveJokerMappings(cards);
    expect(mappings).toHaveLength(1);
    expect(mappings[0]).toEqual({
      jokerId: 'joker-1',
      replacesValue: 4,
      replacesSuit: 'hearts',
    });
  });

  it('resolves joker extending up at the end', () => {
    // 3♥, 4♥, 5♥, Joker → joker = 6♥
    const cards = [
      CardModel.create(3, 'hearts'),
      CardModel.create(4, 'hearts'),
      CardModel.create(5, 'hearts'),
      CardModel.createJoker(1),
    ];
    const mappings = CombinationModel.resolveJokerMappings(cards);
    expect(mappings).toHaveLength(1);
    expect(mappings[0]).toEqual({
      jokerId: 'joker-1',
      replacesValue: 6,
      replacesSuit: 'hearts',
    });
  });

  it('resolves joker extending down at the start', () => {
    // Joker, 4♥, 5♥, 6♥ → joker = 3♥
    const cards = [
      CardModel.createJoker(1),
      CardModel.create(4, 'hearts'),
      CardModel.create(5, 'hearts'),
      CardModel.create(6, 'hearts'),
    ];
    const mappings = CombinationModel.resolveJokerMappings(cards);
    expect(mappings).toHaveLength(1);
    expect(mappings[0]).toEqual({
      jokerId: 'joker-1',
      replacesValue: 3,
      replacesSuit: 'hearts',
    });
  });

  it('resolves two jokers: one gap + one extend', () => {
    // 3♥, Joker1, 5♥, Joker2 → joker1=4♥ (gap), joker2=6♥ (extend up)
    const cards = [
      CardModel.create(3, 'hearts'),
      CardModel.createJoker(1),
      CardModel.create(5, 'hearts'),
      CardModel.createJoker(2),
    ];
    const mappings = CombinationModel.resolveJokerMappings(cards);
    expect(mappings).toHaveLength(2);
    expect(mappings.find((m) => m.jokerId === 'joker-1')).toEqual({
      jokerId: 'joker-1',
      replacesValue: 4,
      replacesSuit: 'hearts',
    });
    expect(mappings.find((m) => m.jokerId === 'joker-2')).toEqual({
      jokerId: 'joker-2',
      replacesValue: 6,
      replacesSuit: 'hearts',
    });
  });

  it('resolves ace-high sequence with joker (Joker, Q, K, A)', () => {
    const cards = [
      CardModel.createJoker(1),
      CardModel.create(12, 'hearts'),
      CardModel.create(13, 'hearts'),
      CardModel.create(1, 'hearts'),
    ];
    const mappings = CombinationModel.resolveJokerMappings(cards);
    expect(mappings).toHaveLength(1);
    expect(mappings[0]).toEqual({
      jokerId: 'joker-1',
      replacesValue: 11,
      replacesSuit: 'hearts',
    });
  });
});

describe('sortSequenceCards', () => {
  it('sorts sequence with joker filling a gap', () => {
    // Input: 5♥, Joker, 3♥, 6♥ → 3♥, Joker(=4), 5♥, 6♥
    const cards = [
      CardModel.create(5, 'hearts'),
      CardModel.createJoker(1),
      CardModel.create(3, 'hearts'),
      CardModel.create(6, 'hearts'),
    ];
    const sorted = CombinationModel.sortSequenceCards(cards);
    expect(sorted[0].value).toBe(3);
    expect(sorted[1].id).toBe('joker-1');
    expect(sorted[2].value).toBe(5);
    expect(sorted[3].value).toBe(6);
  });

  it('sorts sequence without jokers normally', () => {
    const cards = [
      CardModel.create(6, 'hearts'),
      CardModel.create(4, 'hearts'),
      CardModel.create(5, 'hearts'),
      CardModel.create(3, 'hearts'),
    ];
    const sorted = CombinationModel.sortSequenceCards(cards);
    expect(sorted.map((c) => c.value)).toEqual([3, 4, 5, 6]);
  });
});

describe('canSubstituteJoker', () => {
  it('returns jokerId when card matches a joker mapping', () => {
    const combo: Combination = {
      type: 'sequence',
      cards: [
        CardModel.create(3, 'hearts'),
        CardModel.createJoker(1),
        CardModel.create(5, 'hearts'),
        CardModel.create(6, 'hearts'),
      ],
      jokerMappings: [
        { jokerId: 'joker-1', replacesValue: 4, replacesSuit: 'hearts' },
      ],
    };
    const card = CardModel.create(4, 'hearts');
    expect(CombinationModel.canSubstituteJoker(combo, card)).toBe('joker-1');
  });

  it('returns null when card does not match', () => {
    const combo: Combination = {
      type: 'sequence',
      cards: [
        CardModel.create(3, 'hearts'),
        CardModel.createJoker(1),
        CardModel.create(5, 'hearts'),
        CardModel.create(6, 'hearts'),
      ],
      jokerMappings: [
        { jokerId: 'joker-1', replacesValue: 4, replacesSuit: 'hearts' },
      ],
    };
    const card = CardModel.create(7, 'hearts');
    expect(CombinationModel.canSubstituteJoker(combo, card)).toBeNull();
  });

  it('returns null for trios', () => {
    const combo: Combination = {
      type: 'trio',
      cards: [
        CardModel.create(7, 'hearts'),
        CardModel.create(7, 'diamonds'),
        CardModel.createJoker(1),
      ],
    };
    const card = CardModel.create(7, 'clubs');
    expect(CombinationModel.canSubstituteJoker(combo, card)).toBeNull();
  });

  it('returns null for joker cards', () => {
    const combo: Combination = {
      type: 'sequence',
      cards: [
        CardModel.create(3, 'hearts'),
        CardModel.createJoker(1),
        CardModel.create(5, 'hearts'),
        CardModel.create(6, 'hearts'),
      ],
      jokerMappings: [
        { jokerId: 'joker-1', replacesValue: 4, replacesSuit: 'hearts' },
      ],
    };
    expect(CombinationModel.canSubstituteJoker(combo, CardModel.createJoker(2))).toBeNull();
  });
});

describe('substituteJoker (CombinationModel)', () => {
  it('replaces joker with real card and returns joker', () => {
    const combo: Combination = {
      type: 'sequence',
      cards: [
        CardModel.create(3, 'hearts'),
        CardModel.createJoker(1),
        CardModel.create(5, 'hearts'),
        CardModel.create(6, 'hearts'),
      ],
      jokerMappings: [
        { jokerId: 'joker-1', replacesValue: 4, replacesSuit: 'hearts' },
      ],
    };
    const realCard = CardModel.create(4, 'hearts');
    const result = CombinationModel.substituteJoker(combo, realCard, 'joker-1');

    // Joker should be returned
    expect(result.jokerCard.id).toBe('joker-1');

    // Combination should now have the real card, no jokers
    expect(result.combination.cards.find((c) => c.id === '4-hearts')).toBeTruthy();
    expect(result.combination.cards.find((c) => c.id === 'joker-1')).toBeFalsy();
    expect(result.combination.jokerMappings).toBeUndefined();
  });

  it('recomputes mappings when other jokers remain', () => {
    const combo: Combination = {
      type: 'sequence',
      cards: [
        CardModel.create(3, 'hearts'),
        CardModel.createJoker(1),
        CardModel.createJoker(2),
        CardModel.create(6, 'hearts'),
      ],
      jokerMappings: [
        { jokerId: 'joker-1', replacesValue: 4, replacesSuit: 'hearts' },
        { jokerId: 'joker-2', replacesValue: 5, replacesSuit: 'hearts' },
      ],
    };
    const realCard = CardModel.create(4, 'hearts');
    const result = CombinationModel.substituteJoker(combo, realCard, 'joker-1');

    expect(result.jokerCard.id).toBe('joker-1');
    expect(result.combination.jokerMappings).toHaveLength(1);
    expect(result.combination.jokerMappings![0].jokerId).toBe('joker-2');
    expect(result.combination.jokerMappings![0].replacesValue).toBe(5);
  });
});

describe('substituteJoker (gameLogic)', () => {
  it('substitutes joker in game state', () => {
    // Set up a game state where player-0 has melded with a joker
    const state = gameLogic.initGame(['Alice', 'Bob']);

    // Manually set up the state
    const joker = CardModel.createJoker(1);
    const realCard = CardModel.create(4, 'hearts');

    const meldedCombo: Combination = {
      type: 'sequence',
      cards: [
        CardModel.create(3, 'hearts'),
        joker,
        CardModel.create(5, 'hearts'),
        CardModel.create(6, 'hearts'),
      ],
      jokerMappings: [
        { jokerId: 'joker-1', replacesValue: 4, replacesSuit: 'hearts' },
      ],
    };

    const modifiedState: typeof state = {
      ...state,
      players: state.players.map((p, i) => {
        if (i === 0) {
          return {
            ...p,
            hasMelded: true,
            meldedCombinations: [meldedCombo],
            hand: [realCard, CardModel.create(10, 'spades')],
          };
        }
        return p;
      }),
    };

    const newState = gameLogic.substituteJoker(
      modifiedState,
      'player-0',
      'player-0',
      0,
      realCard,
      'joker-1',
    );

    const player = newState.players[0];
    // Real card removed from hand, joker added
    expect(player.hand.find((c) => c.id === '4-hearts')).toBeFalsy();
    expect(player.hand.find((c) => c.id === 'joker-1')).toBeTruthy();

    // Combination updated
    const combo = player.meldedCombinations[0];
    expect(combo.cards.find((c) => c.id === '4-hearts')).toBeTruthy();
    expect(combo.cards.find((c) => c.id === 'joker-1')).toBeFalsy();
  });

  it('throws if player has not melded', () => {
    const state = gameLogic.initGame(['Alice', 'Bob']);
    const card = CardModel.create(4, 'hearts');

    expect(() =>
      gameLogic.substituteJoker(state, 'player-0', 'player-0', 0, card, 'joker-1'),
    ).toThrow('Player must meld before substituting jokers.');
  });

  it('throws if card not in hand', () => {
    const state = gameLogic.initGame(['Alice', 'Bob']);
    const card = CardModel.create(4, 'hearts');

    const modifiedState = {
      ...state,
      players: state.players.map((p, i) =>
        i === 0
          ? { ...p, hasMelded: true, meldedCombinations: [], hand: [] }
          : p,
      ),
    };

    expect(() =>
      gameLogic.substituteJoker(modifiedState, 'player-0', 'player-0', 0, card, 'joker-1'),
    ).toThrow(`Player does not have card ${card.id}.`);
  });

  it('throws for trio combination', () => {
    const card = CardModel.create(7, 'clubs');
    const state = gameLogic.initGame(['Alice', 'Bob']);
    const modifiedState = {
      ...state,
      players: state.players.map((p, i) =>
        i === 0
          ? {
              ...p,
              hasMelded: true,
              hand: [card],
              meldedCombinations: [{
                type: 'trio' as const,
                cards: [
                  CardModel.create(7, 'hearts'),
                  CardModel.create(7, 'diamonds'),
                  CardModel.createJoker(1),
                ],
              }],
            }
          : p,
      ),
    };

    expect(() =>
      gameLogic.substituteJoker(modifiedState, 'player-0', 'player-0', 0, card, 'joker-1'),
    ).toThrow('Joker substitution only applies to sequences.');
  });
});

describe('meldCombinations computes jokerMappings', () => {
  it('adds jokerMappings to sequences with jokers when melding', () => {
    const state = gameLogic.initGame(['Alice', 'Bob']);

    const joker = CardModel.createJoker(1);
    const seqCards = [
      CardModel.create(3, 'hearts'),
      joker,
      CardModel.create(5, 'hearts'),
      CardModel.create(6, 'hearts'),
    ];
    const trioCards = [
      CardModel.create(7, 'diamonds'),
      CardModel.create(7, 'clubs'),
      CardModel.create(7, 'spades'),
    ];

    const modifiedState = {
      ...state,
      currentRound: 1 as const,
      players: state.players.map((p, i) =>
        i === 0
          ? { ...p, hand: [...seqCards, ...trioCards, CardModel.create(10, 'spades')] }
          : p,
      ),
    };

    const combos: Combination[] = [
      { type: 'trio', cards: trioCards },
      { type: 'sequence', cards: seqCards },
    ];

    const newState = gameLogic.meldCombinations(modifiedState, 'player-0', combos);
    const player = newState.players[0];

    // Trio should not have jokerMappings
    const trio = player.meldedCombinations.find((c) => c.type === 'trio')!;
    expect(trio.jokerMappings).toBeUndefined();

    // Sequence should have jokerMappings
    const seq = player.meldedCombinations.find((c) => c.type === 'sequence')!;
    expect(seq.jokerMappings).toHaveLength(1);
    expect(seq.jokerMappings![0]).toEqual({
      jokerId: 'joker-1',
      replacesValue: 4,
      replacesSuit: 'hearts',
    });
  });
});

describe('addCard computes jokerMappings for sequences', () => {
  it('adds jokerMappings when adding card to sequence with joker', () => {
    const combo: Combination = {
      type: 'sequence',
      cards: [
        CardModel.create(3, 'hearts'),
        CardModel.createJoker(1),
        CardModel.create(5, 'hearts'),
        CardModel.create(6, 'hearts'),
      ],
      jokerMappings: [
        { jokerId: 'joker-1', replacesValue: 4, replacesSuit: 'hearts' },
      ],
    };
    const card = CardModel.create(7, 'hearts');
    const result = CombinationModel.addCard(combo, card);
    expect(result.jokerMappings).toHaveLength(1);
    expect(result.jokerMappings![0].jokerId).toBe('joker-1');
  });

  it('does not add jokerMappings to trio', () => {
    const combo: Combination = {
      type: 'trio',
      cards: [
        CardModel.create(7, 'hearts'),
        CardModel.create(7, 'diamonds'),
        CardModel.create(7, 'clubs'),
      ],
    };
    const card = CardModel.createJoker(1);
    const result = CombinationModel.addCard(combo, card);
    expect(result.jokerMappings).toBeUndefined();
  });
});
