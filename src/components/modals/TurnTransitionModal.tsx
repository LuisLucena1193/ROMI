'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Player } from '@/lib/types/game.types';

interface TurnTransitionModalProps {
  isOpen: boolean;
  nextPlayer: Player;
  onContinue: () => void;
}

export const TurnTransitionModal: React.FC<TurnTransitionModalProps> = ({
  isOpen,
  nextPlayer,
  onContinue,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      size="sm"
      closeOnBackdrop={false}
      showCloseButton={false}
    >
      <div className="text-center py-6">
        <div className="w-20 h-20 bg-blue-100 rounded-full mx-auto flex items-center justify-center mb-4">
          <span className="text-4xl">&#x1F464;</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Turno de</h2>
        <p className="text-3xl font-bold text-blue-600 mb-6">
          {nextPlayer.name}
        </p>
        <p className="text-gray-500 mb-6">
          Pasa el dispositivo a {nextPlayer.name}
        </p>
        <Button onClick={onContinue} variant="primary" size="lg" className="px-12">
          Estoy listo
        </Button>
      </div>
    </Modal>
  );
};
