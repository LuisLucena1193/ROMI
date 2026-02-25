'use client';

import React, { useCallback } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Card as CardComponent } from '@/components/ui/Card';
import { Card } from '@/lib/types/game.types';
import { DropData } from './dragTypes';

interface DiscardPileProps {
  topCard: Card | null;
  onDraw: () => void;
  disabled: boolean;
  canAcceptDrop: boolean;
  cardRef?: React.RefObject<HTMLDivElement | null>;
}

export const DiscardPile: React.FC<DiscardPileProps> = ({
  topCard,
  onDraw,
  disabled,
  canAcceptDrop,
  cardRef,
}) => {
  const dropData: DropData = { type: 'discard-pile' };
  const { setNodeRef, isOver } = useDroppable({
    id: 'discard-pile',
    disabled: !canAcceptDrop,
    data: dropData,
  });

  // Compose droppable ref with the cardRef passed from GameTable
  const composedRef = useCallback(
    (el: HTMLDivElement | null) => {
      setNodeRef(el);
      if (cardRef) {
        (cardRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
      }
    },
    [setNodeRef, cardRef],
  );

  const isDragOver = isOver && canAcceptDrop;

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs text-green-200 font-medium">Descarte</p>

      {topCard ? (
        <div
          ref={composedRef}
          className={`rounded-xl transition-all duration-200 ${
            isDragOver
              ? 'ring-4 ring-red-400 ring-offset-2 ring-offset-transparent scale-105'
              : ''
          } ${disabled && !isDragOver ? 'opacity-50' : ''}`}
        >
          <CardComponent
            card={topCard}
            size="medium"
            onClick={disabled ? undefined : onDraw}
          />
        </div>
      ) : (
        <div
          ref={composedRef}
          className={`w-20 h-[7.5rem] border-2 border-dashed rounded-lg flex items-center justify-center transition-all duration-200 ${
            isDragOver
              ? 'border-red-400 bg-red-400/20 scale-105'
              : 'border-green-600'
          }`}
        >
          <p className={`text-xs text-center px-2 ${isDragOver ? 'text-red-300' : 'text-green-500'}`}>
            {isDragOver ? 'Soltar aquí' : 'Vacío'}
          </p>
        </div>
      )}

      {isDragOver ? (
        <p className="text-xs text-red-300 font-medium animate-pulse">
          Soltar para descartar
        </p>
      ) : !disabled && topCard ? (
        <p className="text-xs text-blue-300 animate-pulse">Tomar carta</p>
      ) : null}
    </div>
  );
};
