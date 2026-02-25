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
  selectedCount,
  onMeld,
  onAddToCombination,
  onDiscard,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Bajar juego */}
        <div>
          <Button
            onClick={onMeld}
            disabled={!hasDrawn || hasMelded}
            variant="primary"
            size="lg"
            className="w-full"
          >
            Bajar Juego
          </Button>
          <p className="text-xs text-gray-500 mt-1 text-center">
            {!hasDrawn
              ? 'Toma una carta primero'
              : hasMelded
                ? 'Ya estás bajado'
                : 'Organiza y baja tus combinaciones'}
          </p>
        </div>

        {/* Agregar a combinación */}
        <div>
          <Button
            onClick={onAddToCombination}
            disabled={!hasDrawn || !hasMelded || selectedCount !== 1}
            variant="secondary"
            size="lg"
            className="w-full"
          >
            Agregar a Combinación
          </Button>
          <p className="text-xs text-gray-500 mt-1 text-center">
            {!hasMelded
              ? 'Debes bajarte primero'
              : selectedCount !== 1
                ? 'Selecciona 1 carta'
                : 'Elige combinación destino'}
          </p>
        </div>

        {/* Descartar */}
        <div>
          <Button
            onClick={onDiscard}
            disabled={!hasDrawn || selectedCount !== 1}
            variant="danger"
            size="lg"
            className="w-full"
          >
            Descartar
          </Button>
          <p className="text-xs text-gray-500 mt-1 text-center">
            {!hasDrawn
              ? 'Toma una carta primero'
              : selectedCount !== 1
                ? 'Selecciona 1 carta'
                : 'Descarta la carta seleccionada'}
          </p>
        </div>
      </div>
    </div>
  );
};
