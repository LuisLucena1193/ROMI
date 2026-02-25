'use client';

import React from 'react';

interface PlayerInfoPlayer {
  id: string;
  name: string;
  handCount: number;
  hasMelded: boolean;
}

interface PlayerInfoProps {
  player: PlayerInfoPlayer;
  isCurrentTurn: boolean;
  isMe: boolean;
  turnOrder: number;
}

export const PlayerInfo: React.FC<PlayerInfoProps> = ({
  player,
  isCurrentTurn,
  isMe,
  turnOrder,
}) => {
  return (
    <div
      className={`rounded-lg p-3 transition-all ${
        isCurrentTurn
          ? 'bg-blue-100 border-2 border-blue-500 shadow-md'
          : 'bg-white border border-gray-200'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Turn order badge */}
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
          isCurrentTurn ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
        }`}>
          {turnOrder}
        </div>

        <div className="flex-1 min-w-0">
          <p
            className={`font-semibold flex items-center gap-2 ${
              isCurrentTurn ? 'text-blue-700' : 'text-gray-800'
            }`}
          >
            {isMe ? 'Yo' : player.name}
            {isCurrentTurn && (
              <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">
                Turno
              </span>
            )}
            {isMe && !isCurrentTurn && (
              <span className="text-xs bg-gray-400 text-white px-2 py-0.5 rounded-full">
                Yo
              </span>
            )}
          </p>
          <div className="flex gap-3 text-xs text-gray-600 mt-0.5">
            <span>{player.handCount} cartas</span>
            {player.hasMelded && (
              <span className="text-green-600 font-medium">Bajado</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
