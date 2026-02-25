import { GameState, Card, Combination } from '../types/game.types';
import { DeckModel } from '../models/Deck';
import { CombinationModel } from '../models/Combination';
import { CardModel } from '../models/Card';
import { isValidForRound } from './validators';
import { calculateRoundScores } from './scoring';

export function initGame(playerNames: string[]): GameState {
  if (playerNames.length < 2) {
    throw new Error('At least 2 players are required.');
  }

  // Randomize player order for the game (Fisher-Yates shuffle)
  const shuffledNames = [...playerNames];
  for (let i = shuffledNames.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledNames[i], shuffledNames[j]] = [shuffledNames[j], shuffledNames[i]];
  }

  const players = shuffledNames.map((name, i) => ({
    id: `player-${i}`,
    name,
    hand: [] as Card[],
    hasMelded: false,
    meldedCombinations: [] as Combination[],
    roundScore: 0,
    totalScore: 0,
  }));

  let deck = DeckModel.shuffle(DeckModel.createDeck(playerNames.length));

  // Deal 10 cards to each player
  for (const player of players) {
    const result = DeckModel.draw(deck, 10);
    player.hand = result.drawn;
    deck = result.remaining;
  }

  // Place 1 card in discard pile
  const discardResult = DeckModel.draw(deck, 1);

  return {
    players,
    currentRound: 1,
    currentPlayerIndex: 0,
    deck: discardResult.remaining,
    discardPile: discardResult.drawn,
    phase: 'playing',
    winner: null,
    pendingClaimCard: null,
    pendingClaimants: [],
    pendingSkipPlayerId: null,
  };
}

export function startRound(state: GameState): GameState {
  const nextRound = (state.currentRound + 1) as 1 | 2 | 3 | 4;

  let deck = DeckModel.shuffle(DeckModel.createDeck(state.players.length));

  const players = state.players.map((player) => {
    const result = DeckModel.draw(deck, 10);
    deck = result.remaining;
    return {
      ...player,
      hand: result.drawn,
      hasMelded: false,
      meldedCombinations: [],
      roundScore: 0,
    };
  });

  const discardResult = DeckModel.draw(deck, 1);

  return {
    ...state,
    players,
    currentRound: nextRound,
    // Rotate starting player: round 2 starts with index 1, round 3 with 2, etc.
    currentPlayerIndex: (nextRound - 1) % state.players.length,
    deck: discardResult.remaining,
    discardPile: discardResult.drawn,
    phase: 'playing',
    winner: null,
    pendingClaimCard: null,
    pendingClaimants: [],
    pendingSkipPlayerId: null,
  };
}

function validateCurrentPlayer(state: GameState, playerId: string): void {
  const currentPlayer = state.players[state.currentPlayerIndex];
  if (currentPlayer.id !== playerId) {
    throw new Error(`It's not ${playerId}'s turn.`);
  }
}

function recycleDeck(state: GameState): GameState {
  if (state.deck.length > 0) return state;
  if (state.discardPile.length <= 1) {
    throw new Error('No cards available to draw.');
  }
  // Keep the top discard card, shuffle the rest into a new deck
  const topDiscard = state.discardPile[state.discardPile.length - 1];
  const cardsToShuffle = state.discardPile.slice(0, -1);
  return {
    ...state,
    deck: DeckModel.shuffle(cardsToShuffle),
    discardPile: [topDiscard],
  };
}

export function drawFromDeck(
  state: GameState,
  playerId: string
): GameState {
  validateCurrentPlayer(state, playerId);

  const recycled = recycleDeck(state);
  const result = DeckModel.draw(recycled.deck, 1);
  const drawnCard = result.drawn[0];

  const players = recycled.players.map((p) =>
    p.id === playerId ? { ...p, hand: [...p.hand, drawnCard] } : p
  );

  // In 3+ player games, make the top of the discard pile available for claiming
  // by other players while the current player takes their turn.
  const pendingClaimCard =
    recycled.players.length >= 3 && recycled.discardPile.length > 0
      ? recycled.discardPile[recycled.discardPile.length - 1]
      : null;

  return {
    ...recycled,
    players,
    deck: result.remaining,
    pendingClaimCard,
    pendingClaimants: [],
  };
}

export function drawFromDiscard(
  state: GameState,
  playerId: string
): GameState {
  validateCurrentPlayer(state, playerId);

  if (state.discardPile.length === 0) {
    throw new Error('Discard pile is empty.');
  }

  const topCard = state.discardPile[state.discardPile.length - 1];
  const newDiscardPile = state.discardPile.slice(0, -1);

  const players = state.players.map((p) =>
    p.id === playerId ? { ...p, hand: [...p.hand, topCard] } : p
  );

  return {
    ...state,
    players,
    discardPile: newDiscardPile,
  };
}

export function discardCard(
  state: GameState,
  playerId: string,
  card: Card
): GameState {
  validateCurrentPlayer(state, playerId);

  const player = state.players.find((p) => p.id === playerId)!;
  const cardIndex = player.hand.findIndex((c) => c.id === card.id);
  if (cardIndex === -1) {
    throw new Error(`Player does not have card ${card.id}.`);
  }

  const newHand = player.hand.filter((_, i) => i !== cardIndex);
  let players = state.players.map((p) =>
    p.id === playerId ? { ...p, hand: newHand } : p
  );
  let newDiscardPile = [...state.discardPile, card];
  let deck = state.deck;
  let pendingSkipPlayerId = state.pendingSkipPlayerId;

  // Resolve pending discard-claim if any player pressed "La quiero"
  if (state.pendingClaimCard && state.pendingClaimants.length > 0) {
    const n = state.players.length;
    const currentIdx = state.currentPlayerIndex;

    // Highest priority = first player in turn order after current player
    let claimantId: string | undefined;
    for (let i = 1; i < n; i++) {
      const candidate = state.players[(currentIdx + i) % n].id;
      if (state.pendingClaimants.includes(candidate)) {
        claimantId = candidate;
        break;
      }
    }

    if (claimantId) {
      const claimedCard = state.pendingClaimCard;

      // Draw penalty card (recycle discard into deck if needed)
      if (deck.length === 0 && newDiscardPile.length > 1) {
        const top = newDiscardPile[newDiscardPile.length - 1];
        deck = DeckModel.shuffle(newDiscardPile.slice(0, -1));
        newDiscardPile = [top];
      }
      const penaltyResult = DeckModel.draw(deck, 1);
      deck = penaltyResult.remaining;

      players = players.map((p) =>
        p.id === claimantId
          ? { ...p, hand: [...p.hand, claimedCard, penaltyResult.drawn[0]] }
          : p
      );

      // Remove the claimed card from the discard pile
      newDiscardPile = newDiscardPile.filter((c) => c.id !== claimedCard.id);

      // The claimer's next turn is consumed
      pendingSkipPlayerId = claimantId;
    }
  }

  return {
    ...state,
    players,
    discardPile: newDiscardPile,
    deck,
    pendingClaimCard: null,
    pendingClaimants: [],
    pendingSkipPlayerId,
  };
}

export function claimDiscard(state: GameState, playerId: string): GameState {
  if (!state.pendingClaimCard) {
    throw new Error('No card available for claiming.');
  }
  if (state.players[state.currentPlayerIndex].id === playerId) {
    throw new Error('Current player cannot claim the discard.');
  }
  if (state.pendingClaimants.includes(playerId)) {
    return state; // Already in queue
  }
  return {
    ...state,
    pendingClaimants: [...state.pendingClaimants, playerId],
  };
}

export function meldCombinations(
  state: GameState,
  playerId: string,
  combinations: Combination[]
): GameState {
  validateCurrentPlayer(state, playerId);

  const player = state.players.find((p) => p.id === playerId)!;
  if (player.hasMelded) {
    throw new Error('Player has already melded.');
  }

  if (!isValidForRound(state.currentRound, combinations)) {
    throw new Error(
      `Combinations are not valid for round ${state.currentRound}.`
    );
  }

  // Collect all card IDs from the combinations
  const meldCardIds = new Set(
    combinations.flatMap((c) => c.cards.map((card) => card.id))
  );

  // Validate that the player has all the cards
  const handCardIds = new Set(player.hand.map((c) => c.id));
  for (const cardId of meldCardIds) {
    if (!handCardIds.has(cardId)) {
      throw new Error(`Player does not have card ${cardId}.`);
    }
  }

  // Process combinations: compute jokerMappings for sequences with jokers
  const processedCombinations = combinations.map((combo) => {
    if (combo.type === 'sequence' && combo.cards.some((c) => CardModel.isJoker(c))) {
      const { cards: sorted, jokerMappings: jm } = CombinationModel.sortWithMappings(combo.cards);
      return { ...combo, cards: sorted, jokerMappings: jm.length > 0 ? jm : undefined };
    }
    return combo;
  });

  // Remove melded cards from hand
  const newHand = player.hand.filter((c) => !meldCardIds.has(c.id));

  const players = state.players.map((p) =>
    p.id === playerId
      ? {
          ...p,
          hand: newHand,
          hasMelded: true,
          meldedCombinations: processedCombinations,
        }
      : p
  );

  return {
    ...state,
    players,
  };
}

export function addToCombination(
  state: GameState,
  playerId: string,
  targetPlayerId: string,
  combinationIndex: number,
  card: Card,
  position?: 'start' | 'end',
): GameState {
  validateCurrentPlayer(state, playerId);

  const player = state.players.find((p) => p.id === playerId)!;
  if (!player.hasMelded) {
    throw new Error('Player must meld before adding to combinations.');
  }

  const cardIndex = player.hand.findIndex((c) => c.id === card.id);
  if (cardIndex === -1) {
    throw new Error(`Player does not have card ${card.id}.`);
  }

  const targetPlayer = state.players.find((p) => p.id === targetPlayerId)!;
  if (combinationIndex < 0 || combinationIndex >= targetPlayer.meldedCombinations.length) {
    throw new Error('Invalid combination index.');
  }

  const combination = targetPlayer.meldedCombinations[combinationIndex];
  if (!CombinationModel.canAddCard(combination, card)) {
    throw new Error('Card cannot be added to this combination.');
  }

  const updatedCombination = CombinationModel.addCard(combination, card, position);
  const newHand = player.hand.filter((_, i) => i !== cardIndex);

  const players = state.players.map((p) => {
    if (p.id === playerId && p.id === targetPlayerId) {
      // Adding to own combination: update both hand and combinations
      const newCombinations = p.meldedCombinations.map((c, i) =>
        i === combinationIndex ? updatedCombination : c
      );
      return { ...p, hand: newHand, meldedCombinations: newCombinations };
    }
    if (p.id === playerId) {
      return { ...p, hand: newHand };
    }
    if (p.id === targetPlayerId) {
      const newCombinations = p.meldedCombinations.map((c, i) =>
        i === combinationIndex ? updatedCombination : c
      );
      return { ...p, meldedCombinations: newCombinations };
    }
    return p;
  });

  return {
    ...state,
    players,
  };
}

export function substituteJoker(
  state: GameState,
  playerId: string,
  targetPlayerId: string,
  combinationIndex: number,
  card: Card,
  jokerId: string,
): GameState {
  validateCurrentPlayer(state, playerId);

  const player = state.players.find((p) => p.id === playerId)!;
  if (!player.hasMelded) {
    throw new Error('Player must meld before substituting jokers.');
  }

  const cardIndex = player.hand.findIndex((c) => c.id === card.id);
  if (cardIndex === -1) {
    throw new Error(`Player does not have card ${card.id}.`);
  }

  const targetPlayer = state.players.find((p) => p.id === targetPlayerId)!;
  if (combinationIndex < 0 || combinationIndex >= targetPlayer.meldedCombinations.length) {
    throw new Error('Invalid combination index.');
  }

  const combination = targetPlayer.meldedCombinations[combinationIndex];
  if (combination.type !== 'sequence') {
    throw new Error('Joker substitution only applies to sequences.');
  }

  const matchingJokerId = CombinationModel.canSubstituteJoker(combination, card);
  if (!matchingJokerId || matchingJokerId !== jokerId) {
    throw new Error('Card does not match any joker mapping in this combination.');
  }

  const result = CombinationModel.substituteJoker(combination, card, jokerId);

  // Update hand: remove real card, add joker
  const newHand = player.hand.filter((_, i) => i !== cardIndex);
  newHand.push(result.jokerCard);

  const players = state.players.map((p) => {
    if (p.id === playerId && p.id === targetPlayerId) {
      const newCombinations = p.meldedCombinations.map((c, i) =>
        i === combinationIndex ? result.combination : c,
      );
      return { ...p, hand: newHand, meldedCombinations: newCombinations };
    }
    if (p.id === playerId) {
      return { ...p, hand: newHand };
    }
    if (p.id === targetPlayerId) {
      const newCombinations = p.meldedCombinations.map((c, i) =>
        i === combinationIndex ? result.combination : c,
      );
      return { ...p, meldedCombinations: newCombinations };
    }
    return p;
  });

  return {
    ...state,
    players,
  };
}

export function checkRoundEnd(state: GameState): GameState {
  const emptyHandPlayer = state.players.find((p) => p.hand.length === 0);
  if (!emptyHandPlayer) return state;

  const scoredPlayers = calculateRoundScores(state.players);

  return {
    ...state,
    players: scoredPlayers,
    phase: 'roundEnd',
  };
}

export function checkGameEnd(state: GameState): GameState {
  if (state.currentRound !== 4 || state.phase !== 'roundEnd') return state;

  const winner = state.players.reduce((min, p) =>
    p.totalScore < min.totalScore ? p : min
  );

  return {
    ...state,
    phase: 'gameEnd',
    winner: winner.id,
  };
}

export function nextTurn(state: GameState): GameState {
  const n = state.players.length;
  const nextIndex = (state.currentPlayerIndex + 1) % n;
  const nextPlayer = state.players[nextIndex];

  // If the next player's turn was consumed by a discard-claim, skip them
  if (state.pendingSkipPlayerId && nextPlayer.id === state.pendingSkipPlayerId) {
    return {
      ...state,
      currentPlayerIndex: (nextIndex + 1) % n,
      pendingSkipPlayerId: null,
    };
  }

  return {
    ...state,
    currentPlayerIndex: nextIndex,
  };
}
