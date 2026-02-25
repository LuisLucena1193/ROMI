'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
interface RoundEndPlayer {
  id: string;
  name: string;
  roundScore: number;
  totalScore: number;
}

interface RoundEndModalProps {
  isOpen: boolean;
  roundWinner: RoundEndPlayer;
  players: RoundEndPlayer[];
  currentRound: number;
  onNextRound: () => void;
  onViewFinalResults: () => void;
  isHost?: boolean;
}

export const RoundEndModal: React.FC<RoundEndModalProps> = ({
  isOpen,
  roundWinner,
  players,
  currentRound,
  onNextRound,
  onViewFinalResults,
  isHost = true,
}) => {
  const isLastRound = currentRound === 4;
  const sorted = [...players].sort((a, b) => a.roundScore - b.roundScore);

  return (
    <Modal isOpen={isOpen} size="md" closeOnBackdrop={false} showCloseButton={false}>
      <div className="text-center">
        <div className="text-5xl mb-3">&#x1F3C6;</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-1">
          {roundWinner.name} ganó la ronda
        </h2>
        <p className="text-gray-600 mb-6">Fin de la Ronda {currentRound}</p>

        {/* Score table */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
          <table className="w-full">
            <thead>
              <tr className="text-sm text-gray-500 border-b">
                <th className="text-left py-2">Jugador</th>
                <th className="text-right py-2">Ronda</th>
                <th className="text-right py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((player) => (
                <tr
                  key={player.id}
                  className={`border-b last:border-0 ${
                    player.id === roundWinner.id ? 'bg-green-50' : ''
                  }`}
                >
                  <td className="py-3 font-medium">
                    {player.name}
                    {player.id === roundWinner.id && (
                      <span className="ml-1">&#x1F451;</span>
                    )}
                  </td>
                  <td className="py-3 text-right">{player.roundScore} pts</td>
                  <td className="py-3 text-right font-bold">
                    {player.totalScore} pts
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isLastRound ? (
          <Button
            onClick={onViewFinalResults}
            variant="primary"
            size="lg"
            className="w-full"
          >
            Ver Resultados Finales
          </Button>
        ) : isHost ? (
          <Button
            onClick={onNextRound}
            variant="primary"
            size="lg"
            className="w-full"
          >
            Siguiente Ronda ({currentRound + 1}/4)
          </Button>
        ) : (
          <p className="text-gray-500 text-sm">
            Esperando a que el host inicie la siguiente ronda...
          </p>
        )}
      </div>
    </Modal>
  );
};
