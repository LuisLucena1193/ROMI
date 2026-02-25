'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
interface GameEndPlayer {
  id: string;
  name: string;
  totalScore: number;
}

interface GameEndModalProps {
  isOpen: boolean;
  players: GameEndPlayer[];
  winner: GameEndPlayer;
  onPlayAgain: () => void;
  onExit: () => void;
}

const MEDALS = ['\u{1F947}', '\u{1F948}', '\u{1F949}'];

export const GameEndModal: React.FC<GameEndModalProps> = ({
  isOpen,
  players,
  winner,
  onPlayAgain,
  onExit,
}) => {
  const ranked = [...players].sort((a, b) => a.totalScore - b.totalScore);

  return (
    <Modal isOpen={isOpen} size="md" closeOnBackdrop={false} showCloseButton={false}>
      <div className="text-center">
        <div className="text-6xl mb-4">&#x1F389;</div>
        <h2 className="text-3xl font-bold text-gray-800 mb-1">
          {winner.name} ganó el juego
        </h2>
        <p className="text-gray-600 mb-6">4 rondas completadas</p>

        {/* Podium */}
        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-gray-800 mb-4">
            Clasificación Final
          </h3>
          <div className="space-y-3">
            {ranked.map((player, i) => (
              <div
                key={player.id}
                className={`flex items-center justify-between p-4 rounded-lg ${
                  i === 0
                    ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 border-2 border-yellow-400'
                    : 'bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{MEDALS[i] ?? `${i + 1}º`}</span>
                  <div className="text-left">
                    <p className="font-bold text-gray-800">{player.name}</p>
                    <p className="text-sm text-gray-600">
                      {player.totalScore} puntos
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button onClick={onExit} variant="secondary" size="lg">
            Salir
          </Button>
          <Button onClick={onPlayAgain} variant="primary" size="lg">
            Jugar de Nuevo
          </Button>
        </div>
      </div>
    </Modal>
  );
};
