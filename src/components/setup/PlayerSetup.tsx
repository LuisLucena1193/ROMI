'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface PlayerSetupProps {
  onStartGame: (playerNames: string[]) => void;
}

export const PlayerSetup: React.FC<PlayerSetupProps> = ({ onStartGame }) => {
  const [playerCount, setPlayerCount] = useState<2 | 3 | 4>(2);
  const [playerNames, setPlayerNames] = useState<string[]>(['', '']);
  const [errors, setErrors] = useState<string[]>([]);

  const handlePlayerCountChange = (count: 2 | 3 | 4) => {
    setPlayerCount(count);
    setPlayerNames(Array.from({ length: count }, (_, i) => playerNames[i] || ''));
    setErrors([]);
  };

  const handleNameChange = (index: number, value: string) => {
    const newNames = [...playerNames];
    newNames[index] = value;
    setPlayerNames(newNames);

    if (errors[index]) {
      const newErrors = [...errors];
      newErrors[index] = '';
      setErrors(newErrors);
    }
  };

  const handleStartGame = () => {
    const newErrors: string[] = Array(playerCount).fill('');

    playerNames.forEach((name, index) => {
      if (!name.trim()) {
        newErrors[index] = 'Nombre requerido';
      } else if (name.trim().length < 2) {
        newErrors[index] = 'Mínimo 2 caracteres';
      }
    });

    // Check duplicates
    const trimmed = playerNames.map((n) => n.trim().toLowerCase());
    trimmed.forEach((name, index) => {
      if (newErrors[index]) return;
      if (trimmed.indexOf(name) !== index) {
        newErrors[index] = 'Nombre duplicado';
      }
    });

    setErrors(newErrors);

    if (newErrors.every((e) => !e)) {
      onStartGame(playerNames.map((n) => n.trim()));
    }
  };

  const trimmed = playerNames.map((n) => n.trim());
  const allFilled = trimmed.every((n) => n.length >= 2);
  const allUnique = new Set(trimmed.map((n) => n.toLowerCase())).size === trimmed.length;
  const isValid = allFilled && allUnique;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-800 to-green-950 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Romi</h1>
          <p className="text-gray-500">Juego de cartas tipo Rummy / Carioca</p>
        </div>

        {/* Player count selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Cantidad de jugadores
          </label>
          <div className="flex gap-3">
            {([2, 3, 4] as const).map((count) => (
              <button
                key={count}
                onClick={() => handlePlayerCountChange(count)}
                className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                  playerCount === count
                    ? 'bg-blue-600 text-white shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        {/* Name inputs */}
        <div className="space-y-4 mb-6">
          {playerNames.map((name, index) => (
            <Input
              key={index}
              label={`Jugador ${index + 1}`}
              value={name}
              onChange={(value) => handleNameChange(index, value)}
              placeholder={`Nombre del jugador ${index + 1}`}
              error={errors[index]}
              maxLength={20}
            />
          ))}
        </div>

        {/* Start button */}
        <Button
          onClick={handleStartGame}
          disabled={!isValid}
          variant="primary"
          size="lg"
          className="w-full"
        >
          Iniciar Juego
        </Button>

        {/* Quick rules */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Objetivo:</h3>
          <p className="text-sm text-blue-800">
            Completa combinaciones de tríos y seguidillas a lo largo de 4
            rondas. El jugador con menos puntos al final gana.
          </p>
        </div>
      </div>
    </div>
  );
};
