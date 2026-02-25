'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reglas del Juego" size="lg">
      <div className="space-y-4 text-gray-700">
        <section>
          <h3 className="font-bold text-lg text-gray-800 mb-2">Objetivo</h3>
          <p>
            Ser el jugador con menos puntos después de completar 4 rondas. En
            cada ronda debes formar combinaciones específicas y quedarte sin
            cartas.
          </p>
        </section>

        <section>
          <h3 className="font-bold text-lg text-gray-800 mb-2">
            Combinaciones
          </h3>
          <div className="bg-gray-50 rounded p-3 space-y-2">
            <div>
              <p className="font-semibold">Trío:</p>
              <p className="text-sm">
                Mínimo 3 cartas del mismo valor, sin importar el palo.
                <br />
                <span className="text-gray-500">Ejemplo: 7&#9824;, 7&#9829;, 7&#9830;</span>
              </p>
            </div>
            <div>
              <p className="font-semibold">Seguidilla:</p>
              <p className="text-sm">
                Mínimo 4 cartas consecutivas del mismo palo.
                <br />
                <span className="text-gray-500">
                  Ejemplo: 4&#9824;, 5&#9824;, 6&#9824;, 7&#9824;
                </span>
                <br />
                <span className="text-red-600 text-xs">
                  El As solo va al inicio (A-2-3-4), no al final (J-Q-K-A)
                </span>
              </p>
            </div>
          </div>
        </section>

        <section>
          <h3 className="font-bold text-lg text-gray-800 mb-2">
            Objetivos por Ronda
          </h3>
          <div className="space-y-1 text-sm">
            <p>
              <strong>Ronda 1:</strong> 1 trío y 1 seguidilla
            </p>
            <p>
              <strong>Ronda 2:</strong> 3 tríos
            </p>
            <p>
              <strong>Ronda 3:</strong> 2 seguidillas
            </p>
            <p>
              <strong>Ronda 4:</strong> 2 tríos y 1 seguidilla
            </p>
          </div>
        </section>

        <section>
          <h3 className="font-bold text-lg text-gray-800 mb-2">
            Cómo jugar tu turno
          </h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Toma 1 carta (del mazo o del descarte)</li>
            <li>
              Opcional: Si cumples el objetivo, puedes &ldquo;bajarte&rdquo;
              mostrando tus combinaciones
            </li>
            <li>
              Opcional: Si ya estás bajado, puedes agregar cartas a
              combinaciones propias o de otros
            </li>
            <li>Descarta 1 carta (obligatorio)</li>
          </ol>
        </section>

        <section>
          <h3 className="font-bold text-lg text-gray-800 mb-2">
            Puntuación
          </h3>
          <p className="text-sm mb-2">
            Al final de cada ronda, las cartas en mano suman puntos:
          </p>
          <div className="bg-gray-50 rounded p-3 text-sm space-y-1">
            <p>As = 1 punto</p>
            <p>Cartas 2-10 = valor facial</p>
            <p>J, Q, K = 10 puntos cada una</p>
          </div>
          <p className="text-sm mt-2 font-semibold">
            Menos puntos es mejor. Quedarse sin cartas = 0 puntos.
          </p>
        </section>

        <section>
          <h3 className="font-bold text-lg text-gray-800 mb-2">Ganar</h3>
          <p className="text-sm">
            Después de 4 rondas, el jugador con menos puntos acumulados gana.
          </p>
        </section>
      </div>
    </Modal>
  );
};
