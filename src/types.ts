export interface TextBubblesConfig {
  text: string;
  radius?: number;
  speed?: number;
  color?: string;
  spacing?: number;
  maxWidth?: number;
  fontSize?: number;
  font?: string;
  bubbleSpacing?: number;
  bubbleSize?: number;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export interface TextBubblesState {
  bubbles: Bubble[];
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  config: Required<Omit<TextBubblesConfig, 'onMouseEnter' | 'onMouseLeave'>>;
  mouse: MousePosition;
  animationId: number | null;
  running: boolean;
}

export interface MousePosition {
  x: number | undefined;
  y: number | undefined;
}

export interface Bubble {
  x: number;
  y: number;
  radius: number;
  fillColor: string;
  dx: number;
  dy: number;
  target: { x: number; y: number };
}