'use client';

import React, { useState } from 'react';
import { Player, Card as CardType, CombinationType, JokerMapping } from '@/lib/types/game.types';
import { Card } from '@/components/ui/Card';
import { CombinationModel } from '@/lib/models/Combination';
import { CardModel } from '@/lib/models/Card';
import { DRAG_TYPE } from './PlayerHand';

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
  onDropOnCombination: (
    playerId: string,
    combinationIndex: number,
    card: CardType,
    position?: 'start' | 'end',
  ) => void;
  onSubstituteJoker: (
    playerId: string,
    combinationIndex: number,
    card: CardType,
    jokerId: string,
  ) => void;
}

export const MeldedCombinations: React.FC<MeldedCombinationsProps> = ({
  players,
  canAcceptDrop,
  draggedCard,
  onDropOnCombination,
  onSubstituteJoker,
}) => {
  const [hoverTarget, setHoverTarget] = useState<string | null>(null);
  const [hoverSide, setHoverSide] = useState<'start' | 'end' | null>(null);

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

  const makeKey = (playerId: string, comboIndex: number) =>
    `${playerId}-${comboIndex}`;

  const handleDragOver = (
    e: React.DragEvent,
    combo: FlatCombo,
    canAdd: boolean,
  ) => {
    if (!canAcceptDrop || !canAdd) return;
    if (!e.dataTransfer.types.includes(DRAG_TYPE)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setHoverTarget(makeKey(combo.playerId, combo.comboIndex));
    if (draggedCard && CardModel.isJoker(draggedCard) && combo.type === 'sequence') {
      const rect = e.currentTarget.getBoundingClientRect();
      setHoverSide(e.clientX < rect.left + rect.width / 2 ? 'start' : 'end');
    } else {
      setHoverSide(null);
    }
  };

  const handleDragLeave = () => {
    setHoverTarget(null);
    setHoverSide(null);
  };

  const handleDrop = (e: React.DragEvent, combo: FlatCombo) => {
    e.preventDefault();
    setHoverTarget(null);
    setHoverSide(null);
    if (!canAcceptDrop) return;

    const data = e.dataTransfer.getData(DRAG_TYPE);
    if (!data) return;

    const card: CardType = JSON.parse(data);
    const jokerId = CombinationModel.canSubstituteJoker(
      { type: combo.type, cards: combo.cards, jokerMappings: combo.jokerMappings },
      card,
    );
    if (jokerId) {
      onSubstituteJoker(combo.playerId, combo.comboIndex, card, jokerId);
    } else {
      let position: 'start' | 'end' | undefined;
      if (CardModel.isJoker(card) && combo.type === 'sequence') {
        const rect = e.currentTarget.getBoundingClientRect();
        position = e.clientX < rect.left + rect.width / 2 ? 'start' : 'end';
      }
      onDropOnCombination(combo.playerId, combo.comboIndex, card, position);
    }
  };

  const renderCombo = (combo: FlatCombo) => {
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
    const isHovered =
      hoverTarget === makeKey(combo.playerId, combo.comboIndex);

    const isJokerOnSequence =
      isHovered &&
      draggedCard !== null &&
      CardModel.isJoker(draggedCard) &&
      combo.type === 'sequence';

    return (
      <div
        key={makeKey(combo.playerId, combo.comboIndex)}
        onDragOver={(e) => handleDragOver(e, combo, canAdd)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, combo)}
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

  return (
    <div className="space-y-2.5 overflow-y-auto max-h-72">
      {trios.length > 0 && (
        <div>
          <p className="text-xs font-medium text-green-300/70 mb-1">Tríos</p>
          <div className="flex flex-wrap gap-2">
            {trios.map(renderCombo)}
          </div>
        </div>
      )}
      {sequences.length > 0 && (
        <div>
          <p className="text-xs font-medium text-green-300/70 mb-1">Seguidillas</p>
          <div className="flex flex-wrap gap-2">
            {sequences.map(renderCombo)}
          </div>
        </div>
      )}
    </div>
  );
};
