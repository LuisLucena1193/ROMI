'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { useDndMonitor, DragEndEvent } from '@dnd-kit/core';
import { Card as CardComponent } from '@/components/ui/Card';
import { Card } from '@/lib/types/game.types';
import { CardModel } from '@/lib/models/Card';
import type { HandCardDragData } from './dragTypes';

interface PlayerHandProps {
  cards: Card[];
  selectedCards: Card[];
  onCardClick: (card: Card) => void;
  disabled: boolean;       // disables click-to-select
  dragDisabled?: boolean;  // disables drag entirely; defaults to `disabled` if omitted
  savedOrder?: string[];
  onOrderChange?: (orderedIds: string[]) => void;
  hiddenCardId?: string | null;
  getCardRectRef?: React.MutableRefObject<((cardId: string) => DOMRect | null) | null>;
  onNewCardRendered?: (cardId: string) => void;
}

// Overlap classes: more aggressive on mobile so cards fit on small screens
const OVERLAP_CLASS = '-ml-12 md:-ml-5'; // mobile: -3rem, desktop: -1.25rem

// ---- SortableCard sub-component ----

interface SortableCardProps {
  card: Card;
  index: number;
  selected: boolean;
  isHidden: boolean;
  clickDisabled: boolean;
  dragDisabled: boolean;
  onCardClick: (card: Card) => void;
  setRef: (el: HTMLDivElement | null) => void;
}

const SortableCard: React.FC<SortableCardProps> = ({
  card,
  index,
  selected,
  isHidden,
  clickDisabled,
  dragDisabled,
  onCardClick,
  setRef,
}) => {
  const dragData: HandCardDragData = { type: 'hand-card', card, handIndex: index };

  const { setNodeRef, isDragging, attributes, listeners } = useSortable({
    id: card.id,
    data: dragData,
    disabled: dragDisabled,
  });

  // Compose dnd-kit ref with parent's cardRefs map (for getCardRectRef / FlyingCard)
  const composedRef = useCallback(
    (el: HTMLDivElement | null) => {
      setNodeRef(el);
      setRef(el);
    },
    [setNodeRef, setRef],
  );

  const marginClass = index > 0 ? OVERLAP_CLASS : '';

  return (
    <div
      ref={composedRef}
      {...attributes}
      {...listeners}
      className={`flex-shrink-0 relative transition-all duration-200 ${marginClass} ${
        isDragging ? 'opacity-30 scale-95' : ''
      } ${selected ? 'z-10' : ''}`}
      style={{
        opacity: isHidden ? 0 : undefined,
        touchAction: 'none',
      }}
    >
      <CardComponent
        card={card}
        size="medium"
        selected={selected}
        onClick={clickDisabled ? undefined : () => onCardClick(card)}
      />
    </div>
  );
};

// ---- PlayerHand ----

export const PlayerHand: React.FC<PlayerHandProps> = ({
  cards,
  selectedCards,
  onCardClick,
  disabled,
  dragDisabled,
  savedOrder,
  onOrderChange,
  hiddenCardId,
  getCardRectRef,
  onNewCardRendered,
}) => {
  const [orderedCards, setOrderedCards] = useState<Card[]>(() =>
    [...cards].sort(CardModel.compare),
  );

  const savedOrderRef = useRef(savedOrder);
  savedOrderRef.current = savedOrder;

  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const prevCardIdsRef = useRef<Set<string>>(new Set(cards.map((c) => c.id)));
  const onNewCardRenderedRef = useRef(onNewCardRendered);
  onNewCardRenderedRef.current = onNewCardRendered;

  // Expose getCardRect function so GameTable can measure card positions by ID
  useEffect(() => {
    if (!getCardRectRef) return;
    getCardRectRef.current = (cardId: string) => {
      const index = orderedCards.findIndex((c) => c.id === cardId);
      if (index === -1) return null;
      const el = cardRefs.current.get(index);
      if (!el) return null;
      return el.getBoundingClientRect();
    };
    return () => {
      if (getCardRectRef.current) getCardRectRef.current = null;
    };
  }, [getCardRectRef, orderedCards]);

  // Sync orderedCards when cards prop changes (draw, discard, meld, turn change)
  useEffect(() => {
    const prevIds = prevCardIdsRef.current;

    setOrderedCards((prev) => {
      const currentMap = new Map(cards.map((c) => [c.id, c]));
      const prevOrderIds = new Set(prev.map((c) => c.id));

      const kept = prev
        .filter((c) => currentMap.has(c.id))
        .map((c) => currentMap.get(c.id)!);

      const added = cards
        .filter((c) => !prevOrderIds.has(c.id))
        .sort(CardModel.compare);

      if (kept.length === 0) {
        const order = savedOrderRef.current;
        if (order && order.length > 0) {
          const fromSaved = order
            .filter((id) => currentMap.has(id))
            .map((id) => currentMap.get(id)!);
          const remaining = cards
            .filter((c) => !new Set(order).has(c.id))
            .sort(CardModel.compare);
          if (fromSaved.length > 0) return [...fromSaved, ...remaining];
        }
        return [...cards].sort(CardModel.compare);
      }

      return [...kept, ...added];
    });

    // Detect newly added cards and notify after they render
    const newIds = cards.filter((c) => !prevIds.has(c.id));
    if (newIds.length > 0 && onNewCardRenderedRef.current) {
      const cb = onNewCardRenderedRef.current;
      requestAnimationFrame(() => {
        newIds.forEach((c) => cb(c.id));
      });
    }

    prevCardIdsRef.current = new Set(cards.map((c) => c.id));
  }, [cards]);

  const reportOrder = (newOrder: Card[]) => {
    setOrderedCards(newOrder);
    onOrderChange?.(newOrder.map((c) => c.id));
  };

  const handleSort = () => {
    reportOrder([...orderedCards].sort(CardModel.compare));
  };

  const isSelected = (card: Card) =>
    selectedCards.some((c) => c.id === card.id);

  // Reorder cards when one is dropped onto another hand card
  useDndMonitor({
    onDragEnd(event: DragEndEvent) {
      const active = event.active.data.current as HandCardDragData | undefined;
      if (!active || active.type !== 'hand-card') return;
      const overCardId = event.over?.id as string | undefined;
      if (!overCardId) return;
      const isHandCard = orderedCards.some((c) => c.id === overCardId);
      if (!isHandCard) return;
      const oldIndex = orderedCards.findIndex((c) => c.id === active.card.id);
      const newIndex = orderedCards.findIndex((c) => c.id === overCardId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
      reportOrder(arrayMove(orderedCards, oldIndex, newIndex));
    },
  });

  const setCardRef = useCallback(
    (el: HTMLDivElement | null, index: number) => {
      if (el) cardRefs.current.set(index, el);
      else cardRefs.current.delete(index);
    },
    [],
  );

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="mb-2 flex justify-between items-center">
        <h3 className="font-semibold text-gray-800">Tu mano</h3>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSort}
            className="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            Ordenar
          </button>
          {selectedCards.length > 0 && (
            <p className="text-sm text-blue-600">
              {selectedCards.length} seleccionada
              {selectedCards.length > 1 ? 's' : ''}
            </p>
          )}
          <p className="text-sm text-gray-500">{cards.length} cartas</p>
        </div>
      </div>

      <div className="overflow-x-auto cards-scroll pb-2">
        <SortableContext
          items={orderedCards.map((c) => c.id)}
          strategy={horizontalListSortingStrategy}
        >
          <div className="flex min-w-min py-1 px-1">
            {orderedCards.map((card, index) => {
              const selected = isSelected(card);
              const isHidden = hiddenCardId === card.id;

              return (
                <SortableCard
                  key={card.id}
                  card={card}
                  index={index}
                  selected={selected}
                  isHidden={isHidden}
                  clickDisabled={disabled}
                  dragDisabled={dragDisabled ?? disabled}
                  onCardClick={onCardClick}
                  setRef={(el) => setCardRef(el, index)}
                />
              );
            })}
          </div>
        </SortableContext>
      </div>
    </div>
  );
};
