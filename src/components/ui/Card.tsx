'use client';

import React from 'react';
import { Card as CardType } from '@/lib/types/game.types';
import { CardModel } from '@/lib/models/Card';

interface CardProps {
  card: CardType | null;
  faceDown?: boolean;
  selected?: boolean;
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
  className?: string;
}

const sizeMap = {
  small: { container: 'w-16 h-24 text-xs', center: 'text-2xl', corner: 'text-sm' },
  medium: { container: 'w-20 h-[7.5rem] text-sm', center: 'text-4xl', corner: 'text-base' },
  large: { container: 'w-24 h-36 text-base', center: 'text-5xl', corner: 'text-lg' },
};

export const Card: React.FC<CardProps> = ({
  card,
  faceDown = false,
  selected = false,
  size = 'medium',
  onClick,
  className = '',
}) => {
  const sizes = sizeMap[size];

  const base = `${sizes.container} rounded-lg border-2 shadow-md relative select-none transition-all duration-200 ${
    selected
      ? 'border-blue-500 border-4 -translate-y-2'
      : 'border-gray-300'
  } ${onClick ? 'cursor-pointer hover:shadow-lg hover:-translate-y-1' : ''} ${className}`;

  if (faceDown || !card) {
    return (
      <div
        onClick={onClick}
        className={`${base} bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center`}
      >
        <div className="w-[70%] h-[80%] rounded border-2 border-blue-400/40 bg-blue-700/50" />
      </div>
    );
  }

  const isJoker = CardModel.isJoker(card);
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  const color = isJoker ? 'text-purple-600' : isRed ? 'text-card-red' : 'text-card-black';
  const bgClass = isJoker ? 'bg-gradient-to-br from-purple-50 to-yellow-50' : 'bg-white';
  const displayValue = CardModel.getDisplayValue(card);
  const suitSymbol = CardModel.getSuitSymbol(card.suit);

  return (
    <div onClick={onClick} className={`${base} ${bgClass} ${color}`}>
      <div className="absolute top-1 left-1.5 flex flex-col items-center leading-tight">
        <span className="font-bold">{displayValue}</span>
        <span className={sizes.corner}>{suitSymbol}</span>
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <span className={sizes.center}>{suitSymbol}</span>
      </div>

      <div className="absolute bottom-1 right-1.5 flex flex-col items-center leading-tight rotate-180">
        <span className="font-bold">{displayValue}</span>
        <span className={sizes.corner}>{suitSymbol}</span>
      </div>
    </div>
  );
};
