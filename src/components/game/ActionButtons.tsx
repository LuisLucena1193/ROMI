'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';

interface ActionButtonsProps {
  hasDrawn: boolean;
  hasMelded: boolean;
  selectedCount: number;
  onMeld: () => void;
  onAddToCombination: () => void;
  onDiscard: () => void;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  hasDrawn,
  hasMelded,
  onMeld,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md px-3 py-2 shrink-0">
      <Button
        onClick={onMeld}
        disabled={!hasDrawn || hasMelded}
        variant="primary"
        size="lg"
        className="w-full"
      >
        Bajar Juego
      </Button>
    </div>
  );
};
