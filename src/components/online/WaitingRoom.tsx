'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { PublicGameState } from '@/server/types';

interface WaitingRoomProps {
  roomCode: string;
  gameState: PublicGameState;
  isHost: boolean;
  myPlayerId: string;
  onStartGame: () => void;
  onLeaveRoom: () => void;
}

export const WaitingRoom: React.FC<WaitingRoomProps> = ({
  roomCode,
  gameState,
  isHost,
  myPlayerId,
  onStartGame,
  onLeaveRoom,
}) => {
  const [copied, setCopied] = useState(false);
  const canStart = gameState.players.length >= 2;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-800 to-green-950 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Sala de Espera</h2>
          <div className="flex items-center justify-center gap-2">
            <span className="text-3xl font-mono font-bold tracking-widest text-blue-600">
              {roomCode}
            </span>
            <button
              onClick={handleCopy}
              className="text-sm text-blue-500 hover:text-blue-700 underline"
            >
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            Comparte este código con tus amigos
          </p>
        </div>

        {/* Player list */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-800 mb-3">
            Jugadores ({gameState.players.length}/4)
          </h3>
          <div className="space-y-2">
            {gameState.players.map((player, index) => (
              <div
                key={player.id}
                className={`bg-white rounded p-3 flex items-center justify-between ${
                  player.id === myPlayerId ? 'ring-2 ring-blue-300' : ''
                }`}
              >
                <span className="font-medium">
                  {player.name}
                  {player.id === myPlayerId && (
                    <span className="text-xs text-gray-400 ml-1">(tú)</span>
                  )}
                </span>
                {index === 0 && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    Host
                  </span>
                )}
              </div>
            ))}
            {Array.from({ length: 4 - gameState.players.length }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="bg-gray-100 rounded p-3 text-gray-400 text-center"
              >
                Esperando jugador...
              </div>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div className="space-y-2">
          {isHost ? (
            <Button
              onClick={onStartGame}
              disabled={!canStart}
              variant="primary"
              size="lg"
              className="w-full"
            >
              {canStart ? 'Iniciar Juego' : 'Esperando jugadores (mín. 2)'}
            </Button>
          ) : (
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <p className="text-blue-800">
                Esperando a que el host inicie el juego...
              </p>
            </div>
          )}

          <Button
            onClick={onLeaveRoom}
            variant="secondary"
            size="lg"
            className="w-full"
          >
            Salir de la Sala
          </Button>
        </div>
      </div>
    </div>
  );
};
