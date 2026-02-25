'use client';

import React, { useState, useRef } from 'react';
import { useDroppable, useDndMonitor, DragMoveEvent, DragEndEvent } from '@dnd-kit/core';
import { Player, Card as CardType, CombinationType, JokerMapping } from '@/lib/types/game.types';
import { Card } from '@/components/ui/Card';
import { CombinationModel } from '@/lib/models/Combination';
import { CardModel } from '@/lib/models/Card';
import { DropData } from './dragTypes';
import type { HandCardDragData } from './dragTypes';

interface FlatCombo {
  playerId: string;
  comboIndex: number;
  type: CombinationType;
  cards: CardType[];
  jokerMappings?: JokerMapping[];
}

interface MeldedCombinationsProps {
  players: Player[];
  canAcceptDrop: boolean;
  draggedCard: CardType | null;
}

interface DroppableComboProps {
  combo: FlatCombo;
  canAcceptDrop: boolean;
  draggedCard: CardType | null;
}

const DroppableCombo: React.FC<DroppableComboProps> = ({ combo, canAcceptDrop, draggedCard }) => {
  const droppableId = `combo-${combo.playerId}-${combo.comboIndex}`;
  const [hoverSide, setHoverSide] = useState<'start' | 'end' | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const canAdd =
    draggedCard !== null &&
    (CombinationModel.canAddCard(
      { type: combo.type, cards: combo.cards },
      draggedCard,
    ) ||
    !!CombinationModel.canSubstituteJoker(
      { type: combo.type, cards: combo.cards, jokerMappings: combo.jokerMappings },
      draggedCard,
    ));

  const dropData: DropData = {
    type: 'combination',
    playerId: combo.playerId,
    comboIndex: combo.comboIndex,
    comboType: combo.type,
  };

  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    disabled: !canAcceptDrop || !canAdd,
    data: dropData,
  });

  const composedRef = (el: HTMLDivElement | null) => {
    setNodeRef(el);
    containerRef.current = el;
  };

  // Monitor drag moves to update joker side indicator
  useDndMonitor({
    onDragMove(event: DragMoveEvent) {
      const isThisOver = event.over?.id === droppableId;
      if (!isThisOver) {
        if (hoverSide !== null) setHoverSide(null);
        return;
      }
      const active = event.active.data.current as HandCardDragData | undefined;
      if (!active || !CardModel.isJoker(active.card) || combo.type !== 'sequence') {
        if (hoverSide !== null) setHoverSide(null);
        return;
      }
      const translated = event.active.rect.current.translated;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!translated || !rect) return;
      const pointerX = translated.left + translated.width / 2;
      setHoverSide(pointerX < rect.left + rect.width / 2 ? 'start' : 'end');
    },
    onDragEnd(_event: DragEndEvent) {
      setHoverSide(null);
    },
  });

  const isHovered = isOver && canAdd;
  const isJokerOnSequence =
    isHovered &&
    draggedCard !== null &&
    CardModel.isJoker(draggedCard) &&
    combo.type === 'sequence';

  return (
    <div
      ref={composedRef}
      className={`bg-green-900/40 rounded p-1.5 transition-all duration-200 inline-flex items-center relative ${
        isHovered
          ? 'ring-4 ring-green-400 bg-green-800/60 scale-[1.02]'
          : draggedCard !== null && canAdd
            ? 'ring-2 ring-green-400/60 bg-green-800/40'
            : ''
      }`}
    >
      {isJokerOnSequence && hoverSide === 'start' && (
        <div className="absolute -left-1 top-0 bottom-0 w-1.5 rounded-l bg-blue-400 z-20" />
      )}
      {isJokerOnSequence && hoverSide === 'end' && (
        <div className="absolute -right-1 top-0 bottom-0 w-1.5 rounded-r bg-green-400 z-20" />
      )}
      {combo.cards.map((card, cardIdx) => {
        const mapping = combo.jokerMappings?.find((m) => m.jokerId === card.id);
        return (
          <div
            key={card.id}
            className="flex-shrink-0 relative"
            style={{
              marginLeft: cardIdx > 0 ? '-2.25rem' : undefined,
            }}
          >
            <Card card={card} size="small" />
            {mapping && (
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[8px] px-1 rounded whitespace-nowrap z-10">
                ={CardModel.getDisplayValue({ value: mapping.replacesValue, suit: mapping.replacesSuit, id: '' })}{CardModel.getSuitSymbol(mapping.replacesSuit)}
              </div>
            )}
          </div>
        );
      })}
      {draggedCard !== null && canAdd && (
        <span className="text-[10px] text-green-300 font-medium ml-1.5 whitespace-nowrap">
          {isJokerOnSequence
            ? hoverSide === 'start' ? '◀ Inicio' : hoverSide === 'end' ? 'Final ▶' : '+'
            : isHovered ? 'Soltar' : '+'}
        </span>
      )}
    </div>
  );
};

export const MeldedCombinations: React.FC<MeldedCombinationsProps> = ({
  players,
  canAcceptDrop,
  draggedCard,
}) => {
  // Flatten all combinations with their owner info
  const allCombos: FlatCombo[] = [];
  for (const player of players) {
    if (!player.hasMelded) continue;
    player.meldedCombinations.forEach((combo, idx) => {
      allCombos.push({
        playerId: player.id,
        comboIndex: idx,
        type: combo.type,
        cards: combo.cards,
        jokerMappings: combo.jokerMappings,
      });
    });
  }

  if (allCombos.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-green-400/60 text-sm text-center italic">
          Nadie se ha bajado aún
        </p>
      </div>
    );
  }

  const trios = allCombos.filter((c) => c.type === 'trio');
  const sequences = allCombos.filter((c) => c.type === 'sequence');

  return (
    <div className="space-y-2.5 overflow-y-auto max-h-72">
      {trios.length > 0 && (
        <div>
          <p className="text-xs font-medium text-green-300/70 mb-1">Tríos</p>
          <div className="flex flex-wrap gap-2">
            {trios.map((combo) => (
              <DroppableCombo
                key={`${combo.playerId}-${combo.comboIndex}`}
                combo={combo}
                canAcceptDrop={canAcceptDrop}
                draggedCard={draggedCard}
              />
            ))}
          </div>
        </div>
      )}
      {sequences.length > 0 && (
        <div>
          <p className="text-xs font-medium text-green-300/70 mb-1">Seguidillas</p>
          <div className="flex flex-wrap gap-2">
            {sequences.map((combo) => (
              <DroppableCombo
                key={`${combo.playerId}-${combo.comboIndex}`}
                combo={combo}
                canAcceptDrop={canAcceptDrop}
                draggedCard={draggedCard}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
