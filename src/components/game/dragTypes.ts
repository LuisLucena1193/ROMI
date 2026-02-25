import { Card, CombinationType } from '@/lib/types/game.types';

export interface HandCardDragData {
  type: 'hand-card';
  card: Card;
  handIndex: number;
}

export type DragData = HandCardDragData;

export type DropData =
  | { type: 'discard-pile' }
  | { type: 'combination'; playerId: string; comboIndex: number; comboType: CombinationType }
  | { type: 'hand-sort' };
