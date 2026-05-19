import { useRef, useEffect, useCallback } from 'react';
import type { TextBubblesConfig, TextBubblesState } from '../types';
import {
  initTextBubbles,
  startAnimation,
  handleMouseMove,
  handleMouseLeave,
  handleResize,
  destroyTextBubbles,
} from '../core/engine';

export interface UseTextBubblesOptions extends TextBubblesConfig {}

export interface UseTextBubblesReturn {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

function getRelativePosition(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

export function useTextBubbles(options: UseTextBubblesOptions): UseTextBubblesReturn {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<TextBubblesState | null>(null);

  const init = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    if (stateRef.current) {
      destroyTextBubbles(stateRef.current);
    }

    const state = initTextBubbles(canvas, container, options);
    stateRef.current = state;
    startAnimation(state);
  }, [options]);

  useEffect(() => {
    init();

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const onMove = (clientX: number, clientY: number) => {
      if (stateRef.current) {
        const pos = getRelativePosition(canvas, clientX, clientY);
        handleMouseMove(stateRef.current, pos.x, pos.y);
      }
    };

    const onMouseMove = (event: MouseEvent) => onMove(event.clientX, event.clientY);

    const onTouchMove = (event: TouchEvent) => {
      event.preventDefault();
      const touch = event.touches[0];
      if (touch) onMove(touch.clientX, touch.clientY);
    };

    const onMouseLeave = () => {
      if (stateRef.current) {
        handleMouseLeave(stateRef.current);
        options.onMouseLeave?.();
      }
    };

    const onTouchEnd = () => {
      if (stateRef.current) {
        handleMouseLeave(stateRef.current);
      }
    };

    const onResize = () => {
      if (stateRef.current && containerRef.current) {
        handleResize(stateRef.current, containerRef.current);
      }
    };

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseleave', onMouseLeave);
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);
    window.addEventListener('resize', onResize);

    return () => {
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseleave', onMouseLeave);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('resize', onResize);
      if (stateRef.current) {
        destroyTextBubbles(stateRef.current);
        stateRef.current = null;
      }
    };
  }, [init, options.onMouseLeave]);

  return { canvasRef, containerRef };
}