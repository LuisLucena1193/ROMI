'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface OnlineLobbyProps {
  onCreateRoom: (playerName: string) => void;
  onJoinRoom: (roomCode: string, playerName: string) => Promise<string | null>;
}

export const OnlineLobby: React.FC<OnlineLobbyProps> = ({
  onCreateRoom,
  onJoinRoom,
}) => {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);

  const handleCreateRoom = () => {
    if (playerName.trim().length < 2) {
      setError('El nombre debe tener al menos 2 caracteres');
      return;
    }
    onCreateRoom(playerName.trim());
  };

  const handleJoinRoom = async () => {
    if (playerName.trim().length < 2) {
      setError('El nombre debe tener al menos 2 caracteres');
      return;
    }
    if (roomCode.trim().length !== 6) {
      setError('El código de sala debe tener 6 caracteres');
      return;
    }
    setError('');
    setJoining(true);
    const joinError = await onJoinRoom(roomCode.trim().toUpperCase(), playerName.trim());
    setJoining(false);
    if (joinError) setError(joinError);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-800 to-green-950 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Romi</h1>
          <p className="text-gray-500">Multijugador Online</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        {mode === 'menu' && (
          <div className="space-y-4">
            <Button
              onClick={() => { setMode('create'); setError(''); }}
              variant="primary"
              size="lg"
              className="w-full"
            >
              Crear Sala
            </Button>
            <Button
              onClick={() => { setMode('join'); setError(''); }}
              variant="secondary"
              size="lg"
              className="w-full"
            >
              Unirse a Sala
            </Button>
          </div>
        )}

        {mode === 'create' && (
          <div className="space-y-4">
            <Input
              label="Tu nombre"
              value={playerName}
              onChange={(v) => { setPlayerName(v); setError(''); }}
              placeholder="Ingresa tu nombre"
              maxLength={20}
            />
            <div className="flex gap-2">
              <Button
                onClick={() => { setMode('menu'); setError(''); }}
                variant="secondary"
                className="flex-1"
              >
                Volver
              </Button>
              <Button
                onClick={handleCreateRoom}
                variant="primary"
                className="flex-1"
              >
                Crear
              </Button>
            </div>
          </div>
        )}

        {mode === 'join' && (
          <div className="space-y-4">
            <Input
              label="Tu nombre"
              value={playerName}
              onChange={(v) => { setPlayerName(v); setError(''); }}
              placeholder="Ingresa tu nombre"
              maxLength={20}
            />
            <Input
              label="Código de sala"
              value={roomCode}
              onChange={(v) => { setRoomCode(v.toUpperCase()); setError(''); }}
              placeholder="ABC123"
              maxLength={6}
            />
            <div className="flex gap-2">
              <Button
                onClick={() => { setMode('menu'); setError(''); }}
                variant="secondary"
                className="flex-1"
              >
                Volver
              </Button>
              <Button
                onClick={handleJoinRoom}
                variant="primary"
                className="flex-1"
                disabled={joining}
              >
                {joining ? 'Uniendo...' : 'Unirse'}
              </Button>
            </div>
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Objetivo:</h3>
          <p className="text-sm text-blue-800">
            Completa combinaciones de tríos y seguidillas a lo largo de 4 rondas.
            El jugador con menos puntos al final gana.
          </p>
        </div>
      </div>
    </div>
  );
};
