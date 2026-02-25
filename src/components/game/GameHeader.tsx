'use client';

import React from 'react';
import { getRoundObjective } from '@/lib/utils/validators';
import { Button } from '@/components/ui/Button';

interface GameHeaderProps {
  currentRound: 1 | 2 | 3 | 4;
  onReset: () => void;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  currentRound,
  onReset,
}) => {
  const objective = getRoundObjective(currentRound);

  return (
    <div className="bg-white rounded-lg shadow-md py-2 px-3 flex items-center justify-between">
      <div>
        <h2 className="text-base md:text-2xl font-bold text-gray-800">
          Ronda {currentRound}/4
        </h2>
        <p className="text-xs md:text-base text-gray-600">Objetivo: {objective}</p>
      </div>
      <Button variant="secondary" size="sm" onClick={onReset}>
        Salir
      </Button>
    </div>
  );
};
