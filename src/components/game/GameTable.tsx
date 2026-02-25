'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Card, Combination } from '@/lib/types/game.types';
import type { PublicGameState, PublicPlayer } from '@/server/types';
import { Card as CardComponent } from '@/components/ui/Card';
import { GameHeader } from './GameHeader';
import { DeckPile } from './DeckPile';
import { DiscardPile } from './DiscardPile';
import { PlayerInfo } from './PlayerInfo';
import { PlayerHand } from './PlayerHand';
import { MeldedCombinations } from './MeldedCombinations';
import { ActionButtons } from './ActionButtons';
import { FlyingCard } from './FlyingCard';
import { MeldModal } from '@/components/modals/MeldModal';
import { AddToCombinationModal } from '@/components/modals/AddToCombinationModal';
import { RoundEndModal } from '@/components/modals/RoundEndModal';
import { GameEndModal } from '@/components/modals/GameEndModal';
import { RulesModal } from '@/components/modals/RulesModal';
import { Button } from '@/components/ui/Button';
import { CombinationModel } from '@/lib/models/Combination';
import { CardModel } from '@/lib/models/Card';
import type { HandCardDragData, DropData } from './dragTypes';

interface FlyingCardState {
  card: Card | null;
  fromRect: DOMRect;
  toRect: DOMRect;
  onComplete: () => void;
}

interface GameTableProps {
  gameState: PublicGameState;
  myHand: Card[];
  myPlayerId: string;
  hasDrawnThisTurn: boolean;
  isMyTurn: boolean;
  isHost: boolean;
  onDrawFromDeck: () => void;
  onDrawFromDiscard: () => void;
  onDiscardCard: (card: Card) => void;
  onMeld: (combinations: Combination[]) => void;
  onAddToCombination: (
    targetPlayerId: string,
    combinationIndex: number,
    card: Card,
    position?: 'start' | 'end',
  ) => void;
  onSubstituteJoker: (
    targetPlayerId: string,
    combinationIndex: number,
    card: Card,
    jokerId: string,
  ) => void;
  onClaimDiscard: () => void;
  onNextRound: () => void;
  onReset: () => void;
}

export const GameTable: React.FC<GameTableProps> = ({
  gameState,
  myHand,
  myPlayerId,
  hasDrawnThisTurn,
  isMyTurn,
  isHost,
  onDrawFromDeck,
  onDrawFromDiscard,
  onDiscardCard,
  onMeld,
  onAddToCombination,
  onSubstituteJoker,
  onClaimDiscard,
  onNextRound,
  onReset,
}) => {
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [showMeldModal, setShowMeldModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRoundEnd, setShowRoundEnd] = useState(false);
  const [showGameEnd, setShowGameEnd] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [draggedCard, setDraggedCard] = useState<Card | null>(null);
  const [cardOrders, setCardOrders] = useState<Record<string, string[]>>({});
  const [flyingCard, setFlyingCard] = useState<FlyingCardState | null>(null);
  const [hiddenCardId, setHiddenCardId] = useState<string | null>(null);

  const prevPhase = useRef(gameState.phase);
  const deckCardRef = useRef<HTMLDivElement>(null);
  const discardCardRef = useRef<HTMLDivElement>(null);
  const drawSourceRef = useRef<'deck' | 'discard' | null>(null);
  const drawSourceRectRef = useRef<DOMRect | null>(null);
  const drawnDiscardCardRef = useRef<Card | null>(null);
  const getCardRectRef = useRef<((cardId: string) => DOMRect | null) | null>(null);

  // Prefer pointer-within (exact) for external droppables; fall back to rect intersection
  const collisionDetection: CollisionDetection = useCallback((args) => {
    const within = pointerWithin(args);
    return within.length > 0 ? within : rectIntersection(args);
  }, []);

  // dnd-kit sensors: distance constraint preserves click/tap, touch long-press for mobile
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const myPlayer = gameState.players.find((p) => p.id === myPlayerId)!

  const topDiscard =
    gameState.discardPile.length > 0
      ? gameState.discardPile[gameState.discardPile.length - 1]
      : null;

  // Build meldedPlayers using PublicPlayer data (for AddToCombinationModal)
  const meldedPlayers = gameState.players.filter((p) => p.hasMelded);

  // Detect round end / game end
  useEffect(() => {
    if (gameState.phase === 'roundEnd' && prevPhase.current === 'playing') {
      setShowRoundEnd(true);
      setSelectedCards([]);
    }
    if (gameState.phase === 'gameEnd' && prevPhase.current !== 'gameEnd') {
      setShowRoundEnd(false);
      setShowGameEnd(true);
    }
    // Close round end modal when new round starts (triggered by host)
    if (gameState.phase === 'playing' && prevPhase.current === 'roundEnd') {
      setShowRoundEnd(false);
    }
    prevPhase.current = gameState.phase;
  }, [gameState.phase]);

  // Clear selection on turn change
  useEffect(() => {
    if (!isMyTurn) {
      setSelectedCards([]);
    }
  }, [isMyTurn]);

  // Clean up animation state on phase change
  useEffect(() => {
    setFlyingCard(null);
    setHiddenCardId(null);
    drawSourceRef.current = null;
    drawSourceRectRef.current = null;
    drawnDiscardCardRef.current = null;
  }, [gameState.phase]);

  // --- handlers ---

  const handleCardClick = (card: Card) => {
    setSelectedCards((prev) =>
      prev.some((c) => c.id === card.id)
        ? prev.filter((c) => c.id !== card.id)
        : [...prev, card],
    );
  };

  const handleDrawFromDeckAnimated = useCallback(() => {
    drawSourceRef.current = 'deck';
    drawSourceRectRef.current = deckCardRef.current?.getBoundingClientRect() ?? null;
    drawnDiscardCardRef.current = null;
    onDrawFromDeck();
  }, [onDrawFromDeck]);

  const handleDrawFromDiscardAnimated = useCallback(() => {
    drawSourceRef.current = 'discard';
    drawSourceRectRef.current = discardCardRef.current?.getBoundingClientRect() ?? null;
    drawnDiscardCardRef.current = topDiscard;
    onDrawFromDiscard();
  }, [onDrawFromDiscard, topDiscard]);

  const handleNewCardRendered = useCallback((cardId: string) => {
    const sourceRect = drawSourceRectRef.current;
    if (!sourceRect) return;

    setHiddenCardId(cardId);

    requestAnimationFrame(() => {
      const targetRect = getCardRectRef.current?.(cardId);
      if (!targetRect) {
        // Card not measurable — skip animation
        setHiddenCardId(null);
        drawSourceRef.current = null;
        drawSourceRectRef.current = null;
        drawnDiscardCardRef.current = null;
        return;
      }

      const card = drawSourceRef.current === 'discard' ? drawnDiscardCardRef.current : null;

      setFlyingCard({
        card,
        fromRect: sourceRect,
        toRect: targetRect,
        onComplete: () => {
          setFlyingCard(null);
          setHiddenCardId(null);
          drawSourceRef.current = null;
          drawSourceRectRef.current = null;
          drawnDiscardCardRef.current = null;
        },
      });
    });
  }, []);

  const handleDiscard = () => {
    if (selectedCards.length !== 1) return;
    const card = selectedCards[0];
    const fromRect = getCardRectRef.current?.(card.id);
    const toRect = discardCardRef.current?.getBoundingClientRect();

    onDiscardCard(card);
    setSelectedCards([]);

    if (fromRect && toRect) {
      setFlyingCard({
        card,
        fromRect,
        toRect,
        onComplete: () => setFlyingCard(null),
      });
    }
  };

  const handleDropDiscard = (card: Card) => {
    onDiscardCard(card);
    setSelectedCards((prev) => prev.filter((c) => c.id !== card.id));
  };

  const handleDropOnCombination = (
    playerId: string,
    comboIndex: number,
    card: Card,
    position?: 'start' | 'end',
  ) => {
    onAddToCombination(playerId, comboIndex, card, position);
    setSelectedCards((prev) => prev.filter((c) => c.id !== card.id));
  };

  const handleDropSubstituteJoker = (
    playerId: string,
    comboIndex: number,
    card: Card,
    jokerId: string,
  ) => {
    onSubstituteJoker(playerId, comboIndex, card, jokerId);
    setSelectedCards((prev) => prev.filter((c) => c.id !== card.id));
  };

  const handleMeldConfirm = (combinations: Combination[]) => {
    onMeld(combinations);
    setShowMeldModal(false);
    setSelectedCards([]);
  };

  const handleAddConfirm = (
    targetPlayerId: string,
    combinationIndex: number,
    position?: 'start' | 'end',
  ) => {
    if (selectedCards.length !== 1) return;
    onAddToCombination(targetPlayerId, combinationIndex, selectedCards[0], position);
    setShowAddModal(false);
    setSelectedCards([]);
  };

  const handleSubstituteJoker = (
    targetPlayerId: string,
    combinationIndex: number,
    card: Card,
    jokerId: string,
  ) => {
    onSubstituteJoker(targetPlayerId, combinationIndex, card, jokerId);
    setShowAddModal(false);
    setSelectedCards([]);
  };

  const handleNextRound = () => {
    setShowRoundEnd(false);
    onNextRound();
  };

  const handleViewFinalResults = () => {
    setShowRoundEnd(false);
    setShowGameEnd(true);
  };

  // --- dnd-kit drag handlers ---

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as HandCardDragData | undefined;
    if (data?.type === 'hand-card') {
      setDraggedCard(data.card);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggedCard(null);

    const active = event.active.data.current as HandCardDragData | undefined;
    if (!active || active.type !== 'hand-card') return;

    const over = event.over;
    if (!over) return;

    const dropData = over.data.current as DropData | undefined;
    if (!dropData) return;

    const card = active.card;

    if (dropData.type === 'discard-pile') {
      handleDropDiscard(card);
      return;
    }

    if (dropData.type === 'combination') {
      const { playerId, comboIndex, comboType } = dropData;
      // Find combo to check joker substitution
      const playerData = gameState.players.find((p) => p.id === playerId);
      const combo = playerData?.meldedCombinations[comboIndex];
      if (!combo) return;

      const jokerId = CombinationModel.canSubstituteJoker(combo, card);
      if (jokerId) {
        handleDropSubstituteJoker(playerId, comboIndex, card, jokerId);
        return;
      }

      let position: 'start' | 'end' | undefined;
      if (CardModel.isJoker(card) && comboType === 'sequence') {
        // Compute position from active rect vs over rect
        const activeRect = event.active.rect.current.translated;
        const overRect = event.over?.rect;
        if (activeRect && overRect) {
          const pointerX = activeRect.left + activeRect.width / 2;
          position = pointerX < overRect.left + overRect.width / 2 ? 'start' : 'end';
        }
      }
      handleDropOnCombination(playerId, comboIndex, card, position);
    }
    // 'hand-sort' drops are handled by useDndMonitor inside PlayerHand
  };

  // Round winner = player with 0 cards
  const roundWinner =
    gameState.players.find((p) => p.handCount === 0) ?? currentPlayer;

  // Game winner = player with lowest total score
  const gameWinner = gameState.players.reduce((min, p) =>
    p.totalScore < min.totalScore ? p : min,
  );

  const canClaimDiscard =
    !isMyTurn &&
    gameState.phase === 'playing' &&
    gameState.players.length >= 3 &&
    !!gameState.pendingClaimCard;
  const alreadyClaimed = gameState.pendingClaimants.includes(myPlayerId);

  const canDropOnDiscard =
    isMyTurn && hasDrawnThisTurn && gameState.phase === 'playing';
  const canDropOnCombination =
    isMyTurn &&
    hasDrawnThisTurn &&
    myPlayer.hasMelded &&
    gameState.phase === 'playing';

  const actionsDisabled = !isMyTurn || gameState.phase !== 'playing';

  // Convert PublicPlayer[] to a format the modals/components expect
  const playersForModals = gameState.players.map((p) => ({
    id: p.id,
    name: p.name,
    hand: p.id === myPlayerId ? myHand : [],
    hasMelded: p.hasMelded,
    meldedCombinations: p.meldedCombinations,
    roundScore: p.roundScore,
    totalScore: p.totalScore,
  }));

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="min-h-screen bg-gradient-to-br from-green-800 to-green-950 p-3 md:p-4">
          <div className="max-w-6xl mx-auto space-y-3 md:space-y-4">
            {/* Rules button + error banner */}
            <div className="flex justify-between items-center">
              {/* Turn indicator */}
              <div className={`text-sm font-semibold px-3 py-1 rounded-full ${
                isMyTurn
                  ? 'bg-yellow-400 text-yellow-900'
                  : 'bg-white/20 text-white'
              }`}>
                {isMyTurn ? 'Tu turno' : `Turno de ${currentPlayer.name}`}
              </div>
              <Button
                onClick={() => setShowRules(true)}
                variant="secondary"
                size="sm"
              >
                Reglas
              </Button>
            </div>

            {/* Header */}
            <GameHeader
              currentRound={gameState.currentRound}
              onReset={onReset}
            />

            {/* All players in turn order */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {gameState.players.map((player, index) => (
                <PlayerInfo
                  key={player.id}
                  player={player}
                  isCurrentTurn={player.id === currentPlayer.id}
                  isMe={player.id === myPlayerId}
                  turnOrder={index + 1}
                />
              ))}
            </div>

            {/* Table center */}
            <div className="bg-poker-green rounded-xl shadow-xl p-4 md:p-6 border-4 border-green-900">
              <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                {/* Left: Deck + Discard */}
                <div className="flex flex-col items-center gap-3 md:min-w-[11rem]">
                  <div className="flex items-start gap-6 md:gap-8">
                    <DeckPile
                      cardsRemaining={gameState.deckCount}
                      onDraw={handleDrawFromDeckAnimated}
                      disabled={!isMyTurn || hasDrawnThisTurn || gameState.phase !== 'playing'}
                      cardRef={deckCardRef}
                    />
                    <DiscardPile
                      topCard={topDiscard}
                      onDraw={handleDrawFromDiscardAnimated}
                      disabled={
                        !isMyTurn ||
                        hasDrawnThisTurn ||
                        !topDiscard ||
                        gameState.phase !== 'playing'
                      }
                      canAcceptDrop={canDropOnDiscard}
                      cardRef={discardCardRef}
                    />
                  </div>
                  <p className="text-xs text-green-200 text-center">
                    {!isMyTurn
                      ? `Esperando a ${currentPlayer.name}...`
                      : gameState.phase !== 'playing'
                        ? 'Ronda finalizada'
                        : !hasDrawnThisTurn
                          ? 'Toma una carta del mazo o del descarte'
                          : 'Arrastra al descarte o a una combinación'}
                  </p>

                  {canClaimDiscard && (
                    <button
                      onClick={onClaimDiscard}
                      disabled={alreadyClaimed}
                      className={`mt-1 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all shadow ${
                        alreadyClaimed
                          ? 'bg-green-700 text-green-300 cursor-default'
                          : 'bg-yellow-400 text-yellow-900 hover:bg-yellow-300 active:scale-95'
                      }`}
                    >
                      {alreadyClaimed ? '✓ Solicitada' : '¡La quiero!'}
                    </button>
                  )}
                </div>

                {/* Divider */}
                <div className="hidden md:block w-px bg-green-700/50 self-stretch" />
                <div className="md:hidden h-px bg-green-700/50" />

                {/* Right: Melded combinations */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-green-300/70 uppercase tracking-wider mb-2">
                    Combinaciones bajadas
                  </p>
                  <MeldedCombinations
                    players={playersForModals}
                    canAcceptDrop={canDropOnCombination}
                    draggedCard={draggedCard}
                  />
                </div>
              </div>
            </div>

            {/* My hand */}
            <PlayerHand
              cards={myHand}
              selectedCards={selectedCards}
              onCardClick={handleCardClick}
              disabled={actionsDisabled || !hasDrawnThisTurn}
              dragDisabled={gameState.phase !== 'playing'}
              savedOrder={cardOrders[myPlayerId]}
              onOrderChange={(ids) =>
                setCardOrders((prev) => ({ ...prev, [myPlayerId]: ids }))
              }
              hiddenCardId={hiddenCardId}
              getCardRectRef={getCardRectRef}
              onNewCardRendered={handleNewCardRendered}
            />

            {/* Action buttons */}
            <ActionButtons
              hasDrawn={isMyTurn && hasDrawnThisTurn}
              hasMelded={myPlayer.hasMelded}
              selectedCount={selectedCards.length}
              onMeld={() => setShowMeldModal(true)}
              onAddToCombination={() => setShowAddModal(true)}
              onDiscard={handleDiscard}
            />
          </div>
        </div>

        {/* Drag overlay — renders the floating card visual during drag */}
        <DragOverlay dropAnimation={null}>
          {draggedCard ? (
            <CardComponent card={draggedCard} size="medium" />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* --- Flying card animation overlay (outside DndContext) --- */}
      {flyingCard && (
        <FlyingCard
          card={flyingCard.card}
          fromRect={flyingCard.fromRect}
          toRect={flyingCard.toRect}
          onComplete={flyingCard.onComplete}
        />
      )}

      {/* --- Modals --- */}

      <MeldModal
        isOpen={showMeldModal}
        availableCards={myHand}
        currentRound={gameState.currentRound}
        onConfirm={handleMeldConfirm}
        onCancel={() => setShowMeldModal(false)}
      />

      <AddToCombinationModal
        isOpen={showAddModal}
        card={selectedCards.length === 1 ? selectedCards[0] : null}
        meldedPlayers={playersForModals.filter((p) => p.hasMelded)}
        currentPlayerId={myPlayerId}
        onAdd={handleAddConfirm}
        onSubstituteJoker={handleSubstituteJoker}
        onCancel={() => setShowAddModal(false)}
      />

      <RoundEndModal
        isOpen={showRoundEnd}
        roundWinner={roundWinner}
        players={playersForModals}
        currentRound={gameState.currentRound}
        onNextRound={isHost ? handleNextRound : () => {}}
        onViewFinalResults={handleViewFinalResults}
        isHost={isHost}
      />

      <GameEndModal
        isOpen={showGameEnd}
        players={playersForModals}
        winner={gameWinner}
        onPlayAgain={onReset}
        onExit={onReset}
      />

      <RulesModal
        isOpen={showRules}
        onClose={() => setShowRules(false)}
      />
    </>
  );
};
