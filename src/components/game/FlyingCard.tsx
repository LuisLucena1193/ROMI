'use client';

import React, { useRef, useEffect } from 'react';
import { Card as CardComponent } from '@/components/ui/Card';
import { Card } from '@/lib/types/game.types';

interface FlyingCardProps {
  card: Card | null; // null = face-down (draw from deck)
  fromRect: DOMRect;
  toRect: DOMRect;
  duration?: number;
  onComplete: () => void;
}

export const FlyingCard: React.FC<FlyingCardProps> = ({
  card,
  fromRect,
  toRect,
  duration = 350,
  onComplete,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const animation = el.animate(
      [
        { transform: `translate(${fromRect.left}px, ${fromRect.top}px)` },
        { transform: `translate(${toRect.left}px, ${toRect.top}px)` },
      ],
      {
        duration,
        easing: 'cubic-bezier(0.2, 0, 0.2, 1)',
        fill: 'forwards',
      },
    );

    animation.finished.then(onComplete).catch(() => {
      // Animation cancelled — no-op
    });

    return () => animation.cancel();
  }, [fromRect, toRect, duration, onComplete]);

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999,
        willChange: 'transform',
        pointerEvents: 'none',
      }}
    >
      <CardComponent card={card} faceDown={!card} size="medium" />
    </div>
  );
};
