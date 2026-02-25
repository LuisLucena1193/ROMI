import { Combination, Player } from '../types/game.types';
import { CombinationModel } from '../models/Combination';

export function countTrios(combinations: Combination[]): number {
  return combinations.filter((c) => c.type === 'trio').length;
}

export function countSequences(combinations: Combination[]): number {
  return combinations.filter((c) => c.type === 'sequence').length;
}

export function isValidForRound(
  round: 1 | 2 | 3 | 4,
  combinations: Combination[]
): boolean {
  // First validate that each combination is internally valid
  for (const combo of combinations) {
    if (combo.type === 'trio' && !CombinationModel.isValidTrio(combo.cards)) {
      return false;
    }
    if (combo.type === 'sequence' && !CombinationModel.isValidSequence(combo.cards)) {
      return false;
    }
  }

  const trios = countTrios(combinations);
  const sequences = countSequences(combinations);

  switch (round) {
    case 1: return trios === 1 && sequences === 1;
    case 2: return trios === 3 && sequences === 0;
    case 3: return trios === 0 && sequences === 2;
    case 4: return trios === 2 && sequences === 1;
  }
}

export function getRoundObjective(round: 1 | 2 | 3 | 4): string {
  switch (round) {
    case 1: return '1 trío y 1 seguidilla';
    case 2: return '3 tríos';
    case 3: return '2 seguidillas';
    case 4: return '2 tríos y 1 seguidilla';
  }
}

export function canMeld(player: Player, round: 1 | 2 | 3 | 4): boolean {
  if (player.hasMelded) return false;
  return isValidForRound(round, player.meldedCombinations);
}
