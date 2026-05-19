import { useRef, useEffect } from 'react';
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

export function useTextBubbles(options: UseTextBubblesOptions): UseTextBubblesReturn {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<TextBubblesState | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) {
      console.log('[TB][HOOK] mount skipped: missing ref', { canvas: !!canvas, container: !!container });
      return;
    }

    if (stateRef.current) {
      console.log('[TB][HOOK] existing state found, destroying first');
      destroyTextBubbles(stateRef.current);
      stateRef.current = null;
    }

    console.log('[TB][HOOK] INIT for text=', options.text);
    const state = initTextBubbles(canvas, container, options);
    stateRef.current = state;
    startAnimation(state);

    const onMouseMove = (event: MouseEvent) => {
      if (stateRef.current) {
        const rect = canvas.getBoundingClientRect();
        handleMouseMove(stateRef.current, event.clientX - rect.left, event.clientY - rect.top);
      }
    };

    const onMouseLeave = () => {
      if (stateRef.current) {
        handleMouseLeave(stateRef.current);
        options.onMouseLeave?.();
      }
    };

    const onResize = () => {
      if (stateRef.current && containerRef.current) {
        handleResize(stateRef.current, containerRef.current);
      }
    };

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('resize', onResize);

    return () => {
      console.log('[TB][HOOK] CLEANUP for text=', options.text);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('resize', onResize);
      if (stateRef.current) {
        destroyTextBubbles(stateRef.current);
        stateRef.current = null;
      }
    };
  }, [options.text, options.radius, options.speed, options.color, options.spacing, options.maxWidth, options.fontSize, options.font, options.bubbleSpacing, options.bubbleSize, options.onMouseLeave]);

  return { canvasRef, containerRef };
}
