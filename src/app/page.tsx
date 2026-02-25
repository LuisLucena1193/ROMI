'use client';

import { useOnlineGameState } from '@/hooks/useOnlineGameState';
import { OnlineLobby } from '@/components/online/OnlineLobby';
import { WaitingRoom } from '@/components/online/WaitingRoom';
import { GameTable } from '@/components/game/GameTable';

export default function Home() {
  const {
    connected,
    gameState,
    myHand,
    myPlayerId,
    roomCode,
    hasDrawnThisTurn,
    isMyTurn,
    isHost,
    serverError,
    createRoom,
    joinRoom,
    startGame,
    drawFromDeck,
    drawFromDiscard,
    discardCard,
    meldCombinations,
    addToCombination,
    substituteJoker,
    claimDiscard,
    nextRound,
    leaveRoom,
  } = useOnlineGameState();

  // Connecting
  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-800 to-green-950 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-xl font-semibold text-gray-800">
            Conectando al servidor...
          </p>
        </div>
      </div>
    );
  }

  // No room: show lobby
  if (!roomCode || !gameState) {
    return (
      <OnlineLobby
        onCreateRoom={createRoom}
        onJoinRoom={joinRoom}
      />
    );
  }

  // In room but game not started: waiting room
  if (gameState.phase === 'setup') {
    return (
      <WaitingRoom
        roomCode={roomCode}
        gameState={gameState}
        isHost={isHost}
        myPlayerId={myPlayerId!}
        onStartGame={startGame}
        onLeaveRoom={leaveRoom}
      />
    );
  }

  // Game in progress
  return (
    <>
      {serverError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
          {serverError}
        </div>
      )}
      <GameTable
        gameState={gameState}
        myHand={myHand}
        myPlayerId={myPlayerId!}
        hasDrawnThisTurn={hasDrawnThisTurn}
        isMyTurn={isMyTurn}
        isHost={isHost}
        onDrawFromDeck={drawFromDeck}
        onDrawFromDiscard={drawFromDiscard}
        onDiscardCard={discardCard}
        onMeld={meldCombinations}
        onAddToCombination={addToCombination}
        onSubstituteJoker={substituteJoker}
        onClaimDiscard={claimDiscard}
        onNextRound={nextRound}
        onReset={leaveRoom}
      />
    </>
  );
}
