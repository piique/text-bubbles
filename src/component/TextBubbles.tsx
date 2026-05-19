import { useTextBubbles } from '../hook/useTextBubbles';
import type { TextBubblesConfig } from '../types';

export interface TextBubblesProps extends TextBubblesConfig {
  className?: string;
  style?: React.CSSProperties;
}

export function TextBubbles({
  text,
  radius,
  speed,
  color,
  spacing,
  maxWidth,
  fontSize,
  font,
  bubbleSpacing,
  bubbleSize,
  className,
  style,
  onMouseEnter,
  onMouseLeave,
}: TextBubblesProps) {
  const { canvasRef, containerRef } = useTextBubbles({
    text,
    radius,
    speed,
    color,
    spacing,
    maxWidth,
    fontSize,
    font,
    bubbleSpacing,
    bubbleSize,
    onMouseEnter,
    onMouseLeave,
  });

  return (
    <div
      ref={containerRef as React.RefObject<HTMLDivElement>}
      className={className}
      style={{ width: '100%', height: '100%', ...style }}
    >
      <canvas
        ref={canvasRef as React.RefObject<HTMLCanvasElement>}
        style={{ display: 'block' }}
      />
    </div>
  );
}