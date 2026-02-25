'use client';

import React, { useState } from 'react';
import { Card as CardComponent } from '@/components/ui/Card';
import { Card } from '@/lib/types/game.types';
import { DRAG_TYPE } from './PlayerHand';

interface DiscardPileProps {
  topCard: Card | null;
  onDraw: () => void;
  disabled: boolean;
  canAcceptDrop: boolean;
  onDropCard: (card: Card) => void;
  cardRef?: React.RefObject<HTMLDivElement | null>;
}

export const DiscardPile: React.FC<DiscardPileProps> = ({
  topCard,
  onDraw,
  disabled,
  canAcceptDrop,
  onDropCard,
  cardRef,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    if (!canAcceptDrop) return;
    if (!e.dataTransfer.types.includes(DRAG_TYPE)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!canAcceptDrop) return;

    const data = e.dataTransfer.getData(DRAG_TYPE);
    if (!data) return;

    const card: Card = JSON.parse(data);
    onDropCard(card);
  };

  return (
    <div
      className="flex flex-col items-center gap-2"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <p className="text-xs text-green-200 font-medium">Descarte</p>

      {topCard ? (
        <div
          ref={cardRef}
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
          ref={cardRef}
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

      {isDragOver && canAcceptDrop ? (
        <p className="text-xs text-red-300 font-medium animate-pulse">
          Soltar para descartar
        </p>
      ) : !disabled && topCard ? (
        <p className="text-xs text-blue-300 animate-pulse">Tomar carta</p>
      ) : null}
    </div>
  );
};
