'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card as CardComponent } from '@/components/ui/Card';
import { Card } from '@/lib/types/game.types';
import { CardModel } from '@/lib/models/Card';

export const DRAG_TYPE = 'application/romi-card';

interface PlayerHandProps {
  cards: Card[];
  selectedCards: Card[];
  onCardClick: (card: Card) => void;
  disabled: boolean;
  onDragCardStart?: (card: Card) => void;
  onDragCardEnd?: () => void;
  savedOrder?: string[];
  onOrderChange?: (orderedIds: string[]) => void;
  hiddenCardId?: string | null;
  getCardRectRef?: React.MutableRefObject<((cardId: string) => DOMRect | null) | null>;
  onNewCardRendered?: (cardId: string) => void;
}

const OVERLAP = '-1.25rem';
const GAP = '2rem';

export const PlayerHand: React.FC<PlayerHandProps> = ({
  cards,
  selectedCards,
  onCardClick,
  disabled,
  onDragCardStart,
  onDragCardEnd,
  savedOrder,
  onOrderChange,
  hiddenCardId,
  getCardRectRef,
  onNewCardRendered,
}) => {
  const [orderedCards, setOrderedCards] = useState<Card[]>(() =>
    [...cards].sort(CardModel.compare),
  );
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [gapIndex, setGapIndex] = useState<number | null>(null);

  const savedOrderRef = useRef(savedOrder);
  savedOrderRef.current = savedOrder;

  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  // Midpoints captured at drag start to avoid jitter from layout shifts
  const dragMidpoints = useRef<number[]>([]);

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

  // --- Drag handlers ---

  const handleDragStart = (e: React.DragEvent, index: number) => {
    const card = orderedCards[index];
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData(DRAG_TYPE, JSON.stringify(card));

    // Snapshot card midpoints before any visual changes
    const midpoints: number[] = [];
    for (let i = 0; i < orderedCards.length; i++) {
      const el = cardRefs.current.get(i);
      if (el) {
        const rect = el.getBoundingClientRect();
        midpoints.push(rect.left + rect.width / 2);
      }
    }
    dragMidpoints.current = midpoints;

    requestAnimationFrame(() => setDragIndex(index));
    onDragCardStart?.(card);
  };

  // Container-level dragOver: calculate insertion gap from pointer X vs. snapshotted midpoints
  const handleContainerDragOver = (e: React.DragEvent) => {
    if (dragIndex === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const pointerX = e.clientX;
    const midpoints = dragMidpoints.current;
    let newGap = orderedCards.length;

    for (let i = 0; i < midpoints.length; i++) {
      if (pointerX < midpoints[i]) {
        newGap = i;
        break;
      }
    }

    // No gap if dropping at the same position (no-op)
    if (newGap === dragIndex || newGap === dragIndex + 1) {
      setGapIndex(null);
    } else {
      setGapIndex(newGap);
    }
  };

  const handleContainerDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (dragIndex !== null && gapIndex !== null) {
      const next = [...orderedCards];
      const [dragged] = next.splice(dragIndex, 1);
      const insertAt = gapIndex > dragIndex ? gapIndex - 1 : gapIndex;
      next.splice(insertAt, 0, dragged);
      reportOrder(next);
    }
    setDragIndex(null);
    setGapIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setGapIndex(null);
    onDragCardEnd?.();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear gap when pointer leaves the container entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setGapIndex(null);
    }
  };

  const setCardRef = useCallback(
    (el: HTMLDivElement | null, index: number) => {
      if (el) cardRefs.current.set(index, el);
      else cardRefs.current.delete(index);
    },
    [],
  );

  const isSelected = (card: Card) =>
    selectedCards.some((c) => c.id === card.id);

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

      <div
        className="overflow-x-auto cards-scroll pb-2"
        onDragOver={handleContainerDragOver}
        onDrop={handleContainerDrop}
        onDragLeave={handleDragLeave}
      >
        <div className="flex min-w-min py-1 px-1">
          {orderedCards.map((card, index) => {
            const isBeingDragged = dragIndex === index;
            const showGapBefore = gapIndex === index && dragIndex !== null;
            const selected = isSelected(card);
            const isHidden = hiddenCardId === card.id;

            return (
              <div
                key={card.id}
                ref={(el) => setCardRef(el, index)}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex-shrink-0 relative transition-all duration-200 ${
                  isBeingDragged ? 'opacity-30 scale-95' : ''
                } ${selected ? 'z-10' : ''}`}
                style={{
                  marginLeft: showGapBefore
                    ? GAP
                    : index > 0
                      ? OVERLAP
                      : undefined,
                  opacity: isHidden ? 0 : undefined,
                }}
              >
                <CardComponent
                  card={card}
                  size="medium"
                  selected={selected}
                  onClick={disabled ? undefined : () => onCardClick(card)}
                />
              </div>
            );
          })}
          {/* Gap indicator after last card */}
          {gapIndex === orderedCards.length && dragIndex !== null && (
            <div
              className="flex-shrink-0 transition-all duration-200"
              style={{ width: GAP }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
