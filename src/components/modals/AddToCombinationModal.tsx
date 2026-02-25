'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Card as CardComponent } from '@/components/ui/Card';
import { Card, Player } from '@/lib/types/game.types';
import { CombinationModel } from '@/lib/models/Combination';
import { CardModel } from '@/lib/models/Card';

interface AddToCombinationModalProps {
  isOpen: boolean;
  card: Card | null;
  meldedPlayers: Player[];
  currentPlayerId: string;
  onAdd: (targetPlayerId: string, combinationIndex: number, position?: 'start' | 'end') => void;
  onSubstituteJoker: (targetPlayerId: string, combinationIndex: number, card: Card, jokerId: string) => void;
  onCancel: () => void;
}

export const AddToCombinationModal: React.FC<AddToCombinationModalProps> = ({
  isOpen,
  card,
  meldedPlayers,
  currentPlayerId,
  onAdd,
  onSubstituteJoker,
  onCancel,
}) => {
  if (!card) return null;

  const hasAnyValid = meldedPlayers.some((p) =>
    p.meldedCombinations.some(
      (c) => CombinationModel.canAddCard(c, card) || CombinationModel.canSubstituteJoker(c, card),
    ),
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="Agregar a Combinación"
      size="md"
    >
      <div className="space-y-4">
        {/* Card to add */}
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">Carta a agregar:</p>
          <div className="flex justify-center">
            <CardComponent card={card} size="medium" />
          </div>
        </div>

        {!hasAnyValid && (
          <div className="bg-yellow-50 rounded-lg p-3 text-center">
            <p className="text-yellow-700 font-medium">
              Esta carta no es compatible con ninguna combinación
            </p>
          </div>
        )}

        {/* Combinations list */}
        <div className="space-y-4 max-h-80 overflow-y-auto">
          {meldedPlayers.map((player) => (
            <div key={player.id} className="border rounded-lg p-3">
              <p className="font-medium text-gray-700 mb-2">
                {player.id === currentPlayerId
                  ? 'Tus combinaciones'
                  : player.name}
              </p>

              <div className="space-y-2">
                {player.meldedCombinations.map((combo, idx) => {
                  const canAdd = CombinationModel.canAddCard(combo, card);
                  const matchingJokerId = CombinationModel.canSubstituteJoker(combo, card);
                  const canInteract = canAdd || !!matchingJokerId;

                  // Get the joker label for the substitution
                  let substituteLabel = '';
                  if (matchingJokerId) {
                    const jokerCard = combo.cards.find((c) => c.id === matchingJokerId);
                    if (jokerCard) {
                      substituteLabel = `Comodín ${matchingJokerId.replace('joker-', '#')} vuelve a tu mano`;
                    }
                  }

                  return (
                    <div
                      key={idx}
                      className={`p-2 rounded border-2 transition-all ${
                        canInteract
                          ? 'border-green-300 bg-green-50'
                          : 'border-gray-200 bg-gray-50 opacity-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">
                          {combo.type === 'trio' ? 'Trío' : 'Seguidilla'}
                        </span>
                        <div className="flex gap-1">
                          {canAdd && card && CardModel.isJoker(card) && combo.type === 'sequence' ? (
                            (() => {
                              const ext = CombinationModel.getJokerExtensionValues(combo);
                              return (
                                <>
                                  {ext.start && (
                                    <span
                                      className="text-blue-600 text-xs cursor-pointer hover:underline font-medium"
                                      onClick={() => onAdd(player.id, idx, 'start')}
                                      title="Agregar al inicio de la seguidilla"
                                    >
                                      ◀ {CardModel.getDisplayValue({ value: ext.start.value, suit: ext.start.suit, id: '' })}{CardModel.getSuitSymbol(ext.start.suit)}
                                    </span>
                                  )}
                                  {ext.end && (
                                    <span
                                      className="text-green-600 text-xs cursor-pointer hover:underline font-medium"
                                      onClick={() => onAdd(player.id, idx, 'end')}
                                      title="Agregar al final de la seguidilla"
                                    >
                                      {CardModel.getDisplayValue({ value: ext.end.value, suit: ext.end.suit, id: '' })}{CardModel.getSuitSymbol(ext.end.suit)} ▶
                                    </span>
                                  )}
                                </>
                              );
                            })()
                          ) : canAdd ? (
                            <span
                              className="text-green-600 text-xs cursor-pointer hover:underline"
                              onClick={() => onAdd(player.id, idx)}
                            >
                              Agregar
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        {combo.cards.map((c) => {
                          const mapping = combo.jokerMappings?.find((m) => m.jokerId === c.id);
                          return (
                            <div key={c.id} className="relative">
                              <CardComponent card={c} size="small" />
                              {mapping && (
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[8px] px-1 rounded whitespace-nowrap">
                                  ={CardModel.getDisplayValue({ value: mapping.replacesValue, suit: mapping.replacesSuit, id: '' })}{CardModel.getSuitSymbol(mapping.replacesSuit)}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {matchingJokerId && (
                        <button
                          className="mt-2 w-full text-sm bg-purple-600 text-white rounded px-3 py-1.5 hover:bg-purple-700 transition-colors"
                          onClick={() => onSubstituteJoker(player.id, idx, card, matchingJokerId)}
                        >
                          Sustituir Comodín
                          <span className="block text-[10px] text-purple-200">
                            {substituteLabel}
                          </span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t">
          <Button
            onClick={onCancel}
            variant="secondary"
            size="lg"
            className="w-full"
          >
            Cancelar
          </Button>
        </div>
      </div>
    </Modal>
  );
};
