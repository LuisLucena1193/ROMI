'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Card as CardComponent } from '@/components/ui/Card';
import { Card, Combination } from '@/lib/types/game.types';
import { CombinationModel } from '@/lib/models/Combination';
import { isValidForRound, getRoundObjective } from '@/lib/utils/validators';
import { CardModel } from '@/lib/models/Card';

interface MeldModalProps {
  isOpen: boolean;
  availableCards: Card[];
  currentRound: 1 | 2 | 3 | 4;
  onConfirm: (combinations: Combination[]) => void;
  onCancel: () => void;
}

export const MeldModal: React.FC<MeldModalProps> = ({
  isOpen,
  availableCards,
  currentRound,
  onConfirm,
  onCancel,
}) => {
  const [combinations, setCombinations] = useState<Combination[]>([]);
  const [unassignedCards, setUnassignedCards] = useState<Card[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCombinations([]);
      setUnassignedCards(
        [...availableCards].sort(CardModel.compare),
      );
      setActiveIndex(null);
    }
  }, [isOpen, availableCards]);

  const objective = getRoundObjective(currentRound);

  const createCombination = (type: 'trio' | 'sequence') => {
    const newIndex = combinations.length;
    setCombinations((prev) => [...prev, { type, cards: [] }]);
    setActiveIndex(newIndex);
  };

  const addCardToCombination = (card: Card) => {
    if (activeIndex === null) return;
    setCombinations((prev) =>
      prev.map((c, i) =>
        i === activeIndex ? { ...c, cards: [...c.cards, card] } : c,
      ),
    );
    setUnassignedCards((prev) => prev.filter((c) => c.id !== card.id));
  };

  const removeCardFromCombination = (comboIdx: number, card: Card) => {
    setCombinations((prev) =>
      prev.map((c, i) =>
        i === comboIdx
          ? { ...c, cards: c.cards.filter((x) => x.id !== card.id) }
          : c,
      ),
    );
    setUnassignedCards((prev) =>
      [...prev, card].sort(CardModel.compare),
    );
  };

  const deleteCombination = (index: number) => {
    const combo = combinations[index];
    setUnassignedCards((prev) =>
      [...prev, ...combo.cards].sort(CardModel.compare),
    );
    setCombinations((prev) => prev.filter((_, i) => i !== index));
    if (activeIndex === index) setActiveIndex(null);
    else if (activeIndex !== null && activeIndex > index)
      setActiveIndex(activeIndex - 1);
  };

  const isCombinationValid = (c: Combination) =>
    c.type === 'trio'
      ? CombinationModel.isValidTrio(c.cards)
      : CombinationModel.isValidSequence(c.cards);

  const meetsObjective = isValidForRound(currentRound, combinations);
  const allValid = combinations.every(isCombinationValid);
  const canConfirm = meetsObjective && allValid && combinations.length > 0;

  const handleConfirm = () => {
    const processed = combinations.map((combo) => {
      if (combo.type === 'sequence' && combo.cards.some((c) => CardModel.isJoker(c))) {
        const { cards: sorted, jokerMappings: jm } = CombinationModel.sortWithMappings(combo.cards);
        return { ...combo, cards: sorted, jokerMappings: jm.length > 0 ? jm : undefined };
      }
      return combo;
    });
    onConfirm(processed);
  };

  const getJokerLabel = (comboIdx: number, card: Card): string | null => {
    const combo = combinations[comboIdx];
    if (combo.type !== 'sequence' || !CardModel.isJoker(card)) return null;
    if (combo.cards.length < 2) return null;
    const hasNonJokers = combo.cards.some((c) => !CardModel.isJoker(c));
    if (!hasNonJokers) return null;
    const mappings = CombinationModel.resolveJokerMappings(combo.cards);
    const mapping = mappings.find((m) => m.jokerId === card.id);
    if (!mapping) return null;
    return `${CardModel.getDisplayValue({ value: mapping.replacesValue, suit: mapping.replacesSuit, id: '' })}${CardModel.getSuitSymbol(mapping.replacesSuit)}`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="Bajar Juego"
      size="lg"
      closeOnBackdrop={false}
    >
      <div className="space-y-4">
        {/* Objective */}
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-sm text-gray-600">
            Objetivo de la Ronda {currentRound}:
          </p>
          <p className="font-semibold text-blue-700">{objective}</p>
        </div>

        {/* Unassigned cards */}
        <div>
          <h3 className="font-semibold text-gray-800 mb-2">
            Tus cartas ({unassignedCards.length})
          </h3>
          <div className="bg-gray-50 rounded-lg p-3 min-h-[80px]">
            {unassignedCards.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {unassignedCards.map((card) => (
                  <div
                    key={card.id}
                    onClick={
                      activeIndex !== null
                        ? () => addCardToCombination(card)
                        : undefined
                    }
                    className={
                      activeIndex !== null
                        ? 'cursor-pointer'
                        : 'opacity-50'
                    }
                  >
                    <CardComponent card={card} size="small" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-4">
                Todas las cartas asignadas
              </p>
            )}
            {activeIndex !== null && unassignedCards.length > 0 && (
              <p className="text-xs text-blue-600 mt-2">
                Click en una carta para agregarla a la combinación activa
              </p>
            )}
          </div>
        </div>

        {/* Combinations */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-800">
              Combinaciones ({combinations.length})
            </h3>
            <div className="flex gap-2">
              <Button
                onClick={() => createCombination('trio')}
                variant="secondary"
                size="sm"
              >
                + Trío
              </Button>
              <Button
                onClick={() => createCombination('sequence')}
                variant="secondary"
                size="sm"
              >
                + Seguidilla
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {combinations.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-400">
                Crea combinaciones con los botones de arriba
              </div>
            ) : (
              combinations.map((combo, idx) => {
                const valid = isCombinationValid(combo);
                const isActive = activeIndex === idx;

                return (
                  <div
                    key={idx}
                    className={`border-2 rounded-lg p-3 transition-all ${
                      isActive
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-700">
                          {combo.type === 'trio' ? 'Trío' : 'Seguidilla'}{' '}
                          {idx + 1}
                        </span>
                        {combo.cards.length > 0 &&
                          (valid ? (
                            <span className="text-green-600 text-sm">
                              Válida
                            </span>
                          ) : (
                            <span className="text-red-600 text-sm">
                              Inválida
                            </span>
                          ))}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() =>
                            setActiveIndex(isActive ? null : idx)
                          }
                          variant={isActive ? 'primary' : 'secondary'}
                          size="sm"
                        >
                          {isActive ? 'Activa' : 'Activar'}
                        </Button>
                        <Button
                          onClick={() => deleteCombination(idx)}
                          variant="danger"
                          size="sm"
                        >
                          Eliminar
                        </Button>
                      </div>
                    </div>

                    {combo.cards.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {combo.cards.map((card) => {
                          const jokerLabel = getJokerLabel(idx, card);
                          return (
                            <div
                              key={card.id}
                              onClick={() =>
                                removeCardFromCombination(idx, card)
                              }
                              className="cursor-pointer hover:opacity-75 relative"
                            >
                              <CardComponent card={card} size="small" />
                              {jokerLabel && (
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[8px] px-1 rounded whitespace-nowrap">
                                  ={jokerLabel}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-400 text-sm text-center py-3">
                        Activa y agrega cartas desde arriba
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Validation */}
        {combinations.length > 0 && (
          <div
            className={`p-3 rounded-lg ${meetsObjective ? 'bg-green-50' : 'bg-yellow-50'}`}
          >
            <p
              className={`font-medium ${meetsObjective ? 'text-green-700' : 'text-yellow-700'}`}
            >
              {meetsObjective
                ? 'Cumples con el objetivo de la ronda'
                : 'No cumples con el objetivo aún'}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            onClick={onCancel}
            variant="secondary"
            size="lg"
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            variant="primary"
            size="lg"
            className="flex-1"
            disabled={!canConfirm}
          >
            Bajar Juego
          </Button>
        </div>
      </div>
    </Modal>
  );
};
