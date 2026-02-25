'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';

interface DeckPileProps {
  cardsRemaining: number;
  onDraw: () => void;
  disabled: boolean;
  cardRef?: React.RefObject<HTMLDivElement | null>;
}

export const DeckPile: React.FC<DeckPileProps> = ({
  cardsRemaining,
  onDraw,
  disabled,
  cardRef,
}) => {
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs text-green-200 font-medium">Mazo</p>

      <div className="relative">
        {/* Depth layers */}
        {cardsRemaining > 2 && (
          <div className="absolute top-1 left-1 opacity-40">
            <Card card={null} faceDown size="medium" />
          </div>
        )}
        {cardsRemaining > 1 && (
          <div className="absolute top-0.5 left-0.5 opacity-60">
            <Card card={null} faceDown size="medium" />
          </div>
        )}

        {/* Main clickable card */}
        <div ref={cardRef} className={disabled ? 'opacity-50' : ''}>
          <Card
            card={null}
            faceDown
            size="medium"
            onClick={disabled ? undefined : onDraw}
          />
        </div>
      </div>

      <p className="text-xs text-green-200">{cardsRemaining} cartas</p>
      {!disabled && (
        <p className="text-xs text-blue-300 animate-pulse">Tomar carta</p>
      )}
    </div>
  );
};
